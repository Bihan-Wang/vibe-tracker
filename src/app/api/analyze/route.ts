import { NextRequest, NextResponse } from 'next/server';
import { analyzeMoodWithDeepSeek, analyzeMoodWithKeywords } from '@/utils/deepseek';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '文本内容不能为空' },
        { status: 400 }
      );
    }

    console.log('Received mood analysis request, text length:', text.length);

    let analysis;
    let model = 'deepseek-chat';
    let fallback = false;

    try {
      // Try to use DeepSeek API first
      console.log('Attempting DeepSeek API analysis...');
      analysis = await analyzeMoodWithDeepSeek(text);
      console.log('DeepSeek API analysis successful');
    } catch (apiError) {
      console.warn('DeepSeek API failed, using fallback keyword analysis:', apiError);

      // Use fallback keyword analysis
      analysis = analyzeMoodWithKeywords(text);
      model = 'keyword-fallback-v1.0';
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
    console.error('Analysis error:', error);

    // Provide user-friendly error messages
    const errorMessage = error instanceof Error
      ? error.message
      : '情绪分析服务暂时不可用';

    return NextResponse.json(
      {
        error: '情绪分析失败',
        details: errorMessage,
        fallback: true
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  // The request parameter is intentionally unused for this GET endpoint
  void _request;
  return NextResponse.json({
    message: 'Vibe Tracker AI Analysis API',
    version: '2.0.0',
    provider: 'DeepSeek AI',
    endpoints: {
      POST: '/api/analyze - 分析文本情绪状态',
    },
    exampleRequest: {
      method: 'POST',
      body: { text: '我今天过得很开心！和朋友一起吃了美味的晚餐。' }
    },
    features: [
      '使用DeepSeek AI进行情绪分析',
      '支持中英文文本分析',
      '自动回退到关键词分析（当API不可用时）',
      '返回情绪评分、标签、关键词和建议'
    ],
    note: '需要配置DEEPSEEK_API_KEY环境变量。如果API调用失败，会自动使用关键词分析作为备用方案。',
  });
}