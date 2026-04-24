'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, Square, AlertCircle, CheckCircle, Volume2, Globe } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { generateWaveformData, estimateRecordingQuality, getBrowserSupportInfo, getAvailableLanguages } from '@/utils/speech';

interface Analysis {
  mood: string;
  moodScore: number;
  confidence: number;
  tags: string[];
  emotions: string[];
  insights: string;
  detectedKeywords: Array<{
    keyword: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
}

interface VoiceRecorderProps {
  onTranscript?: (text: string) => void;
  onAnalysisComplete?: (analysis: Analysis) => void;
  compactMode?: boolean;
}

export default function VoiceRecorder({ onTranscript, onAnalysisComplete, compactMode = false }: VoiceRecorderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  const [recordingQuality, setRecordingQuality] = useState<{ score: number; feedback: string[] } | null>(null);
  const [highlightUnsupported, setHighlightUnsupported] = useState(false);
  const [language, setLanguage] = useState('zh-CN');
  const availableLanguages = getAvailableLanguages();

  // Use ref for recording duration to avoid re-creating callbacks
  const recordingDurationRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    recordingDurationRef.current = recordingDuration;
  }, [recordingDuration]);

  const handleResult = useCallback(async (text: string, isFinal: boolean) => {
    console.log('Speech recognition result:', { text, isFinal });
    if (isFinal && text.trim()) {
      if (onTranscript) onTranscript(text);

      // Estimate recording quality - use only the final text
      const quality = estimateRecordingQuality(text, 0.7, recordingDurationRef.current);
      setRecordingQuality(quality);

      // Call real AI analysis API
      setIsProcessing(true);

      try {
        console.log('Calling mood analysis API for text:', text.substring(0, 100) + '...');

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Analysis failed');
        }

        console.log('AI analysis result:', result);

        if (onAnalysisComplete) onAnalysisComplete(result.analysis);
      } catch (error) {
        console.error('Failed to analyze mood:', error);

        // Fallback to simulated analysis if API fails
        const fallbackAnalysis: Analysis = {
          mood: getMoodFromTranscript(text),
          moodScore: 5 + Math.random() * 5,
          confidence: 0.6 + Math.random() * 0.3,
          tags: extractFactorsFromTranscript(text),
          emotions: extractEmotionsFromTranscript(text),
          insights: '感谢分享。由于技术问题，使用了备用分析。',
          detectedKeywords: extractFactorsFromTranscript(text).map(factor => ({
            keyword: factor,
            sentiment: (['work', 'social', 'fitness'].includes(factor) ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral'
          })),
        };

        if (onAnalysisComplete) onAnalysisComplete(fallbackAnalysis);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [onTranscript, onAnalysisComplete]);

  const handleError = useCallback((errorMsg: string) => {
    console.error('Speech recognition error:', errorMsg);
  }, []);

  const handleStart = useCallback(() => {
    console.log('Speech recognition started');
    setRecordingDuration(0);
    recordingDurationRef.current = 0;
    setRecordingQuality(null);
    setWaveformData(generateWaveformData());
  }, []);

  const handleEnd = useCallback(() => {
    console.log('Speech recognition ended');
    // Stop waveform animation
    setWaveformData([]);
  }, []);

  const {
    transcript,
    isRecording,
    isSupported,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
    browserSupport,
  } = useSpeechRecognition({
    language,
    continuous: true,
    interimResults: true,
    onResult: handleResult,
    onError: handleError,
    onStart: handleStart,
    onEnd: handleEnd,
  });

  // Update recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Update waveform data periodically
          if (newDuration % 2 === 0) {
            setWaveformData(generateWaveformData(10, 0.5 + Math.random() * 0.3));
          }
          return newDuration;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Check browser support on mount
  useEffect(() => {
    console.log('VoiceRecorder mounted', {
      isSupported,
      browserSupport,
      windowType: typeof window,
      webkitSpeechRecognition: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
      SpeechRecognition: typeof window !== 'undefined' && 'SpeechRecognition' in window
    });
    const supportInfo = getBrowserSupportInfo();
    console.log('Browser support info:', supportInfo);
    // Use setTimeout to avoid React warning about synchronous setState in effect
    setTimeout(() => {
      if (!supportInfo.isRecommended && supportInfo.isSupported) {
        setShowBrowserWarning(true);
      }
    }, 0);
  }, [browserSupport, isSupported]);

  const handleStartRecording = useCallback(async () => {
    console.log('handleStartRecording called', { isSupported, isRecording, isProcessing });

    if (!isSupported) {
      console.log('Browser does not support speech recognition');
      // Highlight the unsupported message
      setHighlightUnsupported(true);
      // Scroll to the message
      const messageElement = document.getElementById('unsupported-message');
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Reset highlight after 3 seconds
      setTimeout(() => setHighlightUnsupported(false), 3000);
      return;
    }

    console.log('Starting recording...');
    resetTranscript();
    startRecording();
  }, [isSupported, startRecording, resetTranscript, isRecording, isProcessing]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Test function to verify button clicks
  const handleTestClick = () => {
    console.log('Test button clicked!', {
      isSupported,
      isRecording,
      isProcessing,
      error,
      browserSupport
    });
    alert('Test button clicked! Check console for details.');
  };

  console.log('VoiceRecorder rendering', {
    isSupported,
    isRecording,
    isProcessing,
    error,
    browserSupport,
    language
  });

  // Compact mode for tab navigation
  if (compactMode) {
    return (
      <div className="glassmorphism-colorful dark:glassmorphism-dark rounded-3xl p-6">
        <div className="flex flex-col items-center justify-center">
          {/* Main recording button container */}
          <div className="relative mb-6">
            {/* Ripple rings (recording only) */}
            {isRecording && (
              <>
                <div className="ripple-ring" />
                <div className="ripple-ring" />
                <div className="ripple-ring" />
              </>
            )}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing || !isSupported}
              className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 ${
                isRecording
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  : isProcessing
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 opacity-50 cursor-not-allowed animate-shrink-away'
                    : !isSupported
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 animate-breathe'
              }`}
            >
              {isRecording ? (
                <Square className="w-16 h-16 text-white" />
              ) : isProcessing ? (
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : !isSupported ? (
                <AlertCircle className="w-16 h-16 text-white" />
              ) : (
                <Mic className="w-16 h-16 text-white" />
              )}
            </button>
          </div>

          {/* Status text */}
          <p className="text-lg text-gray-700 dark:text-gray-300 text-center mb-4">
            {isRecording
              ? '正在录音...请说出您的感受'
              : isProcessing
                ? '分析中...'
                : !isSupported
                  ? '语音识别不支持'
                  : '点击麦克风开始录音'}
          </p>

          {/* Recording duration */}
          {isRecording && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-medium text-red-600 dark:text-red-400">
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}

          {/* Simple transcript display */}
          {transcript && !isRecording && (
            <div className="mt-6 w-full">
              <div className="p-4 bg-white/50 dark:bg-black/30 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                  "{transcript}"
                </p>
              </div>
            </div>
          )}

          {/* Error display (simplified) */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-300 text-center">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full mode (original)
  return (
    <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-6 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
      {/* Browser compatibility warning */}
      {showBrowserWarning && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Browser Compatibility Note</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Speech recognition works best in Chrome or Edge. You may experience limited functionality in your current browser.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800 dark:text-red-300">Recording Error</h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
              >
                Try refreshing the page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browser not supported message */}
      {!isSupported && !error && (
        <div
          id="unsupported-message"
          className={`mb-6 p-4 rounded-xl transition-all duration-500 ${
            highlightUnsupported
              ? 'bg-yellow-100 dark:bg-yellow-900/50 border-2 border-yellow-400 dark:border-yellow-600 shadow-lg'
              : 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 mt-0.5 ${
              highlightUnsupported
                ? 'text-yellow-600 dark:text-yellow-400 animate-pulse'
                : 'text-gray-600 dark:text-gray-400'
            }`} />
            <div className="flex-1">
              <h4 className={`font-medium ${
                highlightUnsupported
                  ? 'text-yellow-800 dark:text-yellow-300'
                  : 'text-gray-800 dark:text-gray-300'
              }`}>
                Speech Recognition Not Supported
              </h4>
              <p className={`text-sm mt-1 ${
                highlightUnsupported
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-gray-700 dark:text-gray-400'
              }`}>
                Your browser doesn&apos;t support speech recognition. Please use Chrome, Edge, or Safari for voice recording.
                You can still use text input for mood logging.
              </p>
              {highlightUnsupported && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    💡 Tip: Try opening this page in Chrome or Edge for voice recording.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            {isRecording ? (
              <Mic className="text-red-500 animate-pulse" />
            ) : (
              <Mic className="text-amber-500" />
            )}
            语音记录
          </h3>
          <div className="flex items-center gap-4">
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {formatDuration(recordingDuration)}
                </span>
              </div>
            )}
            {isSupported && (
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Volume2 className="w-4 h-4" />
                <span>{browserSupport.browserName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Globe className="w-4 h-4" />
            <span>语言：</span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isRecording || isProcessing}
            className="flex-1 px-3 py-1.5 text-sm bg-white/50 dark:bg-black/30 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <p>
            💡 <span className="font-medium">提示：</span>语音识别支持多种语言。如果需要使用其他语言识别，可以在上方切换。
          </p>
        </div>
      </div>

      {/* Waveform visualization */}
      {isRecording && waveformData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-center h-16">
            <div className="flex items-end justify-center gap-1 h-full">
              {waveformData.map((value, index) => (
                <div
                  key={index}
                  className="w-2 bg-gradient-to-t from-amber-400 to-orange-400 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${value * 100}%`,
                    animation: `wave ${0.5 + index * 0.05}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>
          <style jsx>{`
            @keyframes wave {
              from { height: 30%; }
              to { height: 90%; }
            }
          `}</style>
        </div>
      )}

      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative mb-4">
          {/* Ripple rings (recording only) */}
          {isRecording && (
            <>
              <div className="ripple-ring" />
              <div className="ripple-ring" />
              <div className="ripple-ring" />
            </>
          )}
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 ${
              isRecording
                ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                : isProcessing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 opacity-50 cursor-not-allowed animate-shrink-away'
                  : !isSupported
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 animate-breathe'
            }`}
          >
            {isRecording ? (
              <Square className="w-12 h-12 text-white" />
            ) : isProcessing ? (
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : !isSupported ? (
              <AlertCircle className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </button>
        </div>

        <p className="mt-4 text-gray-600 dark:text-gray-300 text-center">
          {isRecording
            ? '正在录音，请说出您的感受...'
            : isProcessing
              ? '正在分析情绪...'
              : !isSupported
                ? '语音识别不可用'
                : '点击麦克风开始录音'}
        </p>

        {/* Test button for debugging */}
        <div className="mt-4 flex flex-col items-center gap-2 border-2 border-red-500 p-2 rounded-lg"> {/* 调试边框 */}
          <button
            onClick={handleTestClick}
            className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition border border-blue-300 dark:border-blue-700 font-medium"
          >
            🔧 测试点击（调试）
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
            先点击此按钮确认基本功能正常，再尝试使用麦克风按钮。
          </p>
        </div>

        {recordingDuration > 0 && !isRecording && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            录音时长 {formatDuration(recordingDuration)}
          </div>
        )}

        {/* Recording quality feedback */}
        {recordingQuality && (
          <div className="mt-6 w-full">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">录音质量</h4>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                  {recordingQuality.score.toFixed(1)}/10
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-green-400 to-blue-500"
                style={{ width: `${recordingQuality.score * 10}%` }}
              />
            </div>
            {recordingQuality.feedback.length > 0 && (
              <div className="mt-3 space-y-1">
                {recordingQuality.feedback.map((feedback, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
                    <span>{feedback}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transcript display */}
        {transcript && (
          <div className="mt-8 w-full">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">转录文本</h4>
              <button
                onClick={resetTranscript}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                清除
              </button>
            </div>
            <div className="p-4 bg-white/50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{transcript}</p>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {transcript.length} 字
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">录音提示：</h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
            <span>在安静的环境中，用自然的语速清晰地说话</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
            <span>录音30-60秒可以获得最准确的情绪分析</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
            <span>描述具体的事件以及它们带给您的感受</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
            <span>浏览器提示时请允许麦克风访问权限</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Helper functions for mood analysis (will be replaced with real AI in Phase 2)
function getMoodFromTranscript(transcript: string): string {
  const lowerText = transcript.toLowerCase();

  const moodKeywords: Record<string, string[]> = {
    'Happy': ['happy', 'great', 'awesome', 'amazing', 'excited', 'joy', 'love', 'wonderful', 'good', 'nice', 'fantastic'],
    'Content': ['content', 'satisfied', 'pleased', 'calm', 'peaceful', 'relaxed', 'serene'],
    'Energetic': ['energetic', 'active', 'motivated', 'productive', 'pumped', 'vibrant', 'alive'],
    'Calm': ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'meditation', 'quiet'],
    'Neutral': ['okay', 'fine', 'alright', 'normal', 'regular', 'usual'],
    'Tired': ['tired', 'exhausted', 'fatigued', 'sleepy', 'drained', 'burned out'],
    'Anxious': ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'overwhelmed'],
    'Sad': ['sad', 'unhappy', 'depressed', 'miserable', 'lonely', 'tear', 'cry'],
  };

  let maxMatches = 0;
  let detectedMood = 'Neutral';

  Object.entries(moodKeywords).forEach(([mood, keywords]) => {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedMood = mood;
    }
  });

  return detectedMood;
}

function extractFactorsFromTranscript(transcript: string): string[] {
  const lowerText = transcript.toLowerCase();
  const factors: string[] = [];

  // Common factors based on keywords
  if (lowerText.includes('work') || lowerText.includes('job') || lowerText.includes('office')) {
    factors.push('work');
  }
  if (lowerText.includes('family') || lowerText.includes('friend') || lowerText.includes('social')) {
    factors.push('social');
  }
  if (lowerText.includes('exercise') || lowerText.includes('workout') || lowerText.includes('gym')) {
    factors.push('fitness');
  }
  if (lowerText.includes('food') || lowerText.includes('eat') || lowerText.includes('meal')) {
    factors.push('food');
  }
  if (lowerText.includes('sleep') || lowerText.includes('rest') || lowerText.includes('bed')) {
    factors.push('sleep');
  }
  if (lowerText.includes('weather') || lowerText.includes('sun') || lowerText.includes('rain')) {
    factors.push('weather');
  }
  if (lowerText.includes('money') || lowerText.includes('finance') || lowerText.includes('budget')) {
    factors.push('finance');
  }
  if (lowerText.includes('health') || lowerText.includes('sick') || lowerText.includes('pain')) {
    factors.push('health');
  }

  // If no factors detected, add generic ones
  if (factors.length === 0) {
    factors.push('daily life', 'personal reflection');
  }

  return factors.slice(0, 4); // Return max 4 factors
}

function extractEmotionsFromTranscript(transcript: string): string[] {
  const lowerText = transcript.toLowerCase();
  const emotions: string[] = [];

  const emotionKeywords: Record<string, string[]> = {
    'joy': ['happy', 'joy', 'excited', 'delighted', 'pleased', 'glad'],
    'satisfaction': ['satisfied', 'content', 'fulfilled', 'accomplished', 'proud'],
    'calmness': ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil'],
    'energy': ['energetic', 'active', 'vibrant', 'lively', 'enthusiastic'],
    'love': ['love', 'affection', 'caring', 'fondness', 'attachment'],
    'gratitude': ['grateful', 'thankful', 'appreciative', 'blessed'],
    'hope': ['hopeful', 'optimistic', 'positive', 'expectant'],
    'anxiety': ['anxious', 'worried', 'nervous', 'tense', 'stressed'],
    'sadness': ['sad', 'unhappy', 'depressed', 'melancholy', 'blue'],
    'anger': ['angry', 'mad', 'frustrated', 'irritated', 'annoyed'],
    'tiredness': ['tired', 'exhausted', 'fatigued', 'weary', 'drained'],
    'confusion': ['confused', 'uncertain', 'unsure', 'puzzled'],
  };

  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    const hasEmotion = keywords.some(keyword => lowerText.includes(keyword));
    if (hasEmotion) {
      emotions.push(emotion);
    }
  });

  // If no emotions detected, add generic ones based on transcript length
  if (emotions.length === 0) {
    if (transcript.length < 50) {
      emotions.push('brief reflection');
    } else {
      emotions.push('detailed reflection', 'personal insight');
    }
  }

  return emotions.slice(0, 3); // Return max 3 emotions
}