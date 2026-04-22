'use client';

import { Calendar, Clock, MessageSquare, Image as ImageIcon, Volume2, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  date: Date;
  type: 'voice' | 'text' | 'image';
  content: string;
  mood: string;
  moodScore: number;
  tags: string[];
  aiInsights?: string;
}

interface LogEntryProps {
  log: LogEntry;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const moodColors: Record<string, string> = {
  'Happy': 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900 dark:to-yellow-800 dark:text-yellow-200',
  'Content': 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900 dark:to-green-800 dark:text-green-200',
  'Calm': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900 dark:to-blue-800 dark:text-blue-200',
  'Energetic': 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900 dark:to-purple-800 dark:text-purple-200',
  'Neutral': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-900 dark:to-gray-800 dark:text-gray-200',
  'Tired': 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 dark:from-orange-900 dark:to-orange-800 dark:text-orange-200',
};

const typeIcons = {
  'voice': Volume2,
  'text': MessageSquare,
  'image': ImageIcon,
};

export default function LogEntry({ log, onEdit, onDelete }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const TypeIcon = typeIcons[log.type];

  return (
    <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-5 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <TypeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(log.date, 'MMM d, yyyy')}</span>
                <Clock className="w-3.5 h-3.5 ml-2" />
                <span>{format(log.date, 'h:mm a')}</span>
              </div>
            </div>

            <div className={`px-3 py-1 rounded-full text-sm font-medium ${moodColors[log.mood] || moodColors['Neutral']}`}>
              {log.mood} • {log.moodScore}/10
            </div>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
            {log.content}
          </p>

          {log.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {log.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {log.aiInsights && (
            <div className="mt-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <span>{isExpanded ? 'Hide AI Insights' : 'Show AI Insights'}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-2">AI Analysis</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.aiInsights}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {onEdit && (
            <button
              onClick={() => onEdit(log.id)}
              className="p-2 rounded-lg glassmorphism dark:glassmorphism-dark hover:glassmorphism-dark transition"
              title="Edit entry"
            >
              <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(log.id)}
              className="p-2 rounded-lg glassmorphism dark:glassmorphism-dark hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              title="Delete entry"
            >
              <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Positive sentiment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">High energy</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Analyzed {format(new Date(), 'MMM d, h:mm a')}
        </div>
      </div>
    </div>
  );
}