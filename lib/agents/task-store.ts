import { create } from 'zustand';
import { AgentTask, TaskStatus } from './task-types';

interface TaskStore {
  tasks: AgentTask[];
  addTask: (task: AgentTask) => void;
  updateTask: (id: string, updates: Partial<AgentTask>) => void;
  getTasksByDocument: (documentId: string) => AgentTask[];
  getActiveTasks: () => AgentTask[];
  getRecentTasks: (limit?: number) => AgentTask[];
  cancelTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],

  addTask: (task: AgentTask) => {
    set((state) => ({
      tasks: [...state.tasks, task],
    }));
  },

  updateTask: (id: string, updates: Partial<AgentTask>) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              ...updates,
              updatedAt: new Date(),
            }
          : task
      ),
    }));
  },

  getTasksByDocument: (documentId: string) => {
    return get().tasks.filter((task) => task.documentId === documentId);
  },

  getActiveTasks: () => {
    return get().tasks.filter(
      (task) => task.status === 'queued' || task.status === 'running'
    );
  },

  getRecentTasks: (limit: number = 10) => {
    return [...get().tasks]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  cancelTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status: 'cancelled' as TaskStatus,
              updatedAt: new Date(),
            }
          : task
      ),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      tasks: state.tasks.filter(
        (task) => task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled'
      ),
    }));
  },
}));

export type { TaskStore };
