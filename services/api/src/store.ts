import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { emptyState, type State } from './types.ts';

/**
 * State store. Today: in memory with optional JSON snapshots (bigints are tagged so they survive).
 * The interface is small on purpose so a Postgres implementation can replace it.
 */
export interface Store { state: State; nextId(prefix?: string): string; save(): void }

const replacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? { $big: v.toString() } : v);
const reviver = (_k: string, v: any) => (v && typeof v === 'object' && typeof v.$big === 'string' && Object.keys(v).length === 1 ? BigInt(v.$big) : v);
export const serialize = (s: State) => JSON.stringify(s, replacer);
export const deserialize = (txt: string): State => ({ ...emptyState(), ...JSON.parse(txt, reviver) });

export class MemoryStore implements Store {
  state: State;
  private file: string | null;
  constructor(opts: { file?: string | null; state?: State } = {}) {
    this.file = opts.file ?? null;
    this.state = opts.state ?? (this.file && existsSync(this.file) ? deserialize(readFileSync(this.file, 'utf8')) : emptyState());
  }
  nextId(prefix = '') { return prefix + String(++this.state.seq); }
  save() { if (!this.file) return; const tmp = this.file + '.tmp'; writeFileSync(tmp, serialize(this.state)); renameSync(tmp, this.file); }
}
