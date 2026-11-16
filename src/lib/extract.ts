import mammoth from 'mammoth';

export type DocumentKind = 'pdf' | 'docx' | 'txt';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const MIN_TEXT_CHARS = 200;

export const MIME_BY_KIND: Record<DocumentKind, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

export function detectKind(file: File): DocumentKind | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || file.type === MIME_BY_KIND.pdf) return 'pdf';
  if (ext === 'docx' || file.type === MIME_BY_KIND.docx) return 'docx';
  if (ext === 'txt' || ext === 'md' || file.type === 'text/plain') return 'txt';
  return null;
}

/** Validates magic bytes so a renamed binary can't masquerade as a document. */
export function matchesSignature(buf: Buffer, kind: DocumentKind) {
  if (kind === 'pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-';
  if (kind === 'docx') return buf[0] === 0x50 && buf[1] === 0x4b; // "PK" zip container
  // txt: reject if it contains NUL bytes in the first 8KB (binary)
  return !buf.subarray(0, 8192).includes(0);
}

export async function extractText(buf: Buffer, kind: DocumentKind): Promise<string> {
  switch (kind) {
    case 'txt':
      return buf.toString('utf8').replace(/^\uFEFF/, '');
    case 'docx': {
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return value;
    }
    case 'pdf': {
      const { extractText: extractPdf, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractPdf(pdf, { mergePages: true });
      return Array.isArray(text) ? text.join('\n\n') : text;
    }
  }
}

export function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeFileName(name: string) {
  return name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 180) || 'document';
}
