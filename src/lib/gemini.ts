import 'server-only';
import { GoogleGenAI, type Part, type Schema } from '@google/genai';
import type { z } from 'zod';
import { AIError } from './http';

/**
 * Model id is configurable so the platform can run on whichever Gemini model the key
 * has access to (e.g. the "Hydrogen" model id, gemini-2.5-pro, gemini-2.5-flash…).
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let client: GoogleGenAI | undefined;

export function gemini() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AIError('GEMINI_API_KEY is not configured', 503);
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = statusOf(error);
      if (status !== undefined && !RETRYABLE.has(status)) break;
      if (i < attempts - 1) await sleep(800 * 2 ** i + Math.random() * 300);
    }
  }
  const status = statusOf(lastError);
  if (status === 429) throw new AIError('Gemini quota exceeded, please retry shortly', 429);
  console.error('[gemini] request failed', lastError);
  throw new AIError('Gemini request failed', 502);
}

interface StructuredRequest<T> {
  system: string;
  parts: Part[];
  schema: Schema;
  validator: z.ZodType<T, z.ZodTypeDef, unknown>;
  temperature?: number;
  model?: string;
}

/**
 * Calls Gemini with a JSON response schema and validates the output with zod.
 * Gemini's structured output guarantees shape; zod guarantees semantics.
 */
export async function generateStructured<T>(req: StructuredRequest<T>): Promise<T> {
  const response = await withRetry(() =>
    gemini().models.generateContent({
      model: req.model ?? GEMINI_MODEL,
      contents: [{ role: 'user', parts: req.parts }],
      config: {
        systemInstruction: req.system,
        temperature: req.temperature ?? 0.4,
        responseMimeType: 'application/json',
        responseSchema: req.schema,
      },
    }),
  );

  const text = response.text;
  if (!text) throw new AIError('Gemini returned an empty response');

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AIError('Gemini returned malformed JSON');
  }

  const parsed = req.validator.safeParse(json);
  if (!parsed.success) {
    console.error('[gemini] schema validation failed', parsed.error.flatten());
    throw new AIError('Gemini response failed validation');
  }
  return parsed.data;
}

/** Plain-text generation (used for OCR-style transcription of scanned PDFs). */
export async function generateText(system: string, parts: Part[], temperature = 0.1) {
  const response = await withRetry(() =>
    gemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: { systemInstruction: system, temperature },
    }),
  );
  return response.text ?? '';
}
