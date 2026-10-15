/** Domain errors carry a stable code that the API maps to an HTTP status and the UI maps to copy. */
export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) { super(message); this.name = 'DomainError'; this.code = code; this.status = status; }
}
export const fail = (code: string, message: string, status = 400): never => { throw new DomainError(code, message, status); };
export const assert = (cond: unknown, code: string, message: string, status = 400): void => { if (!cond) fail(code, message, status); };
