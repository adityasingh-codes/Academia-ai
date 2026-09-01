"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { FileText, ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import type { DailySessionModalProps, DifficultySplit } from "../../types/session_intake";

const today = () => new Date().toLocaleDateString("en-CA");
const tiers: { key: keyof DifficultySplit; label: string }[] = [{ key: "easy", label: "Easy" }, { key: "easyMedium", label: "Easy–Medium" }, { key: "medium", label: "Medium" }, { key: "mediumHard", label: "Medium–Hard" }, { key: "hard", label: "Hard" }];
const initialSplit: DifficultySplit = { easy: 0, easyMedium: 0, medium: 0, mediumHard: 0, hard: 0 };

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { if (!file.type.startsWith("image/")) return; const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  return <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card p-2 text-xs">{url ? <img src={url} alt="Solution preview" className="size-8 shrink-0 rounded object-cover" /> : <FileText className="size-4 shrink-0 text-muted-foreground" />}<span className="truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={onRemove} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></div>;
}

export function DailySessionModal({ isOpen, onClose, availableTopics, onSubmitSession }: DailySessionModalProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sessionDate, setSessionDate] = useState(today);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [difficultySplit, setDifficultySplit] = useState<DifficultySplit>(initialSplit);
  const [files, setFiles] = useState<File[]>([]);
  const [solutionText, setSolutionText] = useState("");
  const [mode, setMode] = useState<"files" | "text">("files");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sum = useMemo(() => Object.values(difficultySplit).reduce((total, value) => total + value, 0), [difficultySplit]);
  const valid = totalQuestions > 0 && sum === totalQuestions && topicIds.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && !isSubmitting && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const addFiles = (incoming: FileList | File[]) => setFiles((current) => [...current, ...Array.from(incoming).filter((file) => /^(image\/(jpeg|png)|application\/pdf)$/.test(file.type))]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || isSubmitting) return;
    setIsSubmitting(true);
    try { await onSubmitSession({ sessionDate, topicIds, totalQuestions, difficultySplit, solutionImages: files, solutionText: solutionText.trim() || undefined }); onClose(); }
    finally { setIsSubmitting(false); }
  };

  return <div role="dialog" aria-modal="true" aria-labelledby="session-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4"><div><h2 id="session-modal-title" className="text-lg font-semibold text-foreground">Log Today&apos;s Practice Session</h2><p className="mt-0.5 text-sm text-muted-foreground">Record your work precisely for stronger diagnostics.</p></div><button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close modal" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"><X className="size-5" /></button></header>
      <div className="space-y-7 p-5">
        <section><h3 className="text-sm font-semibold text-foreground">1. Session scope</h3><div className="mt-3 grid gap-4 sm:grid-cols-[11rem_1fr]"><label className="grid gap-1.5 text-sm font-medium">Session date<input required type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label><fieldset><legend className="mb-1.5 text-sm font-medium">Topics covered <span className="text-destructive">*</span></legend><div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-md border border-input p-2">{availableTopics.map((topic) => { const selected = topicIds.includes(topic.id); return <button key={topic.id} type="button" aria-pressed={selected} onClick={() => setTopicIds((ids) => selected ? ids.filter((id) => id !== topic.id) : [...ids, topic.id])} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{topic.title}</button>; })}</div></fieldset></div></section>
        <section><h3 className="text-sm font-semibold text-foreground">2. Questions and difficulty</h3><div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end"><label className="grid w-full max-w-48 gap-1.5 text-sm font-medium">Total questions<input required min="1" type="number" inputMode="numeric" value={totalQuestions || ""} onChange={(event) => setTotalQuestions(Math.max(0, Number(event.target.value)))} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label><p className={`pb-2 text-sm font-medium ${sum === totalQuestions && totalQuestions > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>Sum of Tiers ({sum}) / Total Entered ({totalQuestions})</p></div><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5">{tiers.map(({ key, label }) => <label key={key} className="grid gap-1.5 text-xs font-medium text-muted-foreground">{label}<input min="0" type="number" inputMode="numeric" value={difficultySplit[key] || ""} onChange={(event) => setDifficultySplit((split) => ({ ...split, [key]: Math.max(0, Number(event.target.value)) }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>)}</div>{sum !== totalQuestions && <p role="alert" className="mt-3 text-sm text-destructive">Difficulty tiers must sum exactly to the total questions entered.</p>}</section>
        <section><h3 className="text-sm font-semibold text-foreground">3. Worked solution</h3><div className="mt-3 inline-flex rounded-md border border-border p-1"><button type="button" onClick={() => setMode("files")} aria-pressed={mode === "files"} className={`rounded px-3 py-1.5 text-sm ${mode === "files" ? "bg-muted font-medium" : "text-muted-foreground"}`}><ImagePlus className="mr-1.5 inline size-4" />Photos / Images</button><button type="button" onClick={() => setMode("text")} aria-pressed={mode === "text"} className={`rounded px-3 py-1.5 text-sm ${mode === "text" ? "bg-muted font-medium" : "text-muted-foreground"}`}><FileText className="mr-1.5 inline size-4" />Written Work</button></div>{mode === "files" ? <><input ref={fileRef} id={inputId} type="file" accept="image/jpeg,image/png,application/pdf" multiple className="sr-only" onChange={(event) => event.target.files && addFiles(event.target.files)} /><button type="button" onClick={() => fileRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }} className={`mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-5 py-7 text-sm transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}><Upload className="mb-2 size-5 text-muted-foreground" />Drop JPEG, PNG, or PDF solutions here, or browse</button><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{files.map((file, index) => <FilePreview key={`${file.name}-${index}`} file={file} onRemove={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))} />)}</div></> : <textarea value={solutionText} onChange={(event) => setSolutionText(event.target.value)} placeholder="Write or paste your step-by-step working…" className="mt-3 min-h-36 w-full rounded-lg border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" />}</section>
      </div>
      <footer className="sticky bottom-0 border-t border-border bg-background p-4"><button type="submit" disabled={!valid || isSubmitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Saving session…</> : "Save Session & Generate Assessment Variants →"}</button></footer>
    </form>
  </div>;
}
