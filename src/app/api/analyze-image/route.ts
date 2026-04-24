import { NextRequest, NextResponse } from 'next/server';
import type { MoodAnalysisResult } from '@/utils/deepseek';
import type { ImageFeatures } from '@/utils/image-analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, description = '', imageFeatures } = body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: '图片URL不能为空' },
        { status: 400 }
      );
    }

    console.log('Received image analysis request:', { imageUrl, description });

    let analysis: MoodAnalysisResult;
    let model = 'client-features-v1';
    let fallback = false;

    // Use feature-based analysis directly (more reliable than DeepSeek for images)
    if (imageFeatures) {
      console.log('Using client-side image features for analysis');
      analysis = analyzeWithImageFeatures(imageFeatures, description);
    } else {
      console.log('No image features available, using text-only analysis');
      analysis = analyzeWithTextOnly(description, imageUrl);
      fallback = true;
    }

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
      model,
      fallback,
    });
  } catch (error) {
    console.error('Image analysis error:', error);

    return NextResponse.json(
      {
        error: '图片分析失败',
        details: error instanceof Error ? error.message : '未知错误',
        fallback: true,
      },
      { status: 500 }
    );
  }
}

// Analyze image using client-side image features (reliable, no API dependency)
function analyzeWithImageFeatures(
  features: ImageFeatures,
  description: string
): MoodAnalysisResult {
  console.log('Analyzing with image features');

  // Use the predicted mood from features as base
  let primaryMood = features.predictedMood.toLowerCase();
  const moodConfidence = features.moodConfidence;

  // Adjust based on description keywords if available
  if (description) {
    const lowerDesc = description.toLowerCase();
    const moodKeywords: Record<string, string[]> = {
      happy: ['happy', 'joy', 'smile', 'sunny', 'bright', 'colorful', 'celebration', '开心', '快乐', '高兴', '愉快'],
      sad: ['sad', 'rain', 'gray', 'lonely', 'empty', 'dark', '悲伤', '难过', '伤心', '忧郁'],
      calm: ['calm', 'peaceful', 'serene', 'nature', 'water', 'sky', '平静', '宁静', '放松', '安静'],
      energetic: ['energetic', 'active', 'sports', 'dance', 'movement', 'vibrant', '活力', '活跃', '兴奋', '激动'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', '焦虑', '紧张', '担心'],
      tired: ['tired', 'exhausted', 'fatigued', 'sleepy', 'drained', '累', '疲劳', '疲倦', '困倦'],
    };

    let textMood = primaryMood;
    let maxScore = 0;

    Object.entries(moodKeywords).forEach(([mood, keywords]) => {
      const matches = keywords.filter(keyword => lowerDesc.includes(keyword)).length;
      if (matches > maxScore) {
        maxScore = matches;
        textMood = mood;
      }
    });

    if (maxScore >= 2 && textMood !== primaryMood) {
      const random = Math.random();
      if (random < 0.3) {
        primaryMood = textMood;
        console.log('Adjusted mood based on text description:', textMood);
      }
    }
  }

  // Calculate mood score based on features
  let moodScore = 5;
  if (primaryMood === 'happy') {
    moodScore = 6 + features.brightness * 2 + features.saturation * 2;
  } else if (primaryMood === 'energetic') {
    moodScore = 5 + features.contrast * 3 + features.saturation * 2;
  } else if (primaryMood === 'calm') {
    moodScore = 5 + (1 - features.contrast) * 2 + features.coolColorRatio * 2;
  } else if (primaryMood === 'sad') {
    moodScore = 3 + (1 - features.brightness) * 3 + features.darkColorRatio * 2;
  } else if (primaryMood === 'anxious') {
    moodScore = 4 + features.contrast * 2 + (1 - features.warmColorRatio) * 2;
  } else {
    moodScore = 4 + features.brightness * 1.5;
  }
  moodScore = Math.max(1, Math.min(10, moodScore));

  // Calculate confidence
  let confidence = moodConfidence;
  if (primaryMood === 'happy' && features.warmColorRatio > 0.5 && features.brightness > 0.7) {
    confidence = Math.min(0.95, confidence + 0.2);
  } else if (primaryMood === 'calm' && features.coolColorRatio > 0.5 && features.contrast < 0.4) {
    confidence = Math.min(0.95, confidence + 0.15);
  } else if (primaryMood === 'sad' && features.darkColorRatio > 0.4 && features.brightness < 0.4) {
    confidence = Math.min(0.95, confidence + 0.15);
  }

  // Generate tags
  const tags: string[] = [];
  if (features.warmColorRatio > 0.5) tags.push('warm', 'vibrant');
  if (features.coolColorRatio > 0.5) tags.push('cool', 'serene');
  if (features.brightness > 0.7) tags.push('bright', 'luminous');
  if (features.brightness < 0.3) tags.push('dark', 'moody');
  if (features.saturation > 0.6) tags.push('saturated', 'colorful');
  if (features.saturation < 0.3) tags.push('desaturated', 'subtle');
  if (features.contrast > 0.6) tags.push('high-contrast', 'dramatic');

  if (description.includes('自然') || description.includes('风景')) tags.push('nature', 'landscape');
  if (description.includes('城市') || description.includes('建筑')) tags.push('urban', 'architecture');
  if (description.includes('人物') || description.includes('人')) tags.push('people', 'portrait');
  if (description.includes('食物') || description.includes('吃')) tags.push('food', 'culinary');
  if (description.includes('动物') || description.includes('宠物')) tags.push('animals', 'pets');

  if (primaryMood === 'happy') tags.push('positive', 'joyful');
  if (primaryMood === 'calm') tags.push('peaceful', 'relaxing');
  if (primaryMood === 'energetic') tags.push('dynamic', 'active');
  if (primaryMood === 'sad') tags.push('melancholy', 'emotional');
  if (primaryMood === 'anxious') tags.push('tense', 'uneasy');

  const uniqueTags = [...new Set(tags)].slice(0, 8);

  // Generate insights
  const brightnessDesc = features.brightness > 0.7 ? '明亮' : features.brightness < 0.3 ? '较暗' : '柔和';
  const saturationDesc = features.saturation > 0.6 ? '鲜艳' : features.saturation < 0.3 ? '素雅' : '自然';
  const colorDesc = features.warmColorRatio > features.coolColorRatio ? '暖色调为主' : '冷色调为主';

  let insights = '';
  if (primaryMood === 'happy') {
    insights = `这张${brightnessDesc}的图片以${colorDesc}传递出积极愉悦的情绪。${saturationDesc}的色彩让人感到温暖舒适。`;
  } else if (primaryMood === 'calm') {
    insights = `画面${brightnessDesc}，${colorDesc}营造出宁静平和的氛围。很适合放松心情的时刻。`;
  } else if (primaryMood === 'energetic') {
    insights = `充满活力的画面！${colorDesc}配合${saturationDesc}的色彩，传递出积极向上的能量感。`;
  } else if (primaryMood === 'sad') {
    insights = `图片${brightnessDesc}、${colorDesc}，传达出深沉内敛的情绪氛围。每种情绪都有它的意义。`;
  } else {
    insights = `视觉记录已保存。图片${brightnessDesc}、${colorDesc}，整体氛围${saturationDesc}。`;
  }

  if (description) {
    insights += ` 感谢分享这张图片。`;
  }
  insights += ' 持续记录，发现更多情绪的美好。';

  // Emotions
  const emotions = [primaryMood];
  if (features.warmColorRatio > 0.3) emotions.push('warm');
  if (features.coolColorRatio > 0.3) emotions.push('cool');
  if (features.brightness > 0.7) emotions.push('bright');
  if (features.brightness < 0.3) emotions.push('dark');

  const detectedKeywords = [
    { keyword: primaryMood, sentiment: getSentimentForMood(primaryMood) },
    { keyword: 'visual', sentiment: 'neutral' as const },
  ];

  return {
    mood: primaryMood.charAt(0).toUpperCase() + primaryMood.slice(1),
    moodScore: parseFloat(moodScore.toFixed(1)),
    confidence: parseFloat(confidence.toFixed(2)),
    tags: uniqueTags,
    emotions,
    insights,
    detectedKeywords,
  };
}

// Fallback text-only analysis (when no features available)
function analyzeWithTextOnly(description: string, imageUrl: string): MoodAnalysisResult {
  console.log('Analyzing with text only');
  const analysisText = description || '用户上传的图片';
  const lowerText = analysisText.toLowerCase();

  // Simple keyword matching
  const moodKeywords = {
    happy: ['happy', 'joy', 'smile', 'sunny', 'bright', 'colorful', 'celebration', '开心', '快乐', '高兴'],
    sad: ['sad', 'rain', 'gray', 'lonely', 'empty', 'dark', '悲伤', '难过'],
    calm: ['calm', 'peaceful', 'serene', 'nature', 'water', 'sky', '平静', '宁静'],
    energetic: ['energetic', 'active', 'sports', 'dance', 'movement', 'vibrant', '活力', '活跃'],
    neutral: ['neutral', 'document', 'object', 'product', '中性', '普通'],
  };

  const scores: Record<string, number> = {};
  Object.entries(moodKeywords).forEach(([mood, keywords]) => {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    scores[mood] = matches * 0.2;
  });

  // Determine primary mood
  let primaryMood = 'neutral';
  let highestScore = 0;

  Object.entries(scores).forEach(([mood, score]) => {
    if (score > highestScore) {
      highestScore = score;
      primaryMood = mood;
    }
  });

  // If no strong keywords, analyze based on image URL or default
  if (highestScore < 0.2) {
    if (imageUrl.includes('nature') || imageUrl.includes('landscape')) {
      primaryMood = 'calm';
    } else if (imageUrl.includes('party') || imageUrl.includes('celebration')) {
      primaryMood = 'happy';
    } else if (imageUrl.includes('sports') || imageUrl.includes('fitness')) {
      primaryMood = 'energetic';
    }
  }

  // Calculate confidence and score
  const confidence = Math.min(0.4 + highestScore * 0.3, 0.9);
  const moodScoreMap: Record<string, number> = {
    happy: 7 + Math.random() * 2,
    energetic: 7 + Math.random() * 2,
    calm: 6 + Math.random() * 2,
    neutral: 5 + Math.random() * 2,
    sad: 3 + Math.random() * 2,
  };

  const moodScore = moodScoreMap[primaryMood] || 5;

  // Extract tags
  const tags = [];
  if (description.includes('自然') || description.includes('风景')) tags.push('nature');
  if (description.includes('城市') || description.includes('建筑')) tags.push('urban');
  if (description.includes('人物') || description.includes('人')) tags.push('people');
  if (description.includes('食物') || description.includes('吃')) tags.push('food');
  if (description.includes('动物') || description.includes('宠物')) tags.push('animals');

  if (primaryMood === 'happy') tags.push('bright', 'positive');
  if (primaryMood === 'calm') tags.push('serene', 'peaceful');
  if (primaryMood === 'energetic') tags.push('active', 'dynamic');

  // Generate insights
  const insightsMap: Record<string, string> = {
    happy: '图片传达出积极的情绪！明亮的色彩和欢快的场景有助于提升心情。',
    calm: '平静的视觉元素有助于放松心情，适合作为冥想或休息的背景。',
    energetic: '充满活力的画面！这样的图片能激发动力和创造力。',
    neutral: '中性的视觉内容，适合作为日常记录。',
    sad: '感谢分享，每种视觉情绪都有其独特价值。',
  };

  const insights = insightsMap[primaryMood] || '图片记录已保存，持续记录有助于发现情绪模式。';

  // Extract emotions
  const emotions = Object.entries(scores)
    .filter(([, score]) => score > 0.1)
    .map(([emotion]) => emotion)
    .slice(0, 3);

  // Extract detected keywords
  const detectedKeywords = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .map(([mood]) => ({
      keyword: mood,
      sentiment: getSentimentForMood(mood)
    }));

  return {
    mood: primaryMood.charAt(0).toUpperCase() + primaryMood.slice(1),
    moodScore: parseFloat(moodScore.toFixed(1)),
    confidence: parseFloat(confidence.toFixed(2)),
    tags,
    emotions,
    insights,
    detectedKeywords,
  };
}

// Helper function to get sentiment for mood
function getSentimentForMood(mood: string): 'positive' | 'negative' | 'neutral' {
  if (['happy', 'energetic', 'calm'].includes(mood)) return 'positive';
  if (['sad', 'angry', 'anxious', 'tired'].includes(mood)) return 'negative';
  return 'neutral';
}

export async function GET(_request: NextRequest) {
  // The request parameter is intentionally unused for this GET endpoint
  void _request;
  return NextResponse.json({
    message: 'Vibe Tracker 图片情绪分析API',
    version: '1.0.0',
    provider: 'DeepSeek Vision AI',
    endpoints: {
      POST: '/api/analyze-image - 分析图片情绪状态',
    },
    exampleRequest: {
      method: 'POST',
      body: {
        imageUrl: '/uploads/example.jpg',
        description: '一张美丽的日落照片'
      }
    },
    features: [
      '使用DeepSeek Vision AI进行图片情绪分析',
      '支持本地和远程图片URL',
      '自动回退到关键词分析（当API不可用时）',
      '返回情绪评分、标签、关键词和建议'
    ],
    note: '需要配置DEEPSEEK_API_KEY环境变量。如果DeepSeek Vision API不可用，会自动使用回退分析。',
  });
}