'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, CheckCircle, Palette, Sun, Zap } from 'lucide-react';
import { useMoodStore } from '@/store/moodStore';
import type { MoodAnalysisResult } from '@/utils/deepseek';
import { analyzeImageFeatures, generateImageDescription, type ImageFeatures } from '@/utils/image-analysis';
import { translateTag } from '@/utils/translate';

interface ImageUploadProps {
  onAnalysisComplete?: (analysis: MoodAnalysisResult) => void;
  onUploadComplete?: (imageUrl: string) => void;
}

export default function ImageUpload({ onAnalysisComplete, onUploadComplete }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<MoodAnalysisResult | null>(null);
  const [imageFeatures, setImageFeatures] = useState<ImageFeatures | null>(null);
  const [isAnalyzingFeatures, setIsAnalyzingFeatures] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addEntry = useMoodStore((state) => state.addEntry);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('请选择图片文件 (JPEG, PNG, WebP, GIF)');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('图片大小不能超过5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setAnalysisResult(null);
    setImageFeatures(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Analyze image features in background
    setIsAnalyzingFeatures(true);
    try {
      const features = await analyzeImageFeatures(url, {
        maxColors: 5,
        sampleSize: 100,
        skipAdvanced: false,
      });
      setImageFeatures(features);
      console.log('Image features analyzed:', features);
    } catch (featureError) {
      console.warn('Failed to analyze image features:', featureError);
      // Don't show error to user, just continue without features
    } finally {
      setIsAnalyzingFeatures(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('image', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Upload image
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || '图片上传失败');
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(100);

      // Generate clean description (no technical info)
      const cleanDescription = uploadResult.description || '';
      const descriptionForApi = imageFeatures
        ? generateImageDescription(imageFeatures, uploadResult.description || '')
        : cleanDescription;

      // Analyze image (send image features for accurate analysis)
      const analyzeResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadResult.imageUrl,
          description: descriptionForApi,
          imageFeatures, // ← send client-side features for fallback
        }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || '图片分析失败');
      }

      const analyzeResult = await analyzeResponse.json();

      if (analyzeResult.success && analyzeResult.analysis) {
        const analysis = analyzeResult.analysis;
        setAnalysisResult(analysis);

        // Save to mood store (no technical info, tags translated to Chinese)
        addEntry({
          date: new Date(),
          type: 'image',
          content: analysis.insights || `${analysis.mood}`,
          mood: analysis.mood,
          moodScore: analysis.moodScore,
          tags: (analysis.tags || []).map(translateTag),
          imageUrl: uploadResult.imageUrl,
        });

        // Call callbacks
        if (onAnalysisComplete) onAnalysisComplete(analysis);
        if (onUploadComplete) onUploadComplete(uploadResult.imageUrl);
      } else {
        throw new Error('分析结果格式错误');
      }
    } catch (err) {
      console.error('Upload/Analysis error:', err);
      setError(err instanceof Error ? err.message : '上传或分析失败');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, imageFeatures, addEntry, onAnalysisComplete, onUploadComplete]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setImageFeatures(null);
    setError(null);
    setUploadProgress(0);
    setIsAnalyzingFeatures(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="glassmorphism dark:glassmorphism-dark rounded-2xl p-6 hover:glassmorphism-hover dark:hover:glassmorphism-dark-hover transition-all duration-300">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-6">
        <ImageIcon className="text-amber-500" />
        图片情绪分析
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <X className="w-5 h-5" />
            <span className="font-medium">错误: {error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
          >
            关闭
          </button>
        </div>
      )}

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Upload className="w-10 h-10 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                拖放图片到这里
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                或点击选择图片文件
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                支持 JPEG, PNG, WebP, GIF (最大 5MB)
              </p>
            </div>
            <button
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              选择图片
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview and controls */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl || ''}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  重新选择
                </button>
              </div>
            </div>

            {/* Upload and analysis status */}
            <div className="flex-1">
              {isUploading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white">
                        上传并分析中...
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        正在处理您的图片
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-right">
                      {uploadProgress}%
                    </p>
                  </div>
                </div>
              ) : analysisResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-6 h-6" />
                    <h4 className="font-medium">分析完成</h4>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">
                        {analysisResult.mood === 'Happy' && '😊'}
                        {analysisResult.mood === 'Sad' && '😢'}
                        {analysisResult.mood === 'Angry' && '😠'}
                        {analysisResult.mood === 'Calm' && '😌'}
                        {analysisResult.mood === 'Anxious' && '😰'}
                        {analysisResult.mood === 'Energetic' && '💪'}
                        {analysisResult.mood === 'Tired' && '😴'}
                        {analysisResult.mood === 'Neutral' && '😐'}
                      </span>
                      <div>
                        <h5 className="font-semibold text-gray-800 dark:text-white">
                          {analysisResult.mood}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          情绪评分: {analysisResult.moodScore.toFixed(1)}/10
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {analysisResult.insights}
                    </p>
                    {analysisResult.tags && analysisResult.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {analysisResult.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Image Features Visualization */}
                  {imageFeatures && (
                    <div className="mt-4 p-4 glassmorphism dark:glassmorphism-dark rounded-xl">
                      <h5 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-pink-500" />
                        图片视觉特征分析
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">主色调</span>
                            <div className="flex items-center gap-1">
                              {imageFeatures.dominantColors.slice(0, 3).map((color, index) => (
                                <div
                                  key={index}
                                  className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-700"
                                  style={{ backgroundColor: color.hex }}
                                  title={`${color.hex} (${Math.round(color.percentage * 100)}%)`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">亮度</span>
                            <div className="flex items-center gap-1">
                              <Sun className="w-3 h-3 text-yellow-500" />
                              <span className="text-sm font-medium">
                                {Math.round(imageFeatures.brightness * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">饱和度</span>
                            <span className="text-sm font-medium">
                              {Math.round(imageFeatures.saturation * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">对比度</span>
                            <span className="text-sm font-medium">
                              {Math.round(imageFeatures.contrast * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">暖色比例</span>
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                              style={{ width: `${Math.round(imageFeatures.warmColorRatio * 100)}%` }}
                            />
                          </div>
                          <span className="font-medium w-8 text-right">
                            {Math.round(imageFeatures.warmColorRatio * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-gray-600 dark:text-gray-400">冷色比例</span>
                          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
                              style={{ width: `${Math.round(imageFeatures.coolColorRatio * 100)}%` }}
                            />
                          </div>
                          <span className="font-medium w-8 text-right">
                            {Math.round(imageFeatures.coolColorRatio * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          基于视觉特征预测: {imageFeatures.predictedMood} ({Math.round(imageFeatures.moodConfidence * 100)}% 置信度)
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleReset}
                    className="w-full py-3 glassmorphism dark:glassmorphism-dark rounded-lg hover:glassmorphism-dark transition text-gray-700 dark:text-gray-300"
                  >
                    分析另一张图片
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    准备分析图片情绪
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    点击下方按钮上传并分析图片中的情绪内容。AI将分析图片的色彩、构图和内容来评估情绪状态。
                  </p>

                  {/* Feature analysis status */}
                  {isAnalyzingFeatures && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          正在分析图片视觉特征...
                        </span>
                      </div>
                    </div>
                  )}

                  {imageFeatures && !isAnalyzingFeatures && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            视觉特征分析完成
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {imageFeatures.dominantColors.slice(0, 2).map((color, index) => (
                            <div
                              key={index}
                              className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-700"
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        检测到: {imageFeatures.predictedMood} 情绪 ({Math.round(imageFeatures.brightness * 100)}% 亮度)
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={isUploading || isAnalyzingFeatures}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzingFeatures ? '分析特征中...' : '上传并分析'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <h5 className="font-medium text-gray-800 dark:text-white mb-3">
              图片情绪分析原理
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white/50 dark:bg-black/30 rounded-lg">
                <div className="text-sm font-medium text-gray-800 dark:text-white mb-1">
                  1. 视觉特征分析
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  分析色彩饱和度、亮度、对比度等视觉特征
                </div>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/30 rounded-lg">
                <div className="text-sm font-medium text-gray-800 dark:text-white mb-1">
                  2. 内容识别
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  识别场景、物体、人物表情等元素
                </div>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/30 rounded-lg">
                <div className="text-sm font-medium text-gray-800 dark:text-white mb-1">
                  3. 情绪映射
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  将视觉特征映射到情绪状态并提供建议
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback text input for when image analysis fails */}
      {error && !selectedFile && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            或者，您可以描述图片内容进行文字分析：
          </p>
          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            placeholder="描述图片内容..."
            rows={3}
          />
          <button className="mt-3 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition">
            文字分析
          </button>
        </div>
      )}
    </div>
  );
}