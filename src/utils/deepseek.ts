/**
 * DeepSeek API utilities for Vibe Tracker
 *
 * DeepSeek provides OpenAI-compatible API endpoints, so we can use the OpenAI SDK
 * with a different base URL and API key.
 */

import OpenAI from 'openai';

// Types for mood analysis
export interface MoodAnalysisResult {
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

// Initialize DeepSeek client
export function createDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured in environment variables');
  }

  console.log('Creating DeepSeek client with baseURL:', baseURL);

  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

// Create prompt for mood analysis
export function createMoodAnalysisPrompt(text: string): string {
  return `请以温暖、同理心的方式分析以下文本的情绪状态，返回JSON格式的分析结果：

文本内容："${text}"

请像一位善解人意的朋友或心理咨询师那样分析这段文字，关注：
1. **主要情绪感受**（从以下选项中选择最匹配的：happy, sad, angry, calm, anxious, energetic, tired, neutral）
2. **情绪强度**（0-10分，10为最强烈）
3. **文字中透露的情感层次和细微差别**
4. **有同理心的个性化建议和洞察**

**分析要求：**
- 情绪类型使用英文关键词（如happy, sad等），但其他内容用中文
- 考虑中文表达的文化背景和语言特点
- 从积极心理学角度出发，关注成长和可能性
- 建议要具体、可操作、有建设性
- 语气要温暖、自然、不生硬，避免机械化的表述
- 洞察要体现对作者处境的理解和共情

**返回格式必须是有效的JSON：**
{
  "mood": "主要情绪英文关键词",
  "moodScore": 情绪强度评分(0-10),
  "confidence": 分析置信度(0-1),
  "tags": ["标签1", "标签2", ...], // 如：work, social, reflection, gratitude等
  "emotions": ["情绪1", "情绪2", ...], // 检测到的具体情绪，如joy, satisfaction, anxiety等
  "insights": "温暖自然的洞察建议（中文，150字以内，语气像朋友间的分享）",
  "detectedKeywords": [
    {"keyword": "关键词1", "sentiment": "positive/negative/neutral"},
    {"keyword": "关键词2", "sentiment": "positive/negative/neutral"}
  ]
}

**insights示例风格：**
- "听起来你今天经历了不少事情呢。从你的描述中，我能感受到[具体情绪]。也许可以试试[具体建议]，这可能会让你感觉好一些。"
- "感谢你分享这些感受。每个人都会有这样的时刻，[具体观察]。记得照顾好自己的情绪，[温暖的建议]。"
- "你的文字透露出[具体观察]。这种感受很真实，[共情表述]。或许[具体建议]能带来一些不同的视角。"

请确保返回的是有效的JSON，不要包含其他文本。`;
}

// Analyze mood using DeepSeek API
export async function analyzeMoodWithDeepSeek(text: string): Promise<MoodAnalysisResult> {
  const client = createDeepSeekClient();

  try {
    console.log('Calling DeepSeek API for mood analysis, text length:', text.length);

    const response = await client.chat.completions.create({
      model: 'deepseek-chat', // Use deepseek-chat model
      messages: [
        {
          role: 'system',
          content: '你是一位温暖、善解人意的情绪分析助手，擅长以同理心理解用户的感受，并提供自然、人性化的建议。你的回应应该像一位关心朋友的心理咨询师，语气温暖自然，避免机械化的表述。请始终返回有效的JSON格式。'
        },
        {
          role: 'user',
          content: createMoodAnalysisPrompt(text)
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

    console.log('DeepSeek API response received, content length:', content.length);

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
    console.error('DeepSeek API error:', error);

    // Provide more specific error messages
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new Error('DeepSeek API密钥无效或已过期');
      } else if (error.status === 429) {
        throw new Error('API请求过于频繁，请稍后再试');
      } else if (error.status === 500) {
        throw new Error('DeepSeek服务暂时不可用');
      }
    }

    throw new Error(`情绪分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// Fallback analysis using keyword matching (for when API is unavailable)
export function analyzeMoodWithKeywords(text: string): MoodAnalysisResult {
  console.log('Using fallback keyword analysis');

  const lowerText = text.toLowerCase();

  const moodKeywords = {
    happy: ['happy', 'great', 'awesome', 'amazing', 'excited', 'joy', 'love', 'wonderful', 'good', 'nice', 'fantastic', '开心', '高兴', '快乐'],
    sad: ['sad', 'unhappy', 'depressed', 'miserable', 'lonely', 'tear', 'cry', '悲伤', '难过', '伤心'],
    angry: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated', 'hate', '生气', '愤怒', '恼火'],
    calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'meditation', '平静', '宁静', '放松'],
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense', 'overwhelmed', '焦虑', '担心', '紧张'],
    energetic: ['energetic', 'active', 'motivated', 'productive', 'pumped', 'vibrant', '精力充沛', '有活力', '积极'],
    tired: ['tired', 'exhausted', 'fatigued', 'sleepy', 'drained', 'burned out', '累', '疲劳', '疲倦'],
  };

  const scores: Record<string, number> = {};
  Object.entries(moodKeywords).forEach(([mood, keywords]) => {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    scores[mood] = matches * 0.1;
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

  // If no strong keywords, default to neutral
  if (highestScore < 0.2) {
    primaryMood = 'neutral';
  }

  // Calculate confidence and score
  const confidence = Math.min(0.3 + highestScore * 0.4, 0.95);
  const moodScoreMap: Record<string, number> = {
    happy: 8 + Math.random() * 2,
    energetic: 7 + Math.random() * 2,
    calm: 6 + Math.random() * 2,
    neutral: 5 + Math.random() * 2,
    tired: 4 + Math.random() * 2,
    anxious: 3 + Math.random() * 2,
    sad: 2 + Math.random() * 2,
    angry: 2 + Math.random() * 2,
  };

  const moodScore = moodScoreMap[primaryMood] || 5;

  // Extract tags
  const tags = [];
  if (text.length > 50) tags.push('detailed');
  if (lowerText.includes('work') || lowerText.includes('job')) tags.push('work');
  if (lowerText.includes('family') || lowerText.includes('friend')) tags.push('social');
  if (lowerText.includes('exercise') || lowerText.includes('workout')) tags.push('fitness');
  if (lowerText.includes('food') || lowerText.includes('eat')) tags.push('food');

  // Generate insights
  const insightsMap: Record<string, string> = {
    happy: '你的积极情绪很明显！继续保持这种状态。',
    calm: '平静的心态有助于更好的决策和创造力。',
    energetic: '高能量水平适合进行创造性工作或体育活动。',
    neutral: '平衡的状态是良好的基础。',
    tired: '身体可能需要更多休息，考虑调整作息。',
    anxious: '感到焦虑是正常的，深呼吸练习可能会有帮助。',
    sad: '感谢分享，每种情绪状态都有助于更好地了解自己。',
    angry: '愤怒情绪需要适当表达和释放。',
  };

  const insights = insightsMap[primaryMood] || '感谢分享，持续记录有助于发现情绪模式。';

  // Extract emotions with scores > 0.1
  const emotions = Object.entries(scores)
    .filter(([, score]) => score > 0.1)
    .map(([emotion]) => emotion)
    .slice(0, 3);

  // Extract detected keywords
  const detectedKeywords = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .map(([mood]) => ({
      keyword: mood,
      sentiment: (['happy', 'energetic', 'calm'].includes(mood) ? 'positive' :
                ['sad', 'angry', 'anxious', 'tired'].includes(mood) ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral'
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