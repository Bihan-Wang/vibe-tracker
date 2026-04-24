'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { useMoodStore } from '@/store/moodStore';

// ── Mood config ──
const MOOD_CONFIG: Record<string, {
  label: string;
  emoji: string;
  bg: string;
  color: string;
}> = {
  happy:     { label: '开心',  emoji: '😊', bg: 'from-amber-100 to-orange-50',   color: '#FFB347' },
  content:   { label: '满足',  emoji: '😊', bg: 'from-amber-50 to-yellow-50',   color: '#D4A574' },
  calm:      { label: '平静',  emoji: '😌', bg: 'from-emerald-100 to-teal-50',  color: '#A8C5B5' },
  neutral:   { label: '平静',  emoji: '😌', bg: 'from-emerald-100 to-teal-50',  color: '#A8C5B5' },
  anxious:   { label: '焦虑',  emoji: '😰', bg: 'from-purple-100 to-pink-50',   color: '#C4A4C8' },
  sad:       { label: '低落',  emoji: '😢', bg: 'from-indigo-100 to-blue-50',   color: '#A78BFA' },
  angry:     { label: '生气',  emoji: '😠', bg: 'from-red-100 to-orange-50',    color: '#DC2626' },
  energetic: { label: '活力',  emoji: '💪', bg: 'from-orange-100 to-amber-50',  color: '#FB923C' },
  tired:     { label: '疲惫',  emoji: '😴', bg: 'from-gray-100 to-slate-50',    color: '#9CA3AF' },
};

function getMoodKey(mood: string): string {
  return mood.toLowerCase().trim();
}

function getMoodConfig(mood: string) {
  const key = getMoodKey(mood);
  return MOOD_CONFIG[key] || { label: mood, emoji: '😐', bg: 'from-gray-100 to-slate-50', color: '#9CA3AF' };
}

// ── Helpers ──
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

// ── Mood river constants ──
const VB_W = 700;
const VB_H = 240;
const RIVER_L = 50;
const RIVER_R = 650;
const RIVER_W = RIVER_R - RIVER_L;
const SEG_W = RIVER_W / 7;
const BASELINE_Y = 155;
const AMPLITUDE = 50;
const HALF_T = 22;

function scoreToY(s: number | null): number {
  if (s === null) return BASELINE_Y;
  return BASELINE_Y - ((Math.max(0, Math.min(10, s)) - 5) / 5) * AMPLITUDE;
}

function scoreToColor(s: number | null): string {
  if (s === null) return '#4A4A6A';
  if (s >= 8) return '#FFB347';
  if (s >= 6) return '#A78BFA';
  if (s >= 5) return '#818CF8';
  return '#93C5FD';
}

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (!pts.length) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const px = pts[i - 1].x, py = pts[i - 1].y;
    const cx = pts[i].x, cy = pts[i].y;
    const dx = (cx - px) / 3;
    d += ` C ${px + dx} ${py}, ${cx - dx} ${cy}, ${cx} ${cy}`;
  }
  return d;
}

function buildRiverPath(centers: Array<{ x: number; y: number }>): string {
  const top = centers.map(p => ({ x: p.x, y: p.y - HALF_T }));
  const bot = centers.map(p => ({ x: p.x, y: p.y + HALF_T })).reverse();
  return smoothPath(top) + ` L ${bot[0].x} ${bot[0].y}` + smoothPath(bot) + ' Z';
}

// ── Mock data for the river ──
const MOCK_RIVER: Array<{ dateStr: string; label: string; score: number | null; emoji: string | null }> = [
  { dateStr: '', label: '一', score: 7.5, emoji: '😊' },
  { dateStr: '', label: '二', score: 8.2, emoji: '😊' },
  { dateStr: '', label: '三', score: 6.0, emoji: '😌' },
  { dateStr: '', label: '四', score: 3.5, emoji: '😰' },
  { dateStr: '', label: '五', score: null, emoji: null },
  { dateStr: '', label: '六', score: 7.0, emoji: '😊' },
  { dateStr: '', label: '日', score: 8.8, emoji: '💪' },
];

// ── Weekly summary templates ──
function generateWeeklySummary(
  avgScore: number,
  totalEntries: number,
  mostCommonMoodLabel: string,
): string {
  if (totalEntries === 0) return '本周还没有记录，开始记录你的情绪吧 🌱';
  if (avgScore >= 8) {
    return [
      `这周你整体状态非常好，情绪积极向上！${mostCommonMoodLabel}占据了大部分时间，继续保持！🌟`,
      '本周情绪高涨，充满正能量！每一天都闪闪发光 ✨',
      '状态满分的一周！你的积极能量很有感染力，继续保持这份好心情 🎉',
    ][Math.floor(Math.random() * 3)];
  }
  if (avgScore >= 6) {
    return [
      `这周整体状态不错，多数时间都 feeling good 👍 偶尔有波动也很正常～`,
      `平稳中带着小确幸的一周。${mostCommonMoodLabel}是你的主旋律，整体节奏把握得很好 ☀️`,
      '本周情绪稳中有升，生活有甜有淡，这才是真实的节奏 🌈',
    ][Math.floor(Math.random() * 3)];
  }
  if (avgScore >= 4) {
    return [
      `这周有些起伏，但每个情绪都有它的意义。给自己多一点耐心和温柔 🌱`,
      `生活总有高低起伏，重要的是你在持续关注自己的感受。做得很棒 💪`,
      '本周情绪偏平淡，允许自己偶尔放空，休息是为了更好地出发 🌙',
    ][Math.floor(Math.random() * 3)];
  }
  return [
    '这周似乎遇到了一些挑战，别忘了照顾好自己。每一个低谷都是成长的铺垫 🌧️→🌈',
    '有时候情绪低落也是生活的一部分。给自己一个拥抱，明天会更好 🤗',
    '这周不太容易，但你已经坚持记录下来了，这本身就是一种勇气和力量 💪',
  ][Math.floor(Math.random() * 3)];
}

