"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import type { AssessmentQuizProps, ConfidenceLevel, StudentAnswerPayload } from "../../types/assessment_quiz";

const confidenceOptions: { value: ConfidenceLevel; label: string; tone: string }[] = [
  { value: "GUESSING", label: "😐 Guessing", tone: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "SOMEWHAT_CONFIDENT", label: "🤔 Somewhat Confident", tone: "border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { value: "CONFIDENT", label: "🙂 Confident", tone: "border-primary bg-primary/10 text-primary" },
  { value: "VERY_CONFIDENT", label: "😎 Very Confident", tone: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
];

export function AssessmentQuiz({ questions, onCompleteQuiz }: AssessmentQuizProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerPayload>>({});
  const [startedAt, setStartedAt] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const question = questions[index];
  const current = question ? answers[question.id] : undefined;
  const completeCount = Object.keys(answers).length;
  const isFinal = index === questions.length - 1;
  const canProceed = Boolean(current?.studentAnswer.trim() && current.confidenceRating);
  const progress = questions.length ? (completeCount / questions.length) * 100 : 0;

  useEffect(() => { setStartedAt(Date.now()); }, [question?.id]);

  const updateAnswer = (studentAnswer: string, confidenceRating = current?.confidenceRating) => {
    if (!question) return;
    setAnswers((items) => ({ ...items, [question.id]: { questionId: question.id, studentAnswer, confidenceRating: confidenceRating as ConfidenceLevel, timeSpentSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)) } }));
  };
  const next = () => canProceed && (isFinal ? finish() : setIndex((value) => value + 1));
  const finish = async () => {
    if (!canProceed || isSubmitting) return;
    setIsSubmitting(true);
    try { await onCompleteQuiz(Object.values(answers)); } finally { setIsSubmitting(false); }
  };
  const optionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, optionIndex: number) => {
    if (!question?.options) return;
    if (["ArrowDown", "ArrowRight"].includes(event.key)) { event.preventDefault(); optionRefs.current[(optionIndex + 1) % question.options.length]?.focus(); }
    if (["ArrowUp", "ArrowLeft"].includes(event.key)) { event.preventDefault(); optionRefs.current[(optionIndex - 1 + question.options.length) % question.options.length]?.focus(); }
    if (event.key === "Enter") { event.preventDefault(); updateAnswer(question.options[optionIndex]); }
  };

  if (!question) return <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">No assessment questions available.</div>;

  return <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
    <header className="border-b border-border pb-5"><div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold text-foreground">Question {index + 1} of {questions.length}</p><div className="flex flex-wrap justify-end gap-2"><span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{question.difficultyTier.replaceAll("_", " ")}</span><span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">{question.techniqueUsed.replaceAll("_", " ")}</span></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} /></div></header>
    <main className="flex-1 py-8"><article className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7"><p className="whitespace-pre-wrap text-base leading-7 text-card-foreground sm:text-lg">{question.questionText}</p><div className="mt-8">{question.questionType === "MULTIPLE_CHOICE" ? <div role="radiogroup" aria-label="Answer options" className="grid gap-3">{question.options?.map((option, optionIndex) => { const selected = current?.studentAnswer === option; return <button key={option} ref={(element) => { optionRefs.current[optionIndex] = element; }} type="button" role="radio" aria-checked={selected} onClick={() => updateAnswer(option)} onKeyDown={(event) => optionKeyDown(event, optionIndex)} className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted"}`}><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>{selected && <CheckCircle2 className="size-3.5" />}</span>{option}</button>; })}</div> : question.questionType === "NUMERICAL_INPUT" ? <label className="grid max-w-sm gap-2 text-sm font-medium">Your numerical answer<input type="number" inputMode="decimal" value={current?.studentAnswer ?? ""} onChange={(event) => updateAnswer(event.target.value)} onKeyDown={(event) => event.key === "Enter" && next()} placeholder="Enter value" className="h-12 rounded-md border border-input bg-background px-3 text-base outline-none focus:ring-2 focus:ring-ring" /></label> : <label className="grid gap-2 text-sm font-medium">Your working<textarea value={current?.studentAnswer ?? ""} onChange={(event) => updateAnswer(event.target.value)} placeholder="Show your reasoning step by step…" className="min-h-40 rounded-md border border-input bg-background p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-ring" /></label>}</div></article>
      <fieldset className="mt-6 rounded-xl border border-border p-4"><legend className="px-1 text-sm font-semibold">Confidence required before continuing</legend><p className="mb-3 text-sm text-muted-foreground">Select how certain you are about this answer.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{confidenceOptions.map((option) => { const selected = current?.confidenceRating === option.value; return <button key={option.value} type="button" aria-pressed={selected} onClick={() => updateAnswer(current?.studentAnswer ?? "", option.value)} className={`rounded-md border px-3 py-2 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? option.tone : "border-border text-muted-foreground hover:bg-muted"}`}>{option.label}</button>; })}</div>{current?.confidenceRating && <p className="mt-3 text-sm font-medium text-foreground">Selected: {current.confidenceRating.replaceAll("_", " ")}</p>}</fieldset></main>
    <footer className="flex items-center justify-between gap-3 border-t border-border pt-5"><button type="button" disabled={index === 0 || isSubmitting} onClick={() => setIndex((value) => value - 1)} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="size-4" />Previous</button><div className="flex gap-2"><button type="button" disabled={isSubmitting || isFinal} onClick={() => setIndex((value) => value + 1)} className="h-10 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-40">Skip</button><button type="button" disabled={!canProceed || isSubmitting} onClick={next} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Submitting…</> : isFinal ? "Submit Assessment & Calculate Diagnostics →" : <>Next <ArrowRight className="size-4" /></>}</button></div></footer>
  </section>;
}
