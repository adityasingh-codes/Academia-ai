import { BarChart3, BookOpen, CheckCircle2, Clock3 } from "lucide-react";
import { WorkspaceView } from "../WorkspaceView";

export default function StudentDashboard() { return <WorkspaceView eyebrow="Personal command center" title="Your learning system, in one view" description="See what is solid, what is decaying, and the smallest next action that will move your understanding forward." icon={BookOpen} metrics={[{ label: "Current mastery", value: "68%", note: "+6% this month", icon: BarChart3 }, { label: "Study streak", value: "12 days", note: "Best: 18 days", icon: Clock3 }, { label: "Concepts secure", value: "142", note: "Across 4 subjects", icon: CheckCircle2 }, { label: "Review queue", value: "8", note: "3 due today", icon: BookOpen }]} />; }
