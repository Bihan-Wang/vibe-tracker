'use client';

import { useState } from 'react';
import { Mic, Smile, Calendar, BarChart3, Cloud, Sun } from 'lucide-react';
import VoiceRecorder from '@/components/VoiceRecorder';
import ImageUpload from '@/components/ImageUpload';
import { useMoodStore } from '@/store/moodStore';
import type { MoodAnalysisResult } from '@/utils/deepseek';

export default function Home() {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentAnalysis, setCurrentAnalysis] = useState<MoodAnalysisResult | null>(null);
  const addEntry = useMoodStore((state) => state.addEntry);

  const sampleLogs = [
    { id: 1, date: '2026-04-22', mood: 'Happy', content: 'Had a great meeting with the team today!' },
    { id: 2, date: '2026-04-21', mood: 'Calm', content: 'Meditated for 20 minutes, feeling peaceful.' },
    { id: 3, date: '2026-04-20', mood: 'Energetic', content: 'Morning workout gave me so much energy!' },
  ];

  const handleTranscript = (text: string) => {
    console.log('Transcript received:', text);
    setCurrentTranscript(text);
  };

  const handleAnalysisComplete = (analysis: MoodAnalysisResult) => {
    console.log('Analysis complete:', analysis);
    setCurrentAnalysis(analysis);

    // Save to mood store
    addEntry({
      date: new Date(),
      type: 'voice',
      content: currentTranscript || 'Voice recording',
      mood: analysis.mood,
      moodScore: analysis.moodScore, // Already 0-10 scale
      tags: analysis.tags || [],
      aiInsights: analysis.insights || `Detected emotions: ${(analysis.emotions || []).join(', ')}`,
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-purple-950 p-4 md:p-8">
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Smile className="text-yellow-500" />
              Vibe Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Automated mood journal with AI analysis
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-3 rounded-full glassmorphism hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
              <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button className="p-3 rounded-full glassmorphism hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
              <Cloud className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left column: Voice recorder, image upload and quick stats */}
          <div className="lg:col-span-2 space-y-6">
            <VoiceRecorder
              onTranscript={handleTranscript}
              onAnalysisComplete={handleAnalysisComplete}
            />

            <ImageUpload
              onAnalysisComplete={handleAnalysisComplete}
            />

            <div className="glassmorphism-light dark:glassmorphism-dark rounded-2xl p-6 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <BarChart3 className="text-purple-500" />
                Weekly Mood Trends
              </h2>
              <div className="h-48 flex items-end justify-between">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center">
                    <div
                      className="w-10 bg-gradient-to-t from-blue-400 to-purple-400 rounded-t-lg"
                      style={{ height: `${40 + (i * 15)}px` }}
                    />
                    <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Mood display and logs */}
          <div className="space-y-6">
            <div className="glassmorphism-colorful dark:glassmorphism-dark rounded-2xl p-6 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <Smile className="text-yellow-500" />
                {currentAnalysis ? 'Current Mood Analysis' : 'Current Mood'}
              </h2>

              {currentAnalysis ? (
                // Show real analysis results
                <div>
                  <div className="text-center py-6">
                    <div className="text-6xl mb-4">{getMoodEmoji(currentAnalysis.mood)}</div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{currentAnalysis.mood}</h3>
                    <div className="flex items-center justify-center mt-2">
                      <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mr-2">
                        Score: {currentAnalysis.moodScore.toFixed(1)}/10
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        (Confidence: {(currentAnalysis.confidence * 100).toFixed(0)}%)
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm">
                      {currentAnalysis.insights}
                    </p>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Detected Emotions</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {currentAnalysis.emotions && currentAnalysis.emotions.slice(0, 5).map((emotion: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                        >
                          {emotion}
                        </span>
                      ))}
                    </div>

                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentAnalysis.tags && currentAnalysis.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Show placeholder when no analysis yet
                <div className="text-center py-6">
                  <div className="text-6xl mb-4">😊</div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Happy</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    Based on your recent recordings
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                    Record your thoughts to see AI analysis here
                  </p>
                </div>
              )}
            </div>

            <div className="glassmorphism-strong dark:glassmorphism-dark rounded-2xl p-6 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                <Calendar className="text-pink-500" />
                Recent Logs
              </h2>
              <div className="space-y-4">
                {sampleLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-white/50 dark:bg-black/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-white">{log.mood}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{log.date}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{log.content}</p>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-3 glassmorphism hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover rounded-lg transition-all duration-300 text-gray-700 dark:text-gray-300">
                View All Logs
              </button>
            </div>
          </div>
        </div>

        <div className="glassmorphism-light dark:glassmorphism-dark rounded-2xl p-6 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">1. Record</h3>
              <p className="text-gray-600 dark:text-gray-300">Speak about your day using voice recording or upload an image to capture your mood visually.</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">2. AI Analysis</h3>
              <p className="text-gray-600 dark:text-gray-300">Our AI analyzes your emotion and generates insights.</p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">3. Track & Improve</h3>
              <p className="text-gray-600 dark:text-gray-300">Visualize your mood trends and get personalized tips.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>Vibe Tracker • Automated mood journal with AI • Built with Next.js & Tailwind CSS</p>
      </footer>
    </div>
  );
}