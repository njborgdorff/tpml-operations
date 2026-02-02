export interface PMPlan {
  mvp: {
    description: string;
    features: string[];
  };
  sprints: Array<{
    number: number;
    name: string;
    goal: string;
    duration: string;
    features: string[];
  }>;
  backlog: Array<{
    id: string;
    feature: string;
    priority: 'P0' | 'P1' | 'P2';
    acceptanceCriteria: string[];
    sprint: number;
  }>;
  timeline: string;
  risks: string[];
}

export interface CTOArchitecture {
  techStack: {
    framework: string;
    database: string;
    auth: string;
    hosting: string;
    notes: string;
  };
  dataModel: {
    entities: Array<{
      name: string;
      fields: string[];
      relations: string[];
    }>;
  };
  apiRoutes: Array<{
    method: string;
    path: string;
    description: string;
  }>;
  integrations: string[];
  technicalRisks: string[];
}

export interface PlanningResult {
  pmPlan: PMPlan;
  ctoArchitecture: CTOArchitecture;
  summary: string;
}