// ── Component ──
export default function ReportsPage() {
  const router = useRouter();
  const entries = useMoodStore((state) => state.entries);

  const now = new Date();

  // ── Stats ──
  const stats = useMemo(() => {
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = entries.filter((e) => new Date(e.date) >= thirtyDaysAgo);
    return {
      totalEntriesLast30d: recent.length,
      avgScoreLast30d: recent.length > 0
        ? recent.reduce((s, e) => s + e.moodScore, 0) / recent.length
        : 0,
    };
  }, [entries, now]);

  // ── Most common mood ──
  const moodCounts = useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach((e) => { c[e.mood] = (c[e.mood] || 0) + 1; });
    return c;
  }, [entries]);

  const topMoodEntry = useMemo(
    () => Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0] || null,
    [moodCounts],
  );

  // ── River data (real if available, otherwise mock) ──
  const riverData = useMemo(() => {
    const today = startOfDay(now);
    const real: Array<{ dateStr: string; label: string; score: number | null; emoji: string | null }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const labelIdx = dow === 0 ? 6 : dow - 1;
      const ds = toDateStr(d);
      const dayEntries = entries.filter((e) => toDateStr(new Date(e.date)) === ds);

      real.push({
        dateStr: ds,
        label: WEEKDAY_LABELS[labelIdx],
        score: dayEntries.length > 0
          ? dayEntries.reduce((s, e) => s + e.moodScore, 0) / dayEntries.length
          : null,
        emoji: dayEntries.length > 0
          ? getMoodConfig(dayEntries[0].mood).emoji
          : null,
      });
    }

    return real;
  }, [entries, now]);

  const hasRealData = riverData.some((d) => d.score !== null);

  // If no real data at all, fall through to empty-state; otherwise show river even if partially empty
  const showRiver = hasRealData;
  const displayData = showRiver ? riverData : MOCK_RIVER;

  // Build SVG coordinates
  const svgPoints = useMemo(() => {
    return displayData.map((d, i) => ({
      x: RIVER_L + (i + 0.5) * SEG_W,
      y: scoreToY(d.score),
      score: d.score,
      emoji: d.emoji,
      label: d.label,
    }));
  }, [displayData]);

  const riverPath = useMemo(
    () => buildRiverPath(svgPoints),
    [svgPoints],
  );

  // Gradient stops
  const gradientStops = useMemo(() => {
    return svgPoints.map((p) => ({
      offset: `${((p.x / VB_W) * 100).toFixed(1)}%`,
      color: scoreToColor(p.score),
    }));
  }, [svgPoints]);

  // ── Weekly summary ──
  const weeklyScores = svgPoints.filter((p) => p.score !== null).map((p) => p.score!);
  const weeklyAvgScore = weeklyScores.length > 0
    ? weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length
    : 0;
  const weeklyEntryCount = riverData.filter((d) => d.score !== null).length;

  // Count top mood from river data
  const weeklyTopMoodLabel = useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach((e) => {
      const ds = toDateStr(new Date(e.date));
      if (riverData.some((rd) => rd.dateStr === ds && rd.score !== null)) {
        c[e.mood] = (c[e.mood] || 0) + 1;
      }
    });
    const sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? getMoodConfig(sorted[0][0]).label : '平静';
  }, [entries, riverData]);

  const weeklySummary = useMemo(
    () => generateWeeklySummary(weeklyAvgScore, weeklyEntryCount, weeklyTopMoodLabel),
    // stable for session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* ── Header ── */}
        <header className="mb-6 pt-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-500" />
            报告
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
            你的情绪数据概览
          </p>
        </header>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">暂无数据</h2>
            <p className="text-gray-600 dark:text-gray-300">记录更多数据后查看统计报告</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Compact stat cards ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📝</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">总记录数</span>
                </div>
                <div className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalEntriesLast30d}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">过去30天</div>
              </div>
              <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⭐</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">平均评分</span>
                </div>
                <div className="text-3xl font-bold text-gray-800 dark:text-white">
                  {stats.avgScoreLast30d > 0 ? stats.avgScoreLast30d.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">情绪健康度</div>
              </div>
            </div>

            {/* ── Most common mood ── */}
            {topMoodEntry && (() => {
              const cfg = getMoodConfig(topMoodEntry[0]);
              const count = topMoodEntry[1];
              return (
                <div className={`rounded-2xl p-5 shadow-sm bg-gradient-to-br ${cfg.bg} dark:opacity-90`}>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">最常见的情绪</div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{cfg.emoji}</span>
                    <div>
                      <div className="text-2xl font-bold text-gray-800 dark:text-white">{cfg.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {count} 次记录 · 占 {entries.length > 0 ? Math.round((count / entries.length) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {weeklyEntryCount > 0
                      ? `你这周整体状态${weeklyAvgScore >= 7 ? '很不错' : weeklyAvgScore >= 5 ? '平稳' : '有些波动'}，${cfg.label}是你的主旋律${weeklyAvgScore >= 6 ? '，保持得不错 👏' : '，记得多照顾自己 🌱'}`
                      : '记录更多情绪，发现你的情绪模式 🌱'}
                  </div>
                </div>
              );
            })()}

            {/* ── Mood River ── */}
            <div className="rounded-2xl p-5 shadow-lg" style={{ backgroundColor: '#2D2016' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#D4A574' }}>
                本周情绪轨迹
              </h3>

              <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto">
                <defs>
                  <filter id="riverBlur" x="-10%" y="-20%" width="120%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
                  </filter>
                  <filter id="riverShadow" x="-10%" y="-20%" width="120%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                  </filter>

                  <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {gradientStops.map((s, i) => (
                      <stop key={i} offset={s.offset} stopColor={s.color} />
                    ))}
                    <stop offset="100%" stopColor={gradientStops.length > 0 ? gradientStops[gradientStops.length - 1].color : '#4A4A6A'} />
                  </linearGradient>
                </defs>

                {/* Shadow */}
                <path
                  d={riverPath}
                  fill="rgba(0,0,0,0.35)"
                  filter="url(#riverShadow)"
                  transform={`translate(0, 6)`}
                />

                {/* Main river */}
                <path
                  d={riverPath}
                  fill="url(#riverGrad)"
                  filter="url(#riverBlur)"
                  className="transition-all duration-500"
                />

                {/* Emoji markers */}
                {svgPoints.map((p, i) => (
                  <g key={i}>
                    {p.emoji && (
                      <text
                        x={p.x}
                        y={p.y - HALF_T - 16}
                        textAnchor="middle"
                        fontSize="22"
                        className="cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => router.push('/logs')}
                        style={{ cursor: 'pointer' }}
                      >
                        {p.emoji}
                      </text>
                    )}
                  </g>
                ))}

                {/* Day labels */}
                {svgPoints.map((p, i) => (
                  <text
                    key={`label-${i}`}
                    x={p.x}
                    y={VB_H - 16}
                    textAnchor="middle"
                    fontSize="13"
                    fill="#9CA3AF"
                    fontFamily="system-ui, sans-serif"
                  >
                    {p.label}
                  </text>
                ))}
              </svg>

              {/* Legend hint */}
              <div className="flex items-center justify-center gap-4 mt-2 text-xs" style={{ color: '#6B7280' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#FFB347' }} />
                  开心 · 活力
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#A78BFA' }} />
                  平静 · 满足
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#93C5FD' }} />
                  低落 · 焦虑
                </span>
              </div>
            </div>

            {/* ── Weekly summary sticky note ── */}
            <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 shadow-md rotate-[0.5deg] hover:rotate-0 transition-transform duration-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">📌</span>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-2 text-sm">本周总结</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{weeklySummary}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
