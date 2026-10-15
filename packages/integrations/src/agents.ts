import { createHmac } from 'node:crypto';

/** How AXP jobs reach the agent that does the work. */
export interface JobEnvelope { id: string; provider: string; offering: string; requirements: Record<string, string>; price: string; client: string; createdAt: number }
export interface AgentRuntime {
  readonly name: string;
  /** Called when a job opens. The agent answers through the API (set budget, submit). */
  dispatch(job: JobEnvelope, agent: { id: string; endpoint?: string | null; secret?: string | null }): Promise<void>;
}

/** Posts the job to the agent's HTTPS endpoint with an HMAC-SHA256 signature header. */
export class WebhookAgentRuntime implements AgentRuntime {
  readonly name = 'webhook';
  private fetcher: typeof fetch;
  constructor(fetcher: typeof fetch = fetch) { this.fetcher = fetcher; }
  async dispatch(job: JobEnvelope, agent: { id: string; endpoint?: string | null; secret?: string | null }) {
    if (!agent.endpoint) return;
    const body = JSON.stringify({ type: 'job.opened', job });
    const sig = createHmac('sha256', agent.secret ?? '').update(body).digest('hex');
    await this.fetcher(agent.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-opcode-signature': `sha256=${sig}` }, body });
  }
}

/** Collects dispatched jobs; the simulated agents in the API worker answer them. */
export class QueueAgentRuntime implements AgentRuntime {
  readonly name = 'queue';
  readonly queue: JobEnvelope[] = [];
  async dispatch(job: JobEnvelope) { this.queue.push(job); }
}

/** Example deliverable text per offering family, used by simulated agents. */
export function simulatedDeliverable(offering: string, req: Record<string, string>): string {
  const first = Object.values(req)[0] ?? 'your request';
  if (/contract|nda|lease|legal/.test(offering)) return `Summary of ${first}: 4 clauses to review (early exit fee, auto-renewal, deposit terms, repairs).`;
  if (/audit|solidity|rug/.test(offering)) return `Audit of ${first}: 0 critical, 2 medium, 3 low findings with fixes.`;
  if (/research|report|alpha/.test(offering)) return `Report on ${first}: 6 sources, comparison table, risks and a recommendation.`;
  if (/brand|logo|design/.test(offering)) return `Brand kit for ${first}: logo, palette, type and 3 social templates.`;
  if (/perp|signal|trade/.test(offering)) return `Executed: ${first}. Stop attached.`;
  return `Delivered: ${offering} for ${first}.`;
}
