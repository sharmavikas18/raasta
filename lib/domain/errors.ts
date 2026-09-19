/**
 * Errors the domain layer can safely expose to an HTTP boundary.
 *
 * Keeping these separate from route handlers makes the rules usable from any
 * future transport (server actions, a worker, or a CLI) without coupling the
 * engine to Next.js.
 */
export type DomainErrorCode =
  | 'FORBIDDEN_OWNERSHIP_MISMATCH'
  | 'JOURNEY_NOT_FOUND'
  | 'NODE_NOT_FOUND'
  | 'NODE_NOT_IN_JOURNEY'
  | 'INVALID_NODE_STATUS'
  | 'INVALID_CHANGE_TYPE'
  | 'INVALID_GRAPH'
  | 'DUPLICATE_ID'
  | 'DEPENDENCY_CYCLE'
  | 'NODE_DEPENDENCY_UNMET'
  | 'INVALID_UPDATE';

export class DomainError extends Error {
  public readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function domainErrorStatus(error: DomainError): number {
  switch (error.code) {
    case 'FORBIDDEN_OWNERSHIP_MISMATCH':
      return 403;
    case 'JOURNEY_NOT_FOUND':
    case 'NODE_NOT_FOUND':
      return 404;
    case 'NODE_DEPENDENCY_UNMET':
    case 'NODE_NOT_IN_JOURNEY':
    case 'INVALID_NODE_STATUS':
    case 'INVALID_CHANGE_TYPE':
    case 'INVALID_GRAPH':
    case 'DUPLICATE_ID':
    case 'DEPENDENCY_CYCLE':
    case 'INVALID_UPDATE':
      return 400;
  }
}
