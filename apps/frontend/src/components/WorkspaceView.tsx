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
  indigo: { badge: "bg-indigo-500/10 text-indigo-300 border-indigo-400/20", glow: "from-indigo-500/20", line: "bg-indigo-400" },
  emerald: { badge: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20", glow: "from-emerald-500/20", line: "bg-emerald-400" },
  amber: { badge: "bg-amber-500/10 text-amber-300 border-amber-400/20", glow: "from-amber-500/20", line: "bg-amber-400" },
  rose: { badge: "bg-rose-500/10 text-rose-300 border-rose-400/20", glow: "from-rose-500/20", line: "bg-rose-400" },
  cyan: { badge: "bg-cyan-500/10 text-cyan-300 border-cyan-400/20", glow: "from-cyan-500/20", line: "bg-cyan-400" },
};

export function WorkspaceView({ eyebrow, title, description, icon: Icon, accent = "indigo", metrics = [], children }: WorkspaceViewProps) {
  const colors = accents[accent];

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#080c14] text-slate-100">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-br ${colors.glow} via-transparent to-transparent opacity-70`} />
      <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${colors.badge}`}>
              <Icon className="h-3.5 w-3.5" /> {eyebrow}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
          </div>
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]">
            <Sparkles className="h-4 w-4 text-amber-300" /> Focus mode
          </button>
        </header>

        {metrics.length > 0 && (
          <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, note, icon: MetricIcon }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/10">
                <div className="flex items-center justify-between text-slate-500"><span className="text-xs font-medium">{label}</span><MetricIcon className="h-4 w-4" /></div>
                <div className="mt-4 text-2xl font-semibold text-white">{value}</div>
                <div className="mt-1 text-xs text-slate-500">{note}</div>
              </div>
            ))}
          </section>
        )}

        {children ?? <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Today&apos;s learning signal</h2><Gauge className="h-4 w-4 text-slate-500" /></div>
            <div className="mt-6 space-y-5">
              {["Foundational recall", "Applied reasoning", "Transfer confidence"].map((label, index) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-slate-300">{[82, 64, 48][index]}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${colors.line}`} style={{ width: `${[82, 64, 48][index]}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5"><h2 className="font-semibold text-white">Next best action</h2><p className="mt-3 text-sm leading-6 text-slate-400">Review the prerequisite cluster before starting another high-difficulty assessment.</p><button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300">Open study queue <ArrowRight className="h-4 w-4" /></button></div>
        </section>}
      </div>
    </main>
  );
}

export const workspaceIcons = { ArrowRight, BarChart3, BookOpen, Brain, CheckCircle2, Clock3, FileText, Gauge, Lightbulb, Play, Settings2, Target, Upload, Users, X };
