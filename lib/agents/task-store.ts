import { create } from 'zustand';
import { AgentTask, TaskStatus } from './task-types';
import { saveVersion, type VersionAuthor } from '@/lib/history/versions';

interface TaskStore {
  tasks: AgentTask[];
  addTask: (task: AgentTask) => void;
  updateTask: (id: string, updates: Partial<AgentTask>) => void;
  /** Replace a temporary optimistic ID with the real Supabase ID. */
  updateTaskId: (tempId: string, realId: string) => void;
  /** Remove a task by ID (used to rollback a failed optimistic add). */
  removeTask: (id: string) => void;
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

  updateTaskId: (tempId: string, realId: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === tempId ? { ...task, id: realId } : task
      ),
    }));
  },

  removeTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }));
  },

  updateTask: (id: string, updates: Partial<AgentTask>) => {
    set((state) => {
      const task = state.tasks.find(t => t.id === id);
      const updatedTask = task ? { ...task, ...updates, updatedAt: new Date() } : null;
      
      // If task is being completed successfully and has a result, save a version
      if (
        updatedTask &&
        updates.status === 'completed' &&
        task?.status !== 'completed' &&
        updatedTask.result &&
        updatedTask.documentId
      ) {
        const author: VersionAuthor = {
          type: 'agent',
          id: `${updatedTask.agent.provider}-${updatedTask.agent.model}`,
          name: updatedTask.agent.name,
          color: '#9333ea', // purple-600
        };
        
        saveVersion(
          updatedTask.documentId,
          updatedTask.result,
          author,
          undefined,
          'ai-task',
          updatedTask.id
        );
      }
      
      return {
        tasks: state.tasks.map((task) =>
          task.id === id ? updatedTask || task : task
        ),
      };
    });
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
