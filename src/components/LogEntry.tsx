'use client';

import { Calendar, Clock, Volume2, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
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
  imageUrl?: string;
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

function getMoodColor(mood: string): string {
  return moodColors[mood] || moodColors['Neutral'];
}

export default function LogEntry({ log, onEdit, onDelete }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const truncatedTranscript = log.content.length > 30
    ? log.content.substring(0, 30) + '…'
    : log.content;

  return (
    <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-4 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start gap-4">
        {/* Left: type-specific display */}
        {log.type === 'image' && log.imageUrl && !imgError ? (
          <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={log.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {log.type === 'voice' ? (
              <Volume2 className="w-5 h-5 text-amber-500" />
            ) : (
              <ImageIcon className="w-5 h-5 text-amber-500" />
            )}
          </div>
        )}

        {/* Right: content */}
        <div className="flex-1 min-w-0">
          {/* Top row: date + mood badge */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>{format(log.date, 'MMM d')}</span>
              <Clock className="w-3 h-3 ml-1" />
              <span>{format(log.date, 'h:mm a')}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getMoodColor(log.mood)}`}>
              {log.mood} · {log.moodScore}/10
            </span>
          </div>

          {/* Summary text */}
          {log.type === 'voice' ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <span className="text-amber-500 font-medium">🎤</span> {truncatedTranscript}
            </p>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
              {log.content}
            </p>
          )}

          {/* Tags */}
          {log.tags && log.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {log.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* AI Insights (expandable) */}
          {log.aiInsights && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
              >
                {isExpanded ? '收起分析' : '查看AI分析'}
              </button>
              {isExpanded && (
                <div className="mt-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.aiInsights}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(log.id)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="编辑"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(log.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
