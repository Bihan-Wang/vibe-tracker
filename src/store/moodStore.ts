'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MoodEntry {
  id: string;
  date: Date;
  type: 'voice' | 'text' | 'image';
  content: string;
  mood: string;
  moodScore: number;
  tags: string[];
  aiInsights?: string;
  audioUrl?: string;
  imageUrl?: string;
}

interface MoodState {
  entries: MoodEntry[];
  currentMood: string;
  moodScore: number;
  weeklyAverage: number;
  streak: number;
  addEntry: (entry: Omit<MoodEntry, 'id'>) => void;
  updateEntry: (id: string, updates: Partial<MoodEntry>) => void;
  deleteEntry: (id: string) => void;
  setCurrentMood: (mood: string, score: number) => void;
  clearAllEntries: () => void;
  getEntriesByDate: (date: Date) => MoodEntry[];
  getWeeklySummary: () => {
    averageMood: number;
    mostCommonMood: string;
    entriesCount: number;
  };
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      entries: [
        {
          id: '1',
          date: new Date('2026-04-22'),
          type: 'voice',
          content: 'Had a really productive day at work! Finished all my tasks ahead of schedule.',
          mood: 'Happy',
          moodScore: 9,
          tags: ['work', 'productivity', 'success'],
          aiInsights: 'High energy and positivity detected. The focus on accomplishment suggests satisfaction with progress.',
        },
        {
          id: '2',
          date: new Date('2026-04-21'),
          type: 'text',
          content: 'Feeling calm after my morning meditation session.',
          mood: 'Calm',
          moodScore: 8,
          tags: ['meditation', 'mindfulness', 'morning'],
          aiInsights: 'Consistent morning routine appears to boost calmness levels. Consider extending meditation time for even better results.',
        },
        {
          id: '3',
          date: new Date('2026-04-20'),
          type: 'image',
          content: 'Beautiful sunset walk with friends.',
          mood: 'Content',
          moodScore: 8.5,
          tags: ['nature', 'friends', 'exercise'],
          aiInsights: 'Social connection and physical activity combined for positive mood boost. This pattern has been consistent in your entries.',
        },
      ],
      currentMood: 'Content',
      moodScore: 7.5,
      weeklyAverage: 7.8,
      streak: 14,

      addEntry: (entry) =>
        set((state) => ({
          entries: [
            {
              ...entry,
              id: Math.random().toString(36).substr(2, 9),
            },
            ...state.entries,
          ],
          streak: state.streak + 1,
        })),

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updates } : entry
          ),
        })),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        })),

      setCurrentMood: (mood, score) =>
        set(() => ({
          currentMood: mood,
          moodScore: score,
        })),

      clearAllEntries: () =>
        set(() => ({
          entries: [],
          streak: 0,
        })),

      getEntriesByDate: (date) => {
        const state = get();
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        return state.entries.filter((entry) => {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === targetDate.getTime();
        });
      },

      getWeeklySummary: () => {
        const state = get();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentEntries = state.entries.filter(
          (entry) => new Date(entry.date) >= oneWeekAgo
        );

        if (recentEntries.length === 0) {
          return {
            averageMood: 0,
            mostCommonMood: 'No data',
            entriesCount: 0,
          };
        }

        const averageMood =
          recentEntries.reduce((sum, entry) => sum + entry.moodScore, 0) /
          recentEntries.length;

        const moodCounts: Record<string, number> = {};
        recentEntries.forEach((entry) => {
          moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
        });

        const mostCommonMood = Object.entries(moodCounts).reduce(
          (max, [mood, count]) => (count > (moodCounts[max] || 0) ? mood : max),
          Object.keys(moodCounts)[0] || ''
        );

        return {
          averageMood,
          mostCommonMood,
          entriesCount: recentEntries.length,
        };
      },
    }),
    {
      name: 'vibe-tracker-storage',
      partialize: (state) => ({
        entries: state.entries,
        currentMood: state.currentMood,
        moodScore: state.moodScore,
        weeklyAverage: state.weeklyAverage,
        streak: state.streak,
      }),
    }
  )
);