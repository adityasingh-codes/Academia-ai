export interface Subject {
  id: string;
  title: string;
  overallMasteryPct: number;
}

export interface TopBarProps {
  subjects: Subject[];
  activeSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  onAddNewSubject: () => void;
  streakDays: number;
  userEmail?: string;
}
