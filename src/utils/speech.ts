/**
 * Speech recognition utilities for Vibe Tracker
 */

// Check if speech recognition is supported in the current browser
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'webkitSpeechRecognition' in window ||
    'SpeechRecognition' in window
  );
}

// Declare SpeechRecognition interface for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Get the appropriate SpeechRecognition constructor for the current browser
export function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;

  if ('webkitSpeechRecognition' in window) {
    return window.webkitSpeechRecognition!;
  }

  if ('SpeechRecognition' in window) {
    return window.SpeechRecognition!;
  }

  return null;
}

// Check if the browser is likely to support speech recognition well
export function getBrowserSupportInfo(): {
  isSupported: boolean;
  browserName: string;
  isRecommended: boolean;
  message: string;
} {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      browserName: 'Unknown',
      isRecommended: false,
      message: 'Cannot detect browser in server environment',
    };
  }

  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let isRecommended = false;
  let message = '';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
    isRecommended = true;
    message = 'Chrome has excellent speech recognition support';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    isRecommended = true;
    message = 'Edge has good speech recognition support';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    isRecommended = true;
    message = 'Safari has speech recognition support';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    isRecommended = false;
    message = 'Firefox has limited speech recognition support';
  } else {
    browserName = 'Other';
    isRecommended = false;
    message = 'Speech recognition may not be supported';
  }

  const isSupported = isSpeechRecognitionSupported();

  return {
    isSupported,
    browserName,
    isRecommended,
    message: isSupported ? message : 'Speech recognition is not supported in this browser',
  };
}

// Request microphone permission
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Stop all tracks to release the microphone
    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error) {
    console.error('Microphone permission error:', error);
    return false;
  }
}

// Get available languages for speech recognition
export function getAvailableLanguages(): Array<{ code: string; name: string }> {
  return [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
  ];
}

// Format speech recognition error messages
export function formatSpeechError(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'no-speech': 'No speech was detected. Please try speaking louder or check your microphone.',
    'audio-capture': 'No microphone was found. Please ensure a microphone is connected and working.',
    'not-allowed': 'Microphone access was denied. Please allow microphone permissions in your browser settings.',
    'network': 'Network error occurred. Please check your internet connection.',
    'aborted': 'Speech recognition was aborted.',
    'service-not-allowed': 'Speech recognition service is not allowed.',
    'bad-grammar': 'Speech grammar error.',
    'language-not-supported': 'The selected language is not supported.',
  };

  return errorMessages[errorCode] || 'An unknown error occurred during speech recognition.';
}

// Calculate speaking confidence level
export function calculateConfidenceLevel(confidence: number): {
  level: 'low' | 'medium' | 'high';
  label: string;
  color: string;
} {
  if (confidence >= 0.8) {
    return { level: 'high', label: 'High confidence', color: 'text-green-500' };
  } else if (confidence >= 0.5) {
    return { level: 'medium', label: 'Medium confidence', color: 'text-yellow-500' };
  } else {
    return { level: 'low', label: 'Low confidence', color: 'text-red-500' };
  }
}

// Generate a waveform visualization data for audio recording
export function generateWaveformData(dataPoints: number = 20, intensity: number = 0.7): number[] {
  const waveform: number[] = [];

  for (let i = 0; i < dataPoints; i++) {
    // Generate random wave-like pattern
    const time = (i / dataPoints) * Math.PI * 4;
    const base = Math.sin(time) * 0.3;
    const random = (Math.random() - 0.5) * 0.4;
    const value = Math.max(0.1, Math.min(0.9, base + random + intensity * 0.3));
    waveform.push(value);
  }

  return waveform;
}

// Estimate recording quality based on transcript and confidence
export function estimateRecordingQuality(
  transcript: string,
  confidence: number,
  duration: number
): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (transcript.length < 10) {
    feedback.push('Recording is very short. Try speaking for at least 30 seconds.');
    score -= 2;
  } else if (transcript.length < 50) {
    feedback.push('Recording could be longer for better analysis.');
    score -= 1;
  } else {
    feedback.push('Good recording length.');
    score += 1;
  }

  // Confidence check
  if (confidence < 0.3) {
    feedback.push('Low confidence in transcription. Try speaking more clearly.');
    score -= 2;
  } else if (confidence < 0.6) {
    feedback.push('Moderate transcription confidence.');
    score += 0;
  } else {
    feedback.push('High transcription confidence.');
    score += 2;
  }

  // Duration check (if available)
  if (duration > 0) {
    if (duration < 5) {
      feedback.push('Very short recording. Speak for longer periods.');
      score -= 1;
    } else if (duration > 60) {
      feedback.push('Long recording. Consider breaking into shorter segments.');
      score += 1;
    } else {
      feedback.push('Good recording duration.');
      score += 1;
    }
  }

  // Word variety check (simple)
  const words = transcript.split(' ').filter(word => word.length > 0);
  const uniqueWords = new Set(words.map(word => word.toLowerCase()));
  const varietyRatio = uniqueWords.size / Math.max(1, words.length);

  if (varietyRatio < 0.3) {
    feedback.push('Low word variety. Try describing different aspects of your day.');
    score -= 1;
  } else if (varietyRatio > 0.7) {
    feedback.push('Good word variety in your recording.');
    score += 1;
  }

  // Normalize score to 0-10 range
  const normalizedScore = Math.max(0, Math.min(10, 5 + score));

  return {
    score: normalizedScore,
    feedback,
  };
}