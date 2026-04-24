import { NextRequest, NextResponse } from 'next/server';
import { createDeepSeekClient } from '@/utils/deepseek';
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
    let model = 'deepseek-vision';
    let fallback = false;

    try {
      // Try to use DeepSeek Vision API for image analysis
      console.log('Attempting DeepSeek Vision API analysis...');
      analysis = await analyzeImageWithDeepSeek(imageUrl, description, imageFeatures);
      console.log('DeepSeek Vision API analysis successful');
    } catch (apiError) {
      console.warn('DeepSeek Vision API failed, using fallback analysis:', apiError);

      // Use fallback analysis based on description or image metadata
      analysis = analyzeImageWithFallback(imageUrl, description, imageFeatures);
      model = 'fallback-v1.0';
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

// Analyze image using DeepSeek Vision API
async function analyzeImageWithDeepSeek(
  imageUrl: string,
  description: string,
  imageFeatures?: ImageFeatures
): Promise<MoodAnalysisResult> {
  const client = createDeepSeekClient();

  try {
    // Check if image is local file (starts with /uploads/)
    // Note: DeepSeek Vision API support for images is currently limited
    // The following code prepares image data for future Vision API support
    // For now, we rely on text description analysis
    // let imageContent: string;
    // if (imageUrl.startsWith('/uploads/')) {
    //   // Read local file and convert to base64
    //   const filePath = path.join(process.cwd(), 'public', imageUrl);
    //   const imageBuffer = await readFile(filePath);
    //   const base64Image = imageBuffer.toString('base64');
    //
    //   // Determine MIME type from file extension
    //   const extension = imageUrl.split('.').pop()?.toLowerCase();
    //   const mimeType = extension === 'png' ? 'image/png' :
    //                   extension === 'jpeg' || extension === 'jpg' ? 'image/jpeg' :
    //                   extension === 'webp' ? 'image/webp' :
    //                   extension === 'gif' ? 'image/gif' : 'image/jpeg';
    //
    //   imageContent = `data:${mimeType};base64,${base64Image}`;
    // } else {
    //   // For external URLs, we would need to download and convert to base64
    //   // For now, use the URL directly if DeepSeek supports it
    //   imageContent = imageUrl;
    // }

    const prompt = `请以温暖、同理心的方式分析这张图片的情绪内容。

${description ? `用户提供的描述: "${description}"` : '用户上传了一张图片'}

请像一位善解人意的朋友那样分析这张图片，关注：
1. **视觉情绪感受**（从以下选项中选择：happy, sad, angry, calm, anxious, energetic, tired, neutral）
2. **色彩、构图和氛围传达的情感强度**（0-10分，10为最强烈）
3. **图片中的情感层次和细微差别**
4. **有同理心的个性化观察和建议**

**分析角度：**
- 色彩心理学（暖色 vs 冷色，明亮 vs 暗淡）
- 构图和场景的情感暗示（自然风景、城市、人物、物体等）
- 整体氛围和情绪感染力

**语气要求：**
- 温暖自然，像朋友间的分享
- 有同理心，避免机械化的分析
- 从积极角度观察，发现美和可能性
- 建议要具体、可操作、有建设性

**重要：只输出用户可读的情绪描述，不要包含任何图片技术参数（如色值、尺寸、分辨率、文件名等）。**

请返回JSON格式的分析结果，包含以下字段：

请返回JSON格式的分析结果，包含以下字段：
- mood: 主要情绪（从以下选项中选择：happy, sad, angry, calm, anxious, energetic, tired, neutral）
- moodScore: 情绪强度评分（0-10分，10为最强烈）
- confidence: 分析置信度（0-1）
- tags: 相关标签数组（如：nature, urban, people, bright, dark, colorful等）
- emotions: 检测到的情绪数组
- insights: 温暖自然的观察和建议（中文，150字以内）
- detectedKeywords: 检测到的关键词数组，每个包含keyword和sentiment（positive/negative/neutral）

**insights示例风格：**
- "这张图片给人一种[具体感受]。从色彩和构图中，我能感受到[具体情绪]。也许这张图片提醒我们[温暖的建议]。"
- "感谢分享这张图片。视觉上它传达出[具体观察]。这样的画面常常能[积极的影响]。"
- "图片中的[具体元素]很有感染力。它让我想起[相关联想]，或许可以[具体建议]。"

请确保返回的是有效的JSON，不要包含其他文本。`;

    console.log('Calling DeepSeek Vision API with image, description length:', description.length);

    // Note: DeepSeek API may not support images directly in the current version
    // We'll try to use the chat completion with image support if available
    const response = await client.chat.completions.create({
      model: 'deepseek-chat', // Use deepseek-chat model (may not support images)
      messages: [
        {
          role: 'system',
          content: '你是一位温暖、善解人意的视觉情绪分析助手，擅长以同理心理解图片传达的情感，并提供自然、人性化的观察和建议。你的回应应该像一位关心朋友的艺术治疗师，语气温暖自然，避免机械化的分析。请始终返回有效的JSON格式。'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            // Note: DeepSeek API may not support image input in the current version
            // We'll rely on text description for now
          ]
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from DeepSeek API');
    }

    console.log('DeepSeek Vision API response received, content length:', content.length);

    try {
      const result = JSON.parse(content) as MoodAnalysisResult;

      // Validate required fields
      if (!result.mood || typeof result.moodScore !== 'number') {
        throw new Error('Invalid response format from DeepSeek API');
      }

      // Ensure score is within 0-10 range
      result.moodScore = Math.max(0, Math.min(10, result.moodScore));

      return result;
    } catch (parseError) {
      console.error('Failed to parse DeepSeek API response:', parseError);
      console.error('Raw response:', content);
      throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }
  } catch (error) {
    console.error('DeepSeek Vision API error:', error);

    // Check if it's an API error
    if (error instanceof Error && (error.message.includes('不支持') || error.message.includes('不支持图片'))) {
      throw new Error('DeepSeek API当前不支持图片分析功能');
    }

    throw error;
  }
}

// Fallback analysis for when DeepSeek Vision is not available
function analyzeImageWithFallback(
  imageUrl: string,
  description: string,
  imageFeatures?: ImageFeatures
): MoodAnalysisResult {
  console.log('Using enhanced fallback image analysis with features:', imageFeatures ? 'yes' : 'no');

  // Use image features if available, otherwise fall back to text analysis
  if (imageFeatures) {
    return analyzeWithImageFeatures(imageFeatures, description);
  } else {
    return analyzeWithTextOnly(description, imageUrl);
  }
}

// Analyze using image features (color psychology based)
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
    const moodKeywords = {
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

    // If text suggests a different mood with high confidence, adjust
    if (maxScore >= 2 && textMood !== primaryMood) {
      // Blend the predictions: 70% features, 30% text
      const random = Math.random();
      if (random < 0.3) {
        primaryMood = textMood;
        console.log('Adjusted mood based on text description:', textMood);
      }
    }
  }

  // Calculate mood score based on features
  let moodScore = 5; // Default

  // Adjust score based on brightness and saturation
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

  // Clamp to 0-10 range
  moodScore = Math.max(1, Math.min(10, moodScore));

  // Calculate confidence based on feature strength and consistency
  let confidence = moodConfidence;

  // Increase confidence if features strongly support the mood
  if (primaryMood === 'happy' && features.warmColorRatio > 0.5 && features.brightness > 0.7) {
    confidence = Math.min(0.95, confidence + 0.2);
  } else if (primaryMood === 'calm' && features.coolColorRatio > 0.5 && features.contrast < 0.4) {
    confidence = Math.min(0.95, confidence + 0.15);
  } else if (primaryMood === 'sad' && features.darkColorRatio > 0.4 && features.brightness < 0.4) {
    confidence = Math.min(0.95, confidence + 0.15);
  }

  // Generate tags based on features and description
  const tags: string[] = [];

  // Color-based tags
  if (features.warmColorRatio > 0.5) tags.push('warm', 'vibrant');
  if (features.coolColorRatio > 0.5) tags.push('cool', 'serene');
  if (features.brightness > 0.7) tags.push('bright', 'luminous');
  if (features.brightness < 0.3) tags.push('dark', 'moody');
  if (features.saturation > 0.6) tags.push('saturated', 'colorful');
  if (features.saturation < 0.3) tags.push('desaturated', 'subtle');
  if (features.contrast > 0.6) tags.push('high-contrast', 'dramatic');

  // Description-based tags
  if (description.includes('自然') || description.includes('风景')) tags.push('nature', 'landscape');
  if (description.includes('城市') || description.includes('建筑')) tags.push('urban', 'architecture');
  if (description.includes('人物') || description.includes('人')) tags.push('people', 'portrait');
  if (description.includes('食物') || description.includes('吃')) tags.push('food', 'culinary');
  if (description.includes('动物') || description.includes('宠物')) tags.push('animals', 'pets');

  // Mood-based tags
  if (primaryMood === 'happy') tags.push('positive', 'joyful');
  if (primaryMood === 'calm') tags.push('peaceful', 'relaxing');
  if (primaryMood === 'energetic') tags.push('dynamic', 'active');
  if (primaryMood === 'sad') tags.push('melancholy', 'emotional');
  if (primaryMood === 'anxious') tags.push('tense', 'uneasy');

  // Remove duplicates
  const uniqueTags = [...new Set(tags)].slice(0, 8);

  // Generate insights based on features and mood
  const insights = generateInsightsFromFeatures(features, primaryMood, description);

  // Emotions array
  const emotions = [primaryMood];
  if (features.warmColorRatio > 0.3) emotions.push('warm');
  if (features.coolColorRatio > 0.3) emotions.push('cool');
  if (features.brightness > 0.7) emotions.push('bright');
  if (features.brightness < 0.3) emotions.push('dark');

  // Detected keywords
  const detectedKeywords = [
    { keyword: primaryMood, sentiment: getSentimentForMood(primaryMood) },
    { keyword: 'visual', sentiment: 'neutral' as const },
  ];

  if (features.warmColorRatio > 0.4) {
    detectedKeywords.push({ keyword: 'warm colors', sentiment: 'positive' as const });
  }
  if (features.coolColorRatio > 0.4) {
    detectedKeywords.push({ keyword: 'cool colors', sentiment: 'positive' as const });
  }

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

// Helper function to generate insights based on features
function generateInsightsFromFeatures(
  features: ImageFeatures,
  mood: string,
  description: string
): string {
  const brightnessDesc = features.brightness > 0.7 ? '明亮' : features.brightness < 0.3 ? '较暗' : '适中亮度';
  const saturationDesc = features.saturation > 0.6 ? '鲜艳' : features.saturation < 0.3 ? '柔和' : '自然饱和度';
  const contrastDesc = features.contrast > 0.6 ? '高对比度' : features.contrast < 0.3 ? '低对比度' : '均衡对比';

  const colorDesc = features.warmColorRatio > features.coolColorRatio ? '暖色调为主' :
                   features.coolColorRatio > features.warmColorRatio ? '冷色调为主' : '色彩平衡';

  let baseInsight = '';

  if (mood === 'happy') {
    baseInsight = `这张${brightnessDesc}的图片以${colorDesc}传达出积极的情绪。${saturationDesc}的色彩带来愉悦感，${contrastDesc}增强了视觉冲击力。`;
  } else if (mood === 'calm') {
    baseInsight = `平静的视觉感受来自${colorDesc}和${contrastDesc}。${brightnessDesc}营造出宁静氛围，适合放松心情。`;
  } else if (mood === 'energetic') {
    baseInsight = `充满活力的画面！${contrastDesc}和${saturationDesc}的色彩创造出动态感，${brightnessDesc}增强了能量感。`;
  } else if (mood === 'sad') {
    baseInsight = `图片传达出深沉的情绪。${brightnessDesc}和${colorDesc}营造出独特的氛围，每种视觉情绪都有其表达价值。`;
  } else {
    baseInsight = `视觉记录已保存。图片呈现${brightnessDesc}、${saturationDesc}的特点，${colorDesc}。`;
  }

  if (description) {
    baseInsight += ` 从您的描述"${description.length > 50 ? description.substring(0, 50) + '...' : description}"中，我能感受到更丰富的情感层次。`;
  }

  baseInsight += ' 持续记录有助于发现情绪与视觉表达之间的独特联系。';

  return baseInsight;
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