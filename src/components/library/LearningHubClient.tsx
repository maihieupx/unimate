'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  Loader2,
  Play,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Difficulty, DocumentStatus, QuestionType } from '@prisma/client';
import { cn } from '@/lib/utils';

export interface DocumentItem {
  id: string;
  fileName: string;
  title: string | null;
  summary: string | null;
  keyPoints: string[];
  topics: string[];
  status: DocumentStatus;
  sizeBytes: number;
  estimatedStudyMinutes: number | null;
  createdAt: string;
}

export interface QuizSummaryItem {
  id: string;
  title: string;
  difficulty: Difficulty;
  questionCount: number;
  documentTitle: string | null;
  createdAt: string;
}

interface LearningHubClientProps {
  initialDocuments: DocumentItem[];
  initialQuizzes: QuizSummaryItem[];
}

const QUESTION_TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'];
const DIFFICULTIES: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export function LearningHubClient({ initialDocuments, initialQuizzes }: LearningHubClientProps) {
  const t = useTranslations('library');
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [quizzes, setQuizzes] = useState<QuizSummaryItem[]>(initialQuizzes);
  const [selectedId, setSelectedId] = useState<string | null>(initialDocuments[0]?.id ?? null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [types, setTypes] = useState<QuestionType[]>(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? documents[0] ?? null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/documents', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { document?: DocumentItem; message?: string; error?: string };
      if (!res.ok || !data.document) {
        throw new Error(data.message ?? data.error ?? t('uploadError'));
      }
      setDocuments((prev) => [data.document!, ...prev]);
      setSelectedId(data.document.id);
      setFile(null);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const toggleType = (qt: QuestionType) => {
    setTypes((prev) => (prev.includes(qt) ? (prev.length > 1 ? prev.filter((x) => x !== qt) : prev) : [...prev, qt]));
  };

  const handleGenerateQuiz = async () => {
    if (!selectedDoc || selectedDoc.status !== 'READY') return;
    setGeneratingQuiz(true);
    setQuizError(null);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          numQuestions,
          difficulty,
          types,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        quiz?: { id: string; title: string; difficulty: Difficulty; _count: { questions: number } };
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.quiz) {
        throw new Error(data.message ?? data.error ?? 'Failed');
      }
      const created: QuizSummaryItem = {
        id: data.quiz.id,
        title: data.quiz.title,
        difficulty: data.quiz.difficulty,
        questionCount: data.quiz._count.questions,
        documentTitle: selectedDoc.title ?? selectedDoc.fileName,
        createdAt: new Date().toISOString(),
      };
      setQuizzes((prev) => [created, ...prev]);
      router.push(`/quizzes/${created.id}`);
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Error');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm font-semibold text-ink-soft">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column: Upload & Document List */}
        <div className="space-y-6 lg:col-span-4">
          <form onSubmit={handleUpload} className="card">
            <h2 className="card-title flex items-center gap-2">
              <FileUp className="h-5 w-5 text-lavender-600" aria-hidden />
              {t('uploadTitle')}
            </h2>
            <p className="mt-1 text-xs font-semibold text-ink-soft">{t('uploadHint')}</p>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-lavender-200 bg-lavender-50/60 px-4 py-6 text-center transition hover:border-lavender-400 hover:bg-lavender-50">
              <FileText className="h-8 w-8 text-lavender-500" aria-hidden />
              <span className="mt-2 text-xs font-extrabold text-ink">
                {file ? file.name : t('dropzone')}
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>

            {uploadError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{uploadError}</p>}

            <button
              type="submit"
              disabled={!file || uploading}
              className="btn-primary mt-4 w-full"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              {uploading ? t('uploading') : t('uploadButton')}
            </button>
          </form>

          <section className="card">
            <h2 className="card-title">{t('myDocuments', { count: documents.length })}</h2>
            {documents.length === 0 ? (
              <p className="mt-3 text-xs font-semibold text-ink-soft">{t('emptyDocs')}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {documents.map((doc) => {
                  const active = selectedDoc?.id === doc.id;
                  return (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(doc.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-2xl p-3 text-left transition',
                          active ? 'bg-lavender-100 ring-2 ring-lavender-400' : 'bg-lavender-50/50 hover:bg-lavender-50',
                        )}
                      >
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-lavender-600" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink">{doc.title ?? doc.fileName}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-ink-soft">
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5',
                                doc.status === 'READY'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : doc.status === 'FAILED'
                                    ? 'bg-rose-100 text-rose-600'
                                    : 'bg-butter-200 text-ink',
                              )}
                            >
                              {t(`status${doc.status === 'READY' ? 'Ready' : doc.status === 'FAILED' ? 'Failed' : 'Processing'}`)}
                            </span>
                            {doc.estimatedStudyMinutes ? (
                              <span>{t('studyMinutes', { minutes: doc.estimatedStudyMinutes })}</span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: Selected Document Summary + Quiz Generator + Quizzes */}
        <div className="space-y-6 lg:col-span-8">
          {selectedDoc && (
            <section className="card space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-ink">{selectedDoc.title ?? selectedDoc.fileName}</h2>
                  <p className="text-xs font-semibold text-ink-soft">{selectedDoc.fileName}</p>
                </div>
                {selectedDoc.estimatedStudyMinutes && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-butter-100 px-3 py-1 text-xs font-extrabold text-ink">
                    <Clock className="h-3.5 w-3.5 text-peach-500" aria-hidden />
                    {t('studyMinutes', { minutes: selectedDoc.estimatedStudyMinutes })}
                  </span>
                )}
              </div>

              {selectedDoc.summary && (
                <div className="rounded-2xl bg-lavender-50/70 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-lavender-700">{t('summaryTitle')}</h3>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-ink">
                    {selectedDoc.summary}
                  </p>
                </div>
              )}

              {selectedDoc.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wide text-ink-soft">{t('keyPointsTitle')}</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {selectedDoc.keyPoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2 rounded-2xl bg-peach-100/50 p-3 text-xs font-bold text-ink">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-peach-500" aria-hidden />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDoc.topics.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wide text-ink-soft">{t('topicsTitle')}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedDoc.topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-flex items-center gap-1 rounded-full bg-lavender-100 px-3 py-1 text-xs font-extrabold text-lavender-700"
                      >
                        <Tag className="h-3 w-3" aria-hidden />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Quiz Generator */}
              {selectedDoc.status === 'READY' && (
                <div className="rounded-2xl border-2 border-lavender-100 bg-white p-4">
                  <h3 className="card-title flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-lavender-600" aria-hidden />
                    {t('quizGeneratorTitle')}
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-extrabold text-ink-soft">{t('numQuestions')}</label>
                      <input
                        type="range"
                        min={3}
                        max={25}
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className="mt-2 w-full accent-lavender-600"
                      />
                      <span className="text-xs font-black text-lavender-700">{numQuestions}</span>
                    </div>

                    <div>
                      <span className="block text-xs font-extrabold text-ink-soft">{t('difficulty')}</span>
                      <div className="mt-2 flex gap-2">
                        {DIFFICULTIES.map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setDifficulty(diff)}
                            className={cn(
                              'flex-1 rounded-full px-3 py-1.5 text-xs font-extrabold transition',
                              difficulty === diff
                                ? 'bg-lavender-600 text-white shadow-sm'
                                : 'bg-lavender-50 text-ink-soft hover:bg-lavender-100',
                            )}
                          >
                            {t(`diff${diff}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="block text-xs font-extrabold text-ink-soft">{t('questionTypes')}</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {QUESTION_TYPES.map((qt) => {
                        const selected = types.includes(qt);
                        return (
                          <button
                            key={qt}
                            type="button"
                            onClick={() => toggleType(qt)}
                            className={cn(
                              'rounded-full px-3.5 py-1.5 text-xs font-extrabold transition',
                              selected
                                ? 'bg-peach-400 text-white shadow-sm'
                                : 'bg-peach-100/60 text-ink-soft hover:bg-peach-100',
                            )}
                          >
                            {t(`type${qt}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {quizError && <p className="mt-3 text-xs font-bold text-rose-600">{quizError}</p>}

                  <button
                    type="button"
                    onClick={() => void handleGenerateQuiz()}
                    disabled={generatingQuiz}
                    className="btn-primary mt-5"
                  >
                    {generatingQuiz ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                    {generatingQuiz ? t('generatingQuiz') : t('generateQuiz')}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Generated Quizzes List */}
          <section className="card">
            <h2 className="card-title">{t('recentQuizzes')}</h2>
            {quizzes.length === 0 ? (
              <p className="mt-3 text-xs font-semibold text-ink-soft">{t('noQuizzes')}</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {quizzes.map((q) => (
                  <li key={q.id} className="flex flex-col justify-between rounded-2xl bg-lavender-50/60 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-lavender-700">
                          {t(`diff${q.difficulty}`)}
                        </span>
                        <span className="text-[11px] font-bold text-ink-soft">
                          {t('questionsCount', { count: q.questionCount })}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-ink">{q.title}</h3>
                      {q.documentTitle && <p className="mt-0.5 truncate text-xs font-semibold text-ink-soft">{q.documentTitle}</p>}
                    </div>

                    <Link href={`/quizzes/${q.id}`} className="btn-primary mt-4 w-full">
                      <Play className="h-4 w-4" aria-hidden />
                      {t('launchFocusQuiz')}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
