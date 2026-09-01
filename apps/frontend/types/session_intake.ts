export interface DifficultySplit {
  easy: number;
  easyMedium: number;
  medium: number;
  mediumHard: number;
  hard: number;
}

export interface SessionIntakePayload {
  sessionDate: string;
  topicIds: string[];
  totalQuestions: number;
  difficultySplit: DifficultySplit;
  solutionImages: File[];
  solutionText?: string;
}

export interface DailySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTopics: { id: string; title: string }[];
  onSubmitSession: (payload: SessionIntakePayload) => Promise<void>;
}
