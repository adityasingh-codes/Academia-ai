export type ConfidenceLevel = "GUESSING" | "SOMEWHAT_CONFIDENT" | "CONFIDENT" | "VERY_CONFIDENT";

export interface QuizQuestion {
  id: string;
  questionNumber: number;
  difficultyTier: string;
  techniqueUsed: string;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "NUMERICAL_INPUT" | "STEP_BY_STEP_TEXT";
  options?: string[];
}

export interface StudentAnswerPayload {
  questionId: string;
  studentAnswer: string;
  confidenceRating: ConfidenceLevel;
  timeSpentSeconds: number;
}

export interface AssessmentQuizProps {
  sessionLogId: string;
  questions: QuizQuestion[];
  onCompleteQuiz: (answers: StudentAnswerPayload[]) => Promise<void>;
}
