import { BarChart3, Brain, CalendarDays, ChevronLeft, ChevronRight, GraduationCap, LayoutDashboard, Library, Settings2, Target, Timer, Trophy } from "lucide-react";

type SidebarDrawerProps = { activeTab: string; onNavigate: (tab: string) => void };

const items = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assessment", label: "Interactive Assessment", icon: Target },
  { id: "tutor", label: "Socratic Tutor", icon: Brain },
  { id: "mock-exam", label: "Mock Exam Arena", icon: Trophy },
  { id: "root-cause", label: "Root Cause Analysis", icon: BarChart3 },
  { id: "knowledge-graph", label: "Knowledge Graph", icon: Library },
  { id: "velocity", label: "Velocity Tracking", icon: Timer },
  { id: "spaced-repetition", label: "Spaced Repetition", icon: CalendarDays },
  { id: "planner", label: "Time-Aware Planner", icon: CalendarDays },
  { id: "mistakes", label: "Mistake Library", icon: GraduationCap },
  { id: "settings", label: "Settings & Logs", icon: Settings2 },
];

export function SidebarDrawer({ activeTab, onNavigate }: SidebarDrawerProps) {
  return <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d121c] lg:flex lg:flex-col">
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300"><GraduationCap className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-white">Cognitive Lab</p><p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Learning OS</p></div></div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${activeTab === id ? "bg-indigo-500/15 text-indigo-200" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"}`}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></button>)}</nav>
    <div className="border-t border-white/10 p-3"><button onClick={() => onNavigate("dashboard")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"><ChevronLeft className="h-4 w-4" /> Back to overview <ChevronRight className="ml-auto h-4 w-4" /></button></div>
  </aside>;
}
