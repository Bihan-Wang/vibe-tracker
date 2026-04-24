'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error?: string;
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
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
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

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  resetTranscript: () => void;
  browserSupport: {
    hasSupport: boolean;
    browserName: string;
    isWebkit: boolean;
  };
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);

  // Check browser support
  const isSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const browserSupport = {
    hasSupport: isSupported,
    browserName: getBrowserName(),
    isWebkit: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
  };

  // Initialize speech recognition
  useEffect(() => {
    console.log('useSpeechRecognition useEffect running', {
      isSupported,
      language,
      isRecording,
      continuous,
      interimResults
    });

    // Don't reinitialize if already recording
    if (isRecordingRef.current) {
      console.log('Already recording, skipping reinitialization');
      return;
    }

    if (!isSupported) {
      console.log('Speech recognition not supported, skipping initialization');
      // Use setTimeout to avoid React warning about synchronous setState in effect
      setTimeout(() => {
        setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      }, 0);
      return;
    }

    try {
      // Extend Window interface to include speech recognition APIs
      interface WindowWithSpeechRecognition extends Window {
        webkitSpeechRecognition?: new () => SpeechRecognition;
        SpeechRecognition?: new () => SpeechRecognition;
      }

      const SpeechRecognitionConstructor = (window as WindowWithSpeechRecognition).webkitSpeechRecognition ||
                                         (window as WindowWithSpeechRecognition).SpeechRecognition;
      console.log('SpeechRecognition constructor found:', SpeechRecognitionConstructor);
      if (!SpeechRecognitionConstructor) {
        throw new Error('SpeechRecognition constructor not found');
      }
      const recognition = new SpeechRecognitionConstructor();
      console.log('SpeechRecognition instance created:', recognition);

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = maxAlternatives;

      recognition.onstart = () => {
        console.log('SpeechRecognition onstart event');
        setIsRecording(true);
        isRecordingRef.current = true;
        setError(null);
        if (onStart) onStart();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('SpeechRecognition onresult event:', event.results.length, 'results');
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the final transcript
        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript + ' ';
          setTranscript(finalTranscriptRef.current.trim());
          if (onResult) onResult(finalTranscript, true);
        }

        // Update with interim results
        if (interimTranscript) {
          const currentTranscript = finalTranscriptRef.current + interimTranscript;
          setTranscript(currentTranscript.trim());
          if (onResult) onResult(interimTranscript, false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('SpeechRecognition onerror event:', {
          error: event.error,
          message: event.message,
          timestamp: new Date().toISOString(),
          isRecording: isRecordingRef.current,
          transcript: finalTranscriptRef.current
        });
        setIsRecording(false);
        isRecordingRef.current = false;

        // Clear the recognition instance on error so it will be reinitialized next time
        recognitionRef.current = null;

        let errorMessage = 'Speech recognition error';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech was detected. Please try speaking immediately after starting recording.';
        } else if (event.error === 'audio-capture') {
          errorMessage = 'No microphone was found. Please ensure a microphone is connected and working.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'network') {
          errorMessage = 'Network error occurred. Please check your internet connection.';
        } else if (event.error === 'aborted') {
          errorMessage = 'Speech recognition stopped automatically. Please click the microphone button again and speak immediately.';
        } else if (event.error === 'service-not-allowed') {
          errorMessage = 'Speech recognition service is not allowed.';
        }

        console.error('Speech recognition error details:', {
          errorMessage,
          originalError: event.error,
          originalMessage: event.message
        });
        setError(errorMessage);
        if (onError) onError(errorMessage);
      };

      recognition.onend = () => {
        console.log('SpeechRecognition onend event');
        setIsRecording(false);
        isRecordingRef.current = false;
        if (onEnd) onEnd();
      };

      recognitionRef.current = recognition;
      console.log('Speech recognition initialized successfully');
    } catch (err) {
      // Use setTimeout to avoid React warning about synchronous setState in effect
      setTimeout(() => {
        setError(`Failed to initialize speech recognition: ${err}`);
      }, 0);
      console.error('Speech recognition initialization error:', err);
    }

    return () => {
      console.log('useSpeechRecognition cleanup', { isRecording: isRecordingRef.current });
      if (recognitionRef.current) {
        try {
          console.log('Stopping recognition during cleanup');
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
          console.log('Cleanup stop error (ignored):', e);
        }
      }
    };
  }, [isSupported, continuous, interimResults, language, maxAlternatives, onResult, onError, onStart, onEnd]);

  const startRecording = useCallback(() => {
    console.log('startRecording called in hook', {
      isSupported,
      recognitionRef: recognitionRef.current,
      isRecording: isRecordingRef.current,
      error,
      timestamp: new Date().toISOString(),
      browserSupport,
      windowSpeechAPI: typeof window !== 'undefined' ? {
        webkitSpeechRecognition: 'webkitSpeechRecognition' in window,
        SpeechRecognition: 'SpeechRecognition' in window
      } : 'window undefined'
    });

    if (!isSupported) {
      console.log('Speech recognition not supported');
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    if (!recognitionRef.current) {
      console.log('Speech recognition not initialized - attempting to initialize now');
      // Try to initialize on the fly
      try {
        const SpeechRecognitionConstructor = (window as any).webkitSpeechRecognition ||
                                           (window as any).SpeechRecognition;
        if (SpeechRecognitionConstructor) {
          const recognition = new SpeechRecognitionConstructor();
          recognition.continuous = continuous;
          recognition.interimResults = interimResults;
          recognition.lang = language;
          recognition.maxAlternatives = maxAlternatives;

          // Set up event handlers
          recognition.onstart = () => {
            console.log('SpeechRecognition onstart event (late initialization)');
            setIsRecording(true);
            isRecordingRef.current = true;
            setError(null);
            if (onStart) onStart();
          };

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            console.log('SpeechRecognition onresult event (late initialization):', event.results.length, 'results');
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i];
              const transcript = result[0].transcript;

              if (result.isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }

            // Update the final transcript
            if (finalTranscript) {
              finalTranscriptRef.current += finalTranscript + ' ';
              setTranscript(finalTranscriptRef.current.trim());
              if (onResult) onResult(finalTranscript, true);
            }

            // Update with interim results
            if (interimTranscript) {
              const currentTranscript = finalTranscriptRef.current + interimTranscript;
              setTranscript(currentTranscript.trim());
              if (onResult) onResult(interimTranscript, false);
            }
          };

          recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('SpeechRecognition onerror event (late initialization):', {
              error: event.error,
              message: event.message,
              timestamp: new Date().toISOString(),
              isRecording: isRecordingRef.current,
              transcript: finalTranscriptRef.current
            });
            setIsRecording(false);
            isRecordingRef.current = false;

            // Clear the recognition instance on error so it will be reinitialized next time
            recognitionRef.current = null;

            let errorMessage = 'Speech recognition error';
            if (event.error === 'no-speech') {
              errorMessage = 'No speech was detected. Please try speaking immediately after starting recording.';
            } else if (event.error === 'audio-capture') {
              errorMessage = 'No microphone was found. Please ensure a microphone is connected and working.';
            } else if (event.error === 'not-allowed') {
              errorMessage = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
            } else if (event.error === 'network') {
              errorMessage = 'Network error occurred. Please check your internet connection.';
            } else if (event.error === 'aborted') {
              errorMessage = 'Speech recognition stopped automatically. Please click the microphone button again and speak immediately.';
            } else if (event.error === 'service-not-allowed') {
              errorMessage = 'Speech recognition service is not allowed.';
            }

            console.error('Speech recognition error details:', {
              errorMessage,
              originalError: event.error,
              originalMessage: event.message
            });
            setError(errorMessage);
            if (onError) onError(errorMessage);
          };

          recognition.onend = () => {
            console.log('SpeechRecognition onend event (late initialization)');
            setIsRecording(false);
            isRecordingRef.current = false;
            if (onEnd) onEnd();
          };

          recognitionRef.current = recognition;
          console.log('Speech recognition initialized on the fly');
        } else {
          console.log('SpeechRecognition constructor not found even after retry');
          setError('Speech recognition is not properly initialized.');
          return;
        }
      } catch (err) {
        console.error('Failed to initialize speech recognition on the fly:', err);
        setError(`Failed to initialize speech recognition: ${err}`);
        return;
      }
    }

    // Check if already recording - use ref for reliable check
    if (isRecordingRef.current) {
      console.log('Already recording, stopping current recording first');
      try {
        // Stop current recording
        recognitionRef.current!.stop();
        // Don't restart automatically - let user click again to start fresh
        console.log('Stopped current recording. Click again to start fresh.');
        return;
      } catch (e) {
        console.log('Error stopping previous recording:', e);
        // Continue and try to start new recording anyway
      }
    }

    try {
      console.log('Starting speech recognition...');
      setError(null);
      finalTranscriptRef.current = '';
      setTranscript('');

      recognitionRef.current!.start();
      console.log('Speech recognition started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(`Failed to start recording: ${err}`);
    }
  }, [isSupported, error, continuous, interimResults, language, maxAlternatives, onStart, onResult, onError, onEnd]);

  const stopRecording = useCallback(() => {
    console.log('stopRecording called', {
      recognitionRef: recognitionRef.current,
      isRecording: isRecordingRef.current
    });

    if (!recognitionRef.current) {
      console.log('No recognition instance to stop');
      return;
    }

    try {
      console.log('Stopping speech recognition...');
      recognitionRef.current.stop();
      console.log('Speech recognition stopped successfully');
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    transcript,
    isRecording,
    isSupported,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
    browserSupport,
  };
}

// Helper function to detect browser name
function getBrowserName(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  return 'Unknown';
}