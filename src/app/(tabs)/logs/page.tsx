'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMoodStore } from '@/store/moodStore';
import type { MoodEntry } from '@/store/moodStore';
import { translateTag } from '@/utils/translate';

// ── Mood colour / emoji / gradient maps ──
const MOOD_STYLES: Record<string, {
  color: string;       // calendar dot & card accent
  bg: string;          // card background gradient
  emoji: string;
  label: string;
}> = {
  happy:    { color: '#FFB347', bg: 'from-amber-100 to-orange-50',    emoji: '😊', label: '开心' },
  content:  { color: '#D4A574', bg: 'from-amber-50 to-yellow-50',    emoji: '😊', label: '满足' },
  calm:     { color: '#A8C5B5', bg: 'from-emerald-100 to-teal-50',   emoji: '😌', label: '平静' },
  anxious:  { color: '#C4A4C8', bg: 'from-purple-100 to-pink-50',    emoji: '😰', label: '焦虑' },
  sad:      { color: '#A78BFA', bg: 'from-indigo-100 to-blue-50',    emoji: '😢', label: '低落' },
  angry:    { color: '#DC2626', bg: 'from-red-100 to-orange-50',     emoji: '😠', label: '生气' },
  energetic:{ color: '#FB923C', bg: 'from-orange-100 to-amber-50',   emoji: '💪', label: '活力' },
  tired:    { color: '#9CA3AF', bg: 'from-gray-100 to-slate-50',     emoji: '😴', label: '疲惫' },
  neutral:  { color: '#818CF8', bg: 'from-indigo-100 to-blue-50',    emoji: '😐', label: '平静' },
};

function getMoodKey(mood: string): string {
  return mood.toLowerCase().trim();
}

function getMoodStyle(mood: string) {
  const key = getMoodKey(mood);
  return MOOD_STYLES[key] || MOOD_STYLES.neutral;
}

function getMoodEmoji(mood: string): string {
  return getMoodStyle(mood).emoji;
}

function getMoodColor(mood: string): string {
  return getMoodStyle(mood).color;
}

// ── AI quote generator ──
const QUOTES: Record<string, string[]> = {
  happy: [
    '快乐不是拥有的多，而是计较的少。今天的你，就像一束阳光。',
    '每一个微笑都是内心的花朵在绽放。今天的美好值得被记住。',
    '快乐是会传染的，今天的你温暖了整个世界。',
    '心怀阳光，处处皆风景。今天的你格外闪亮。',
  ],
  calm: [
    '内心的平静是最大的力量。今天的你，像湖面一样宁静。',
    '静水流深，平和的心境是最好的状态。',
    '在喧嚣的世界里保持平静，是一种难得的智慧。',
    '宁静不是无声，而是内心的从容。',
  ],
  anxious: [
    '焦虑说明你在乎，但请记得，你已经做得很好了。',
    '深呼吸，一切都会好起来的。今天的烦恼明天就会过去。',
    '不安是暂时的，勇气是永恒的。你比自己想象的更强大。',
    '把焦虑写在纸上，然后折成纸飞机，让它飞走。',
  ],
  sad: [
    '雨过总会天晴，每一种情绪都是生命的色彩。',
    '悲伤是心灵的雨季，但请相信，彩虹就在风雨之后。',
    '允许自己难过，也是一种勇气。明天会更好的。',
    '有时候，放下才是最好的前进。',
  ],
  energetic: [
    '充满能量的一天！世界就是你的舞台。',
    '活力满满的状态，没有什么能阻挡你的脚步。',
    '今天的状态满分，去创造属于你的精彩吧！',
    '能量满满，未来可期。',
  ],
  angry: [
    '愤怒是短暂的疯狂，深呼吸，给自己一个平静的机会。',
    '生气的时候数到十，再说话。世界会变得不一样。',
    '把愤怒化作前进的动力，你会发现自己比想象中更强大。',
  ],
  tired: [
    '休息不是懒惰，而是为了更好地出发。',
    '疲惫的身体需要休息，疲惫的心灵需要温暖。',
    '好好照顾自己，你值得被温柔以待。',
  ],
  neutral: [
    '平平淡淡也是真，每一个平凡的日子都值得被记录。',
    '生活的美好，往往藏在最平常的日子里。',
    '保持平衡，享受当下的每一刻。',
  ],
};

