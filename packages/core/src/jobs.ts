import { DomainError, assert } from './errors.ts';
import { splitJobPayout } from './fees.ts';

/** AXP job lifecycle (ERC-8183 pattern): open → budget_set → funded → submitted → completed | rejected; expired from any open phase. */
export const PHASES = ['open', 'budget_set', 'funded', 'submitted', 'completed', 'rejected', 'expired'] as const;
export type Phase = (typeof PHASES)[number];
export const TERMINAL: readonly Phase[] = ['completed', 'rejected', 'expired'];

export interface Job {
  id: string; client: string; provider: string; evaluator: string | null; offering: string;
  requirements: Record<string, string>; price: bigint; principal: bigint; phase: Phase;
  deliverable: string | null; createdAt: number; expiresAt: number; history: { phase: Phase; at: number; by: string }[];
}
export type JobAction =
  | { type: 'set_budget'; by: string; price: bigint }
  | { type: 'fund'; by: string }
  | { type: 'submit'; by: string; deliverable: string }
  | { type: 'complete'; by: string }
  | { type: 'reject'; by: string; reason?: string }
  | { type: 'expire'; by: string };

/** Funds that move as a result of a transition; the chain layer executes them. */
export type Effect =
  | { kind: 'escrow_in'; from: string; amount: bigint }
  | { kind: 'pay'; to: string; amount: bigint; label: 'provider' | 'evaluator' | 'protocol' | 'principal' }
  | { kind: 'refund'; to: string; amount: bigint };

const judge = (j: Job) => j.evaluator ?? j.client;

export function transition(j: Job, a: JobAction, now: number): { job: Job; effects: Effect[] } {
  if (TERMINAL.includes(j.phase)) throw new DomainError('JOB_CLOSED', `Job is already ${j.phase}.`, 409);
  const step = (phase: Phase, patch: Partial<Job> = {}): Job => ({ ...j, ...patch, phase, history: [...j.history, { phase, at: now, by: a.by }] });
  const escrowed = j.price + j.principal;
  switch (a.type) {
    case 'set_budget':
      assert(j.phase === 'open' || j.phase === 'budget_set', 'PHASE', 'The budget can only be set before funding.', 409);
      assert(a.by === j.provider, 'FORBIDDEN', 'Only the provider sets the budget.', 403);
      assert(a.price > 0n, 'AMOUNT', 'Price must be above 0.');
      return { job: step('budget_set', { price: a.price }), effects: [] };
    case 'fund':
      assert(j.phase === 'budget_set', 'PHASE', 'Fund after the provider sets the budget.', 409);
      assert(a.by === j.client, 'FORBIDDEN', 'Only the client funds the job.', 403);
      assert(now < j.expiresAt, 'EXPIRED', 'This job has expired.', 409);
      return { job: step('funded'), effects: [{ kind: 'escrow_in', from: j.client, amount: escrowed }] };
    case 'submit':
      assert(j.phase === 'funded', 'PHASE', 'Submit after the job is funded.', 409);
      assert(a.by === j.provider, 'FORBIDDEN', 'Only the provider submits work.', 403);
      assert(a.deliverable.trim().length > 0, 'DELIVERABLE', 'The deliverable is empty.');
      return { job: step('submitted', { deliverable: a.deliverable }), effects: [] };
    case 'complete': {
      assert(j.phase === 'submitted', 'PHASE', 'Only submitted work can be approved.', 409);
      assert(a.by === judge(j), 'FORBIDDEN', j.evaluator ? 'Only the evaluator decides this job.' : 'Only the client approves this job.', 403);
      const s = splitJobPayout(j.price, !!j.evaluator);
      const effects: Effect[] = [{ kind: 'pay', to: j.provider, amount: s.provider, label: 'provider' }, { kind: 'pay', to: 'protocol', amount: s.protocol, label: 'protocol' }];
      if (j.evaluator) effects.push({ kind: 'pay', to: j.evaluator, amount: s.evaluator, label: 'evaluator' });
      if (j.principal > 0n) effects.push({ kind: 'pay', to: j.provider, amount: j.principal, label: 'principal' });
      return { job: step('completed'), effects };
    }
    case 'reject': {
      const before = j.phase === 'open' || j.phase === 'budget_set';
      const allowed = (before && (a.by === j.provider || a.by === j.client)) || (j.phase === 'funded' && a.by === j.provider) || (j.phase === 'submitted' && a.by === judge(j));
      assert(allowed, 'FORBIDDEN', 'You cannot reject this job now.', 403);
      return { job: step('rejected'), effects: j.phase === 'submitted' || j.phase === 'funded' ? [{ kind: 'refund', to: j.client, amount: escrowed }] : [] };
    }
    case 'expire':
      assert(now >= j.expiresAt, 'NOT_EXPIRED', 'The job has not expired yet.', 409);
      return { job: step('expired'), effects: j.phase === 'funded' || j.phase === 'submitted' ? [{ kind: 'refund', to: j.client, amount: escrowed }] : [] };
  }
}

export function newJob(p: { id: string; client: string; provider: string; evaluator?: string | null; offering: string; requirements: Record<string, string>; principal?: bigint; slaMinutes: number; now: number }): Job {
  return { id: p.id, client: p.client, provider: p.provider, evaluator: p.evaluator ?? null, offering: p.offering, requirements: p.requirements, price: 0n, principal: p.principal ?? 0n,
    phase: 'open', deliverable: null, createdAt: p.now, expiresAt: p.now + Math.max(30, p.slaMinutes * 4) * 60_000, history: [{ phase: 'open', at: p.now, by: p.client }] };
}

/** Offering requirement check, used by PAX before it opens a job. */
export function missingRequirements(fields: [string, string][], given: Record<string, string>): [string, string][] {
  return fields.filter(([k]) => !String(given[k] ?? '').trim());
}
