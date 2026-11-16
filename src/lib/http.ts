import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Raised by the AI layer (Gemini) — surfaced to clients as a 502/503/429. */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', issues: error.flatten() }, { status: 400 });
  }
  if (error instanceof AIError) {
    return NextResponse.json({ error: 'AI_ERROR', message: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }
  console.error('[api] unhandled error', error);
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
}