function generateQuote(mood: string, content?: string): string {
  const key = getMoodKey(mood);
  const pool = QUOTES[key] || QUOTES.neutral;
  // Use content length as seed to get a deterministic quote for same content
  const idx = content ? content.length % pool.length : Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// ── Helpers ──
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long',
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('zh-CN', {
    month: 'short', day: 'numeric',
  });
}


// ── Component ──
export default function LogsPage() {
  const entries = useMoodStore((state) => state.entries);

  // Sort entries newest-first for the card list
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries]);

  // Calendar state
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  // Card swipe state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch state for swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset index when entries change
  useEffect(() => {
    setCurrentIndex(0);
  }, [entries.length]);

  // Build calendar data
  const calendarData = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay(); // 0=Sun
    const weeks: Array<Array<{ day: number; dateStr: string; entry?: MoodEntry }>> = [];

    // Create entry lookup by date string
    const entryByDate: Record<string, MoodEntry> = {};
    sortedEntries.forEach((e) => {
      const ds = toDateStr(new Date(e.date));
      if (!entryByDate[ds]) entryByDate[ds] = e; // first entry wins
    });

    let dayCells: Array<{ day: number; dateStr: string; entry?: MoodEntry }> = [];

    // Empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      dayCells.push({ day: 0, dateStr: '' });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calendarYear, calendarMonth, d);
      const ds = toDateStr(dateObj);
      dayCells.push({ day: d, dateStr: ds, entry: entryByDate[ds] });
    }

    // Pad to complete the last week
    while (dayCells.length % 7 !== 0) {
      dayCells.push({ day: 0, dateStr: '' });
    }

    for (let i = 0; i < dayCells.length; i += 7) {
      weeks.push(dayCells.slice(i, i + 7));
    }

    return weeks;
  }, [calendarYear, calendarMonth, sortedEntries]);

  const goToPrevMonth = useCallback(() => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }, [calendarMonth]);

  const goToNextMonth = useCallback(() => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }, [calendarMonth]);

  const handleDayClick = useCallback((dateStr: string) => {
    if (!dateStr) return;
    const idx = sortedEntries.findIndex((e) => toDateStr(new Date(e.date)) === dateStr);
    if (idx !== -1) {
      setCurrentIndex(idx);
    }
  }, [sortedEntries]);

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 60;

    if (Math.abs(diff) > threshold && !isAnimating) {
      setIsAnimating(true);
      if (diff > 0 && currentIndex < sortedEntries.length - 1) {
        // Swipe left → next card
        setCurrentIndex((i) => i + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right → previous card
        setCurrentIndex((i) => i - 1);
      }
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentIndex, sortedEntries.length, isAnimating]);

  const goNext = useCallback(() => {
    if (currentIndex < sortedEntries.length - 1) {
      setIsAnimating(true);
      setCurrentIndex((i) => i + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentIndex, sortedEntries.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsAnimating(true);
      setCurrentIndex((i) => i - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentIndex]);

  // Current entry
  const currentEntry = sortedEntries[currentIndex];

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* ── Header ── */}
        <header className="mb-6 pt-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar className="text-pink-500" />
            日志
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
            翻阅您的情绪日记
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">还没有记录</h2>
            <p className="text-gray-600 dark:text-gray-300">开始记录您今天的情绪吧</p>
          </div>
        ) : (
          <>
            {/* ── Calendar ── */}
            <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-4 mb-6">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={goToPrevMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="font-semibold text-gray-800 dark:text-white text-lg">
                  {calendarYear}年{calendarMonth + 1}月
                </span>
                <button onClick={goToNextMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarData.flat().map((cell, idx) => {
                  const isToday = cell.dateStr === toDateStr(today);
                  const moodColor = cell.entry ? getMoodColor(cell.entry.mood) : undefined;

                  return (
                    <button
                      key={idx}
                      disabled={!cell.day}
                      onClick={() => handleDayClick(cell.dateStr)}
                      className={`
                        relative aspect-square rounded-lg flex items-center justify-center text-sm
                        transition-all duration-200
                        ${cell.day ? 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer' : ''}
                        ${isToday ? 'ring-2 ring-purple-400 dark:ring-purple-500' : ''}
                        ${cell.entry ? 'font-medium' : ''}
                        ${!cell.day ? 'invisible' : ''}
                      `}
                    >
                      <span className={`relative z-10 ${isToday ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {cell.day}
                      </span>
                      {cell.entry && (
                        <span
                          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: moodColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3 justify-center">
                {Object.entries(MOOD_STYLES).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val.color }} />
                    {val.emoji} {val.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Diary Card (swipeable) ── */}
            {currentEntry && (
              <div className="relative">
                {/* Navigation dots */}
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {sortedEntries.slice(0, Math.min(sortedEntries.length, 10)).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentIndex(idx); }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        idx === currentIndex
                          ? 'bg-amber-500 w-5'
                          : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                      }`}
                    />
                  ))}
                  {sortedEntries.length > 10 && (
                    <span className="text-xs text-gray-400 ml-1">+{sortedEntries.length - 10}</span>
                  )}
                </div>

                {/* Card container with swipe */}
                <div
                  ref={cardRef}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="transition-transform duration-300 ease-out"
                >
                  <DiaryCard
                    entry={currentEntry}
                    index={currentIndex}
                    total={sortedEntries.length}
                    onPrev={goPrev}
                    onNext={goNext}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Diary Card sub-component ──
function DiaryCard({
  entry,
  index,
  total,
  onPrev,
  onNext,
}: {
  entry: MoodEntry;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const entryDate = new Date(entry.date);
  const moodKey = getMoodKey(entry.mood);
  const moodStyle = getMoodStyle(entry.mood);
  const accentColor = moodStyle.color;
  const quote = useMemo(() => generateQuote(entry.mood, entry.content), [entry.mood, entry.content]);
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasImage = entry.type === 'image' && entry.imageUrl && !imgError;

  // ── Image-first layout ──
  if (hasImage) {
    return (
      <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ height: 520 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />

        {/* Gradient overlay: bottom 35% */}
        <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        {/* Text content within gradient zone */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Row 1: emoji + label + score */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{moodStyle.emoji}</span>
            <span className="text-lg font-bold text-white drop-shadow-sm">{moodStyle.label}</span>
            <span className="text-sm text-gray-300 drop-shadow-sm">情绪值 {entry.moodScore.toFixed(1)}/10</span>
          </div>

          {/* Row 2: AI summary, max 2 lines */}
          {entry.content && (
            <p className="text-sm text-gray-100 leading-snug line-clamp-2 mb-2 drop-shadow-sm">
              {entry.content}
            </p>
          )}

          {/* Row 3: tags (Chinese) */}
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.slice(0, 4).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-xs text-gray-200"
                >
                  #{translateTag(tag)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Type badge — top right, semi-transparent */}
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white/90">
          🖼️ 图片
        </div>

        {/* Date — top left with shadow */}
        <div className="absolute top-3 left-3 z-10 drop-shadow-md">
          <span className="text-xs font-medium text-white">{formatDisplayDate(entryDate)}</span>
        </div>

        {/* Navigation — bottom center, smaller */}
        <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-4">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="p-1 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30 transition disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-xs text-white/60 font-medium">{index + 1} / {total}</span>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="p-1 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/30 transition disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  // ── Non-image layout (voice / text / image w/o URL) ──
  const summaryText = entry.aiInsights || entry.content;
  const shouldTruncate = summaryText.length > 80;

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[420px]">
      {/* Gradient background: mood color → white */}
      <div className={`absolute inset-0 bg-gradient-to-b ${moodStyle.bg} dark:from-gray-800 dark:to-gray-900`} />

      {/* Content */}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col min-h-[420px]">
        {/* Compact one-row header: date · emoji · label · score */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDisplayDate(entryDate)}
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xl">{moodStyle.emoji}</span>
            <span className="text-base font-bold text-gray-800 dark:text-white">
              {moodStyle.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {entry.moodScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* AI Summary (replaces duplicate AI box) — max 3 lines with expand */}
        {summaryText && (
          <div className="mb-4">
            <p className={`text-sm text-gray-700 dark:text-gray-200 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
              {summaryText}
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 mt-1"
              >
                {expanded ? '收起' : '展开全部'}
              </button>
            )}
          </div>
        )}

        {/* Quote — gray left border, italic, smaller */}
        <div className="mb-4 pl-3 border-l border-gray-300 dark:border-gray-600">
          <p className="text-xs font-light italic text-gray-500 dark:text-gray-400 leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        {/* Spacer to push tags and nav to bottom */}
        <div className="flex-1" />

        {/* Tags — cream bg + warm brown */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {entry.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium tag-chip"
              >
                #{translateTag(tag)}
              </span>
            ))}
          </div>
        )}

        {/* Navigation — small like image card */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="p-1 rounded-full bg-white/50 dark:bg-black/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-black/50 transition disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {index + 1} / {total}
          </span>

          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="p-1 rounded-full bg-white/50 dark:bg-black/30 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-black/50 transition disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}