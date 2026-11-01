export interface CapabilityItem {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  features: string[];
  suggestedPrompt: string;
  tags: string[];
}

export interface IdeaItem {
  id: string;
  category: string;
  title: string;
  tagline: string;
  features: string[];
  stack: string;
  readyPrompt: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  tag: string;
  priority: 'baixa' | 'media' | 'alta';
  status: 'todo' | 'doing' | 'done';
}
