import { NextResponse } from 'next/server';
import { domainErrorStatus, isDomainError } from '@/lib/domain/errors';

/** Convert known domain failures into stable API responses without leaking internals. */
export function routeErrorResponse(error: unknown, fallback: string): NextResponse {
  if (isDomainError(error)) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: domainErrorStatus(error) }
    );
  }

  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message || fallback }, { status: 500 });
}
