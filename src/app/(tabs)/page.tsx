'use client';

import { useState, useMemo } from 'react';
import { Mic, Image as ImageIcon, Loader2, X } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import ImageUpload from '@/components/ImageUpload';
import { useMoodStore } from '@/store/moodStore';
import type { MoodAnalysisResult } from '@/utils/deepseek';
import { translateTag } from '@/utils/translate';

type ViewMode = 'home' | 'voice' | 'image' | 'analyzing' | 'result';

export default function TodayPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [currentAnalysis, setCurrentAnalysis] = useState<MoodAnalysisResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const entries = useMoodStore((state) => state.entries);
  const streak = useMoodStore((state) => state.streak);
  const addEntry = useMoodStore((state) => state.addEntry);

  const totalEntries = entries.length;
  const avgMood = useMemo(() => {
    if (totalEntries === 0) return 0;
    const sum = entries.reduce((acc, e) => acc + e.moodScore, 0);
    return sum / totalEntries;
  }, [entries, totalEntries]);

  const handleVoiceRecordClick = () => {
    setViewMode('voice');
  };

  const handleImageUploadClick = () => {
    setViewMode('image');
  };

  const handleBackToHome = () => {
    setViewMode('home');
    setCurrentAnalysis(null);
    setCurrentTranscript('');
  };

  const handleTranscript = (text: string) => {
    console.log('Transcript received:', text);
    setCurrentTranscript(text);
  };

  const handleAnalysisComplete = (analysis: MoodAnalysisResult) => {
    console.log('Analysis complete:', analysis);
    setCurrentAnalysis(analysis);

    // Show analyzing screen briefly, then show result
    setViewMode('analyzing');

    // Simulate analysis time (2 seconds)
    setTimeout(() => {
      setViewMode('result');
    }, 2000);
  };

  const handleSaveEntry = () => {
    if (!currentAnalysis) return;

    // Save to mood store (tags translated to Chinese)
    addEntry({
      date: new Date(),
      type: viewMode === 'voice' ? 'voice' : 'image',
      content: viewMode === 'voice' ? currentTranscript : (currentAnalysis.insights || currentAnalysis.mood),
      mood: currentAnalysis.mood,
      moodScore: currentAnalysis.moodScore,
      tags: (currentAnalysis.tags || []).map(translateTag),
      aiInsights: currentAnalysis.insights,
    });

    // Return to home
    handleBackToHome();
  };

  // Helper function to get emoji for mood
  const getMoodEmoji = (mood: string) => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('happy') || moodLower.includes('joy')) return '😊';
    if (moodLower.includes('sad') || moodLower.includes('depressed')) return '😢';
    if (moodLower.includes('angry') || moodLower.includes('mad')) return '😠';
    if (moodLower.includes('calm') || moodLower.includes('peaceful')) return '😌';
    if (moodLower.includes('anxious') || moodLower.includes('worried')) return '😰';
    if (moodLower.includes('energetic') || moodLower.includes('active')) return '💪';
    if (moodLower.includes('tired') || moodLower.includes('exhausted')) return '😴';
    if (moodLower.includes('neutral')) return '😐';
    return '😊'; // Default
  };

  // Full-screen analyzing view
  if (viewMode === 'analyzing') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 flex flex-col items-center justify-center z-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Loader2 className="w-16 h-16 text-white animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">分析中</h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            AI正在分析您的情绪...
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            请稍候，这通常需要几秒钟
          </p>
        </div>
      </div>
    );
  }

  // Result view
  if (viewMode === 'result' && currentAnalysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 p-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">今日结果</h1>
              <p className="text-gray-600 dark:text-gray-300">情绪分析完成</p>
            </div>
            <button
              onClick={handleBackToHome}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Result card */}
          <div className="glassmorphism-colorful dark:glassmorphism-dark rounded-3xl p-8 mb-8">
            <div className="text-center">
              <div className="text-7xl mb-6">{getMoodEmoji(currentAnalysis.mood)}</div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {currentAnalysis.mood}
              </h2>
              <div className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-6">
                Score: {currentAnalysis.moodScore.toFixed(1)}/10
              </div>

              <div className="bg-white/50 dark:bg-black/30 rounded-2xl p-6 mb-6">
                <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                  {currentAnalysis.insights}
                </p>
              </div>

              {/* Tags */}
              {currentAnalysis.tags && currentAnalysis.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">情绪标签</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {currentAnalysis.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-800 dark:text-amber-200 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSaveEntry}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg"
              >
                保存记录
              </button>
            </div>
          </div>

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            保存后记录将添加到您的日志中
          </p>
        </div>
      </div>
    );
  }

  // Voice recording view
  if (viewMode === 'voice') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">语音记录</h1>
              <p className="text-gray-600 dark:text-gray-300">说出您今天的感受</p>
            </div>
            <button
              onClick={handleBackToHome}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Voice recorder */}
          <div className="glassmorphism-colorful dark:glassmorphism-dark rounded-3xl p-6">
            <VoiceRecorder
              onTranscript={handleTranscript}
              onAnalysisComplete={handleAnalysisComplete}
              compactMode={true}
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              点击麦克风按钮开始录音，说出您今天的感受
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Image upload view
  if (viewMode === 'image') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">上传图片</h1>
              <p className="text-gray-600 dark:text-gray-300">通过图片记录您的情绪</p>
            </div>
            <button
              onClick={handleBackToHome}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image upload */}
          <div className="glassmorphism-colorful dark:glassmorphism-dark rounded-3xl p-6">
            <ImageUpload
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              上传图片后，AI将分析图片中的情绪内容
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Home view (default) - two big buttons
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950 p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="text-center mb-12 pt-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-3">
            Vibe Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            自动化情绪日志
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            通过语音或图片记录，AI自动分析情绪
          </p>
        </header>

        {/* Two big buttons */}
        <div className="space-y-6">
          {/* Voice recording button */}
          <button
            onClick={handleVoiceRecordClick}
            className="w-full glassmorphism-colorful dark:glassmorphism-dark rounded-3xl p-8 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300 group"
          >
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                <Mic className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                🎙️ 语音记录
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                说出您今天的感受，AI将分析您的情绪
              </p>
            </div>
          </button>

          {/* Image upload button */}
          <button
            onClick={handleImageUploadClick}
            className="w-full glassmorphism-colorful dark:glassmorphism-dark rounded-3xl p-8 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300 group"
          >
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                <ImageIcon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                🖼️ 上传图片
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-center">
                上传图片，AI分析图片中的情绪内容
              </p>
            </div>
          </button>
        </div>

        {/* Stats summary (optional, can be removed) */}
        <div className="mt-12 glassmorphism dark:glassmorphism-dark rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{streak}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">连续记录</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{avgMood.toFixed(1)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">平均情绪</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalEntries}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">总记录</div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            选择一种方式开始记录您今天的情绪
          </p>
        </div>
      </div>
    </div>
  );
}