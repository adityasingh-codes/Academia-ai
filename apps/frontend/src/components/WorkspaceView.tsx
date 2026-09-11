import { ArrowRight, BarChart3, BookOpen, Brain, CheckCircle2, Clock3, FileText, Gauge, Lightbulb, Play, Settings2, Sparkles, Target, Upload, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type WorkspaceViewProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: "indigo" | "emerald" | "amber" | "rose" | "cyan";
  metrics?: Array<{ label: string; value: string; note: string; icon: LucideIcon }>;
  children?: ReactNode;
};

const accents = {
  indigo: { badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-400/20", glow: "from-indigo-300/40 dark:from-indigo-500/25", line: "bg-indigo-600 dark:bg-indigo-500" },
  emerald: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-400/20", glow: "from-emerald-300/40 dark:from-emerald-500/25", line: "bg-emerald-600 dark:bg-emerald-500" },
  amber: { badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/20", glow: "from-amber-300/40 dark:from-amber-500/25", line: "bg-amber-600 dark:bg-amber-500" },
  rose: { badge: "bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-400/20", glow: "from-rose-300/40 dark:from-rose-500/25", line: "bg-gradient-to-r from-rose-500 to-red-600" },
  cyan: { badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-400/20", glow: "from-cyan-300/40 dark:from-cyan-500/25", line: "bg-cyan-600 dark:bg-cyan-500" },
};

export function WorkspaceView({ eyebrow, title, description, icon: Icon, accent = "indigo", metrics = [], children }: WorkspaceViewProps) {
  const colors = accents[accent];

  return (
    <main className="relative min-w-0 flex-1 overflow-y-auto bg-[#F1F5F9] text-slate-900 transition-colors duration-500 ease-in-out dark:bg-[#0b0c10] dark:text-slate-100">
      <div className={`pointer-events-none absolute inset-0 blur-3xl opacity-100 transition-colors duration-500 ease-in-out bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] ${colors.glow} via-[#F8FAFC]/0 to-[#F8FAFC] dark:via-[#0b0c10]/0 dark:to-[#0b0c10]`} />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 transition-colors duration-200 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${colors.badge}`}>
              <Icon className="h-3.5 w-3.5" /> {eyebrow}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800">
            <Sparkles className="h-4 w-4 text-amber-300" /> Focus mode
          </button>
        </header>

        {metrics.length > 0 && (
          <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, note, icon: MetricIcon }) => (
              <div key={label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400"><span className="text-xs font-medium">{label}</span><MetricIcon className="h-4 w-4" /></div>
                <div className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
                <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{note}</div>
              </div>
            ))}
          </section>
        )}

        {children ?? <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900 dark:text-white">Today&apos;s learning signal</h2><Gauge className="h-4 w-4 text-slate-500 dark:text-slate-400" /></div>
            <div className="mt-6 space-y-5">
              {["Foundational recall", "Applied reasoning", "Transfer confidence"].map((label, index) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-xs"><span className="text-slate-600 dark:text-slate-400">{label}</span><span className="text-slate-700 dark:text-slate-300">{[82, 64, 48][index]}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${colors.line}`} style={{ width: `${[82, 64, 48][index]}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none"><h2 className="font-bold text-slate-900 dark:text-white">Next best action</h2><p className="mt-3 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">Review the prerequisite cluster before starting another high-difficulty assessment.</p><button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">Open study queue <ArrowRight className="h-4 w-4" /></button></div>
        </section>}
      </div>
    </main>
  );
}

export const workspaceIcons = { ArrowRight, BarChart3, BookOpen, Brain, CheckCircle2, Clock3, FileText, Gauge, Lightbulb, Play, Settings2, Target, Upload, Users, X };
