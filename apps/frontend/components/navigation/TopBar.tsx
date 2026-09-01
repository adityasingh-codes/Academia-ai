"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, Flame, LogOut, Plus, Target, User } from "lucide-react";
import type { TopBarProps } from "../../types/navigation";

export function TopBar({ subjects, activeSubjectId, onSelectSubject, onAddNewSubject, streakDays, userEmail }: TopBarProps) {
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const subjectRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const activeSubject = subjects.find((subject) => subject.id === activeSubjectId);
  const initials = userEmail?.slice(0, 1).toUpperCase() ?? "U";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!subjectRef.current?.contains(event.target as Node)) setSubjectOpen(false);
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-3 px-4">
        <div ref={subjectRef} className="relative min-w-0">
          <button
            type="button"
            aria-expanded={subjectOpen}
            aria-haspopup="menu"
            onClick={() => setSubjectOpen((open) => !open)}
            onKeyDown={(event) => event.key === "Escape" && setSubjectOpen(false)}
            className="flex h-10 max-w-[min(19rem,calc(100vw-12rem))] items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{activeSubject?.title ?? "Select subject"}</span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${subjectOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {subjectOpen && (
            <div role="menu" aria-label="Subjects" className="absolute left-0 top-12 w-72 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl">
              <div className="max-h-64 overflow-y-auto">
                {subjects.map((subject) => (
                  <button key={subject.id} type="button" role="menuitem" onClick={() => { onSelectSubject(subject.id); setSubjectOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted ${subject.id === activeSubjectId ? "bg-muted" : ""}`}>
                    <span className="truncate">{subject.title}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{Math.round(subject.overallMasteryPct)}%</span>
                  </button>
                ))}
              </div>
              <div className="mt-1 border-t border-border pt-1">
                <button type="button" role="menuitem" onClick={() => { onAddNewSubject(); setSubjectOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary outline-none hover:bg-muted focus-visible:bg-muted">
                  <Plus className="size-4" aria-hidden="true" /> Add New Subject
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span title="Active daily engagement streak. Consistency builds mastery." className="inline-flex h-9 items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 text-xs font-medium text-orange-700 dark:text-orange-300">
            <Flame className="size-4 text-orange-500" aria-hidden="true" />
            <span className="tabular-nums">{streakDays} Days</span><span className="hidden sm:inline">Consistency</span>
          </span>
          {activeSubject && <span className="hidden h-9 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 text-xs font-medium text-muted-foreground md:inline-flex"><Target className="size-3.5" aria-hidden="true" />{Math.round(activeSubject.overallMasteryPct)}% Mastery</span>}
          <div ref={profileRef} className="relative">
            <button type="button" aria-label="Open account menu" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen((open) => !open)} onKeyDown={(event) => event.key === "Escape" && setProfileOpen(false)} className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {userEmail ? initials : <User className="size-4" aria-hidden="true" />}
            </button>
            {profileOpen && <div role="menu" className="absolute right-0 top-11 w-48 rounded-lg border border-border bg-popover p-1 shadow-xl"><a role="menuitem" href="/account" className="block rounded-md px-3 py-2 text-sm outline-none hover:bg-muted focus-visible:bg-muted">Account</a><a role="menuitem" href="/logout" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive outline-none hover:bg-muted focus-visible:bg-muted"><LogOut className="size-4" aria-hidden="true" />Log out</a></div>}
          </div>
        </div>
      </div>
    </header>
  );
}
