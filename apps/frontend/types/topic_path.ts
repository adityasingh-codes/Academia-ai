export type NodeState = "MASTERED" | "ACTIVE" | "REVISION_CUE" | "PENDING";

export interface TopicNode {
  id: string;
  title: string;
  state: NodeState;
  sequenceOrder: number;
  subtopicCount: number;
  lastRevisedText?: string;
  gapPercentage?: number;
}

export interface TopicNodePathProps {
  chapterTitle: string;
  topics: TopicNode[];
  onBackToRoadmap: () => void;
  onSelectTopicNode: (nodeId: string, state: NodeState) => void;
}
