
export interface SubTask {
  id: string;
  label: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  label: string;
  timeLabel: string;
  target: string;
  isMVD: boolean;
  startTime: string | null; // HH:mm
  endTime: string | null;   // HH:mm
  subTasks?: SubTask[];
}

export interface DayData {
  goals: Goal[];
  completedGoals: Record<string, boolean>;
  reflection?: string;
  subTaskCompletion?: Record<string, boolean>; // goalId-subTaskId -> completed
}

export interface AppState {
  goals: Goal[]; // This acts as the "Current View" or "Template"
  completedGoals: Record<string, boolean>;
  subTaskCompletion: Record<string, boolean>;
  reflection: string;
  lastResetDate: string;
  streak: number;
  alarmsEnabled: boolean;
  showMVDOnly: boolean;
  history: Record<string, DayData>; // date -> DayData
}

export interface CoachInsights {
  title: string;
  analysis: string;
  recommendations: string[];
}
