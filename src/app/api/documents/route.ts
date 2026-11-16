import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { HttpError, handleApiError } from '@/lib/http';
import { aiRateLimit } from '@/lib/rate-limit';
import { summarizeDocument, transcribePdf } from '@/lib/ai';
import {
  MAX_UPLOAD_BYTES,
  MIME_BY_KIND,
  MIN_TEXT_CHARS,
  detectKind,
  extractText,
  matchesSignature,
  normalizeText,
  sanitizeFileName,
} from '@/lib/extract';
import { getAppLocale } from '@/i18n/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // large documents may need map-reduce summarisation

const publicSelect = {
  id: true,
  fileName: true,
  title: true,
  summary: true,
  keyPoints: true,
  topics: true,
  status: true,
  sizeBytes: true,
  charCount: true,
  estimatedStudyMinutes: true,
  createdAt: true,
} as const;

/**
 * POST /api/documents  (multipart/form-data, field "file")
 * Upload a PDF / DOCX / TXT → extract text → Gemini summary → persist.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    aiRateLimit(user.id);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError(400, 'NO_FILE');
    if (file.size === 0) throw new HttpError(400, 'EMPTY_FILE');
    if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE');

    const kind = detectKind(file);
    if (!kind) throw new HttpError(415, 'UNSUPPORTED_TYPE');

    const buf = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(buf, kind)) throw new HttpError(415, 'UNSUPPORTED_TYPE');

    const locale = await getAppLocale();

    let text = normalizeText(await extractText(buf, kind).catch(() => ''));
    if (kind === 'pdf' && text.length < MIN_TEXT_CHARS) {
      // Image-only PDF: let Gemini read it natively.
      text = normalizeText(await transcribePdf(buf));
    }
    if (text.length < 50) throw new HttpError(422, 'EMPTY_DOCUMENT');

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        fileName: sanitizeFileName(file.name),
        mimeType: MIME_BY_KIND[kind],
        sizeBytes: file.size,
        charCount: text.length,
        content: text,
        status: 'PROCESSING',
      },
      select: { id: true },
    });

    try {
      const summary = await summarizeDocument(text, locale);
      const document = await prisma.document.update({
        where: { id: doc.id },
        data: {
          title: summary.title,
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          topics: summary.topics,
          language: summary.detectedLanguage,
          estimatedStudyMinutes: summary.estimatedStudyMinutes,
          status: 'READY',
        },
        select: publicSelect,
      });
      return NextResponse.json({ document }, { status: 201 });
    } catch (error) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error' },
      });
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/documents — list the current user's documents. */
export async function GET() {
  try {
    const user = await requireUser();
    const documents = await prisma.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: publicSelect,
      take: 100,
    });
    return NextResponse.json({ documents });
  } catch (error) {
    return handleApiError(error);
  }
}
