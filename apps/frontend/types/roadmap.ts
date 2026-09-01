export interface ChapterNode {
  id: string;
  chapterNumber: number;
  title: string;
  totalTopics: number;
  masteredTopics: number;
  hasRevisionCue: boolean;
  isCurrentActive: boolean;
  masteryPct: number;
}

export interface SyllabusRoadmapProps {
  chapters: ChapterNode[];
  subjectTitle?: string;
  activeChapterId?: string;
  onSelectChapter: (chapterId: string) => void;
  onUploadNewPDF?: () => void;
}
