import { BarChart3, Brain, CalendarDays, ChevronLeft, ChevronRight, GraduationCap, LayoutDashboard, Library, PanelLeft, Search, Settings2, Target, Timer, Trophy } from "lucide-react";

type SidebarDrawerProps = { activeTab: string; collapsed: boolean; onNavigate: (tab: string) => void; onToggle: () => void; onSearch: () => void };

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

export function SidebarDrawer({ activeTab, collapsed, onNavigate, onToggle, onSearch }: SidebarDrawerProps) {
  return <aside className={`hidden w-16 shrink-0 overflow-hidden border-r border-white/10 bg-[#0d121c] transition-all duration-300 ease-in-out lg:flex lg:flex-col ${collapsed ? "items-center" : "w-72"}`}>
    {collapsed ? <>
      <div className="flex w-full flex-col items-center border-b border-white/10 py-4"><button type="button" onClick={onToggle} title="Open sidebar" aria-label="Open sidebar" className="group relative grid h-10 w-10 place-items-center rounded-lg text-slate-400 transition-all duration-200 ease-in-out hover:bg-white/[0.06] hover:text-white"><img src="/1logo.png.jpeg" alt="Academia.ai Logo" className="h-8 w-8 shrink-0 object-contain transition-all duration-200 ease-in-out group-hover:scale-90 group-hover:opacity-0" /><PanelLeft className="absolute h-5 w-5 scale-90 opacity-0 transition-all duration-200 ease-in-out group-hover:scale-100 group-hover:opacity-100" /></button></div>
      <nav className="flex flex-1 flex-col items-center gap-4 overflow-y-auto py-5">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)} title={label} aria-label={label} className={`rounded-lg p-2.5 transition ${activeTab === id ? "bg-indigo-500/15 text-indigo-200" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"}`}><Icon className="h-5 w-5" /></button>)}</nav>
      <div className="border-t border-white/10 p-3"><button onClick={() => onNavigate("dashboard")} title="Back to overview" aria-label="Back to overview" className="rounded-lg p-2.5 text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-300"><ChevronLeft className="h-5 w-5" /></button></div>
    </> : <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5"><img src="/1logo.png.jpeg" alt="Academia.ai Logo" className="h-10 w-10 shrink-0 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]" /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><h1 className="whitespace-nowrap text-lg font-bold leading-none tracking-wide text-white">Academia.ai</h1><span className="mt-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-purple-400">LEARNING OS</span></div><button type="button" onClick={onToggle} title="Collapse sidebar" aria-label="Collapse sidebar" className="shrink-0 rounded-md p-1.5 text-slate-500 opacity-80 transition hover:bg-white/[0.06] hover:text-slate-200 hover:opacity-100"><PanelLeft className="h-4 w-4" /></button><button type="button" onClick={onSearch} title="Search (Ctrl+K)" aria-label="Search (Ctrl+K)" className="shrink-0 rounded-md p-1.5 text-slate-500 opacity-80 transition hover:bg-white/[0.06] hover:text-slate-200 hover:opacity-100"><Search className="h-4 w-4" /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onNavigate(id)} title={label} aria-label={label} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${activeTab === id ? "bg-indigo-500/15 text-indigo-200" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 overflow-hidden whitespace-nowrap">{label}</span></button>)}</nav>
      <div className="border-t border-white/10 p-3"><button onClick={() => onNavigate("dashboard")} title="Back to overview" aria-label="Back to overview" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"><ChevronLeft className="h-4 w-4 shrink-0" />Back to overview<ChevronRight className="ml-auto h-4 w-4 shrink-0" /></button></div>
    </>}
  </aside>;
}
