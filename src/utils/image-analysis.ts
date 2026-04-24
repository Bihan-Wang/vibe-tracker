/**
 * 图片特征分析工具
 *
 * 在客户端使用Canvas分析图片特征，提取颜色、亮度、对比度等视觉特征
 * 用于情绪分析，无需发送图片到第三方API
 */

export interface ImageFeatures {
  // 基础特征
  width: number;
  height: number;
  aspectRatio: number;
  fileSize?: number;

  // 颜色特征
  dominantColors: Array<{
    r: number;
    g: number;
    b: number;
    hex: string;
    percentage: number;
  }>;
  averageColor: {
    r: number;
    g: number;
    b: number;
    hex: string;
  };

  // 亮度特征
  brightness: number; // 0-1
  contrast: number; // 0-1
  saturation: number; // 0-1

  // 情绪相关特征
  warmColorRatio: number; // 暖色比例 (0-1)
  coolColorRatio: number; // 冷色比例 (0-1)
  vibrantColorRatio: number; // 鲜艳颜色比例 (0-1)
  darkColorRatio: number; // 暗色比例 (0-1)

  // 高级特征
  colorVariance: number; // 颜色方差，表示颜色多样性
  edgeDensity: number; // 边缘密度，表示图片复杂度
  symmetryScore: number; // 对称性评分 (0-1)

  // 情绪预测
  predictedMood: string;
  moodConfidence: number;
  colorMood: string; // 基于颜色的情绪
  brightnessMood: string; // 基于亮度的情绪
}

export interface ImageAnalysisOptions {
  maxColors?: number; // 提取的主颜色数量
  sampleSize?: number; // 采样大小（性能优化）
  skipAdvanced?: boolean; // 跳过高级特征计算
}

/**
 * 从图片URL加载并分析图片特征
 */
export async function analyzeImageFeatures(
  imageUrl: string,
  options: ImageAnalysisOptions = {}
): Promise<ImageFeatures> {
  const {
    maxColors = 5,
    sampleSize = 100,
    skipAdvanced = false,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 允许跨域图片分析

    img.onload = () => {
      try {
        const features = analyzeImageCanvas(img, { maxColors, sampleSize, skipAdvanced });
        resolve(features);
      } catch (error) {
        reject(new Error(`图片分析失败: ${error instanceof Error ? error.message : '未知错误'}`));
      }
    };

    img.onerror = () => {
      reject(new Error('无法加载图片，请检查图片URL是否有效'));
    };

    img.src = imageUrl;
  });
}

/**
 * 使用Canvas分析图片
 */
function analyzeImageCanvas(
  img: HTMLImageElement,
  options: Required<ImageAnalysisOptions>
): ImageFeatures {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas上下文不可用');
  }

  // 设置Canvas尺寸
  const { maxColors, sampleSize, skipAdvanced } = options;
  const width = img.width;
  const height = img.height;
  const aspectRatio = width / height;

  // 为了性能，限制最大尺寸
  const maxDimension = 800;
  let drawWidth = width;
  let drawHeight = height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      drawWidth = maxDimension;
      drawHeight = Math.round((height / width) * maxDimension);
    } else {
      drawHeight = maxDimension;
      drawWidth = Math.round((width / height) * maxDimension);
    }
  }

  canvas.width = drawWidth;
  canvas.height = drawHeight;

  // 绘制图片到Canvas
  ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

  // 获取图片数据
  const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight);
  const data = imageData.data;
  const pixelCount = drawWidth * drawHeight;

  // 采样分析（为了性能）
  const sampleStep = Math.max(1, Math.floor(pixelCount / sampleSize));

  // 收集颜色数据
  const colors: Array<{ r: number; g: number; b: number }> = [];
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;

  let warmCount = 0;
  let coolCount = 0;
  let vibrantCount = 0;
  let darkCount = 0;

  // 亮度相关
  let brightnessSum = 0;
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    colors.push({ r, g, b });
    totalR += r;
    totalG += g;
    totalB += b;

    // 计算亮度
    const brightness = calculateBrightness(r, g, b);
    brightnessSum += brightness;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);

    // 颜色分类
    const { isWarm, isCool, isVibrant, isDark } = classifyColor(r, g, b, brightness);
    if (isWarm) warmCount++;
    if (isCool) coolCount++;
    if (isVibrant) vibrantCount++;
    if (isDark) darkCount++;
  }

  const sampleCount = colors.length;

  // 计算平均颜色
  const avgR = Math.round(totalR / sampleCount);
  const avgG = Math.round(totalG / sampleCount);
  const avgB = Math.round(totalB / sampleCount);

  // 提取主颜色（简化版k-means）
  const dominantColors = extractDominantColors(colors, maxColors);

  // 计算亮度、对比度、饱和度
  const brightness = brightnessSum / sampleCount / 255; // 归一化到0-1
  const contrast = maxBrightness > 0 ? (maxBrightness - minBrightness) / 255 : 0;

  // 计算饱和度（简化版）
  let saturationSum = 0;
  for (const color of colors) {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    saturationSum += saturation;
  }
  const saturation = saturationSum / sampleCount;

  // 计算颜色方差（颜色多样性）
  let colorVariance = 0;
  if (!skipAdvanced) {
    // 计算颜色与平均颜色的距离方差
    let distanceSum = 0;
    for (const color of colors) {
      const distance = Math.sqrt(
        Math.pow(color.r - avgR, 2) +
        Math.pow(color.g - avgG, 2) +
        Math.pow(color.b - avgB, 2)
      );
      distanceSum += distance;
    }
    colorVariance = distanceSum / sampleCount / 441.67; // 归一化到0-1 (441.67 = sqrt(255²+255²+255²))
  }

  // 计算比例
  const warmColorRatio = warmCount / sampleCount;
  const coolColorRatio = coolCount / sampleCount;
  const vibrantColorRatio = vibrantCount / sampleCount;
  const darkColorRatio = darkCount / sampleCount;

  // 计算边缘密度（简化版）
  let edgeDensity = 0;
  let symmetryScore = 0;

  if (!skipAdvanced) {
    edgeDensity = calculateEdgeDensity(ctx, drawWidth, drawHeight);
    symmetryScore = calculateSymmetryScore(ctx, drawWidth, drawHeight);
  }

  // 基于特征预测情绪
  const { predictedMood, moodConfidence, colorMood, brightnessMood } = predictMoodFromFeatures({
    warmColorRatio,
    coolColorRatio,
    vibrantColorRatio,
    darkColorRatio,
    brightness,
    saturation,
    contrast,
  });

  return {
    width,
    height,
    aspectRatio,

    dominantColors: dominantColors.map(color => ({
      ...color,
      hex: rgbToHex(color.r, color.g, color.b),
      percentage: color.percentage,
    })),

    averageColor: {
      r: avgR,
      g: avgG,
      b: avgB,
      hex: rgbToHex(avgR, avgG, avgB),
    },

    brightness,
    contrast,
    saturation,

    warmColorRatio,
    coolColorRatio,
    vibrantColorRatio,
    darkColorRatio,

    colorVariance,
    edgeDensity,
    symmetryScore,

    predictedMood,
    moodConfidence,
    colorMood,
    brightnessMood,
  };
}

/**
 * 计算亮度（0-255）
 */
function calculateBrightness(r: number, g: number, b: number): number {
  // 使用加权平均，人眼对绿色最敏感
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 颜色分类
 */
function classifyColor(r: number, g: number, b: number, brightness: number) {
  // 暖色：红色、橙色、黄色为主
  const isWarm = r > g + 30 && r > b + 30;

  // 冷色：蓝色、青色为主
  const isCool = b > r + 30 && b > g + 30;

  // 鲜艳颜色：饱和度高的颜色
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const isVibrant = saturation > 0.6 && brightness > 100;

  // 暗色：亮度低
  const isDark = brightness < 80;

  return { isWarm, isCool, isVibrant, isDark };
}

/**
 * 提取主颜色（简化版）
 */
function extractDominantColors(
  colors: Array<{ r: number; g: number; b: number }>,
  maxColors: number
): Array<{ r: number; g: number; b: number; percentage: number }> {
  // 简化版：按颜色空间分桶
  const buckets: Record<string, { color: { r: number; g: number; b: number }; count: number }> = {};

  // 将颜色量化到16级
  for (const color of colors) {
    const quantizedR = Math.floor(color.r / 16) * 16;
    const quantizedG = Math.floor(color.g / 16) * 16;
    const quantizedB = Math.floor(color.b / 16) * 16;
    const key = `${quantizedR},${quantizedG},${quantizedB}`;

    if (!buckets[key]) {
      buckets[key] = { color: { r: quantizedR, g: quantizedG, b: quantizedB }, count: 0 };
    }
    buckets[key].count++;
  }

  // 按数量排序
  const sortedBuckets = Object.values(buckets)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors);

  const totalCount = colors.length;

  return sortedBuckets.map(bucket => ({
    r: bucket.color.r,
    g: bucket.color.g,
    b: bucket.color.b,
    percentage: bucket.count / totalCount,
  }));
}

/**
 * 计算边缘密度（简化版）
 */
function calculateEdgeDensity(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // 简化版：使用Sobel算子检测边缘
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let edgeCount = 0;
  const sampleStep = 4; // 采样以减少计算

  for (let y = 1; y < height - 1; y += sampleStep) {
    for (let x = 1; x < width - 1; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const brightness = calculateBrightness(data[idx], data[idx + 1], data[idx + 2]);

      // 简单梯度检测
      const rightIdx = (y * width + (x + 1)) * 4;
      const rightBrightness = calculateBrightness(data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]);

      const downIdx = ((y + 1) * width + x) * 4;
      const downBrightness = calculateBrightness(data[downIdx], data[downIdx + 1], data[downIdx + 2]);

      const gradient = Math.abs(brightness - rightBrightness) + Math.abs(brightness - downBrightness);

      if (gradient > 30) { // 阈值
        edgeCount++;
      }
    }
  }

  const totalSamples = Math.floor((width - 2) / sampleStep) * Math.floor((height - 2) / sampleStep);
  return totalSamples > 0 ? edgeCount / totalSamples : 0;
}

/**
 * 计算对称性评分（简化版）
 */
function calculateSymmetryScore(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // 简化版：水平对称性
  const halfWidth = Math.floor(width / 2);
  let matchCount = 0;
  let totalCount = 0;
  const sampleStep = 8;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < halfWidth; x += sampleStep) {
      const leftIdx = (y * width + x) * 4;
      const rightIdx = (y * width + (width - 1 - x)) * 4;

      const leftBrightness = calculateBrightness(
        ctx.getImageData(0, 0, width, height).data[leftIdx],
        ctx.getImageData(0, 0, width, height).data[leftIdx + 1],
        ctx.getImageData(0, 0, width, height).data[leftIdx + 2]
      );

      const rightBrightness = calculateBrightness(
        ctx.getImageData(0, 0, width, height).data[rightIdx],
        ctx.getImageData(0, 0, width, height).data[rightIdx + 1],
        ctx.getImageData(0, 0, width, height).data[rightIdx + 2]
      );

      if (Math.abs(leftBrightness - rightBrightness) < 20) { // 容差
        matchCount++;
      }
      totalCount++;
    }
  }

  return totalCount > 0 ? matchCount / totalCount : 0.5;
}

/**
 * 基于特征预测情绪
 */
function predictMoodFromFeatures(features: {
  warmColorRatio: number;
  coolColorRatio: number;
  vibrantColorRatio: number;
  darkColorRatio: number;
  brightness: number;
  saturation: number;
  contrast: number;
}): {
  predictedMood: string;
  moodConfidence: number;
  colorMood: string;
  brightnessMood: string;
} {
  const { warmColorRatio, coolColorRatio, vibrantColorRatio, darkColorRatio, brightness, saturation, contrast } = features;

  // 基于颜色的情绪
  let colorMood = 'neutral';
  let colorScore = 0;

  if (warmColorRatio > 0.4) {
    colorMood = 'happy';
    colorScore = warmColorRatio;
  } else if (coolColorRatio > 0.4) {
    colorMood = 'calm';
    colorScore = coolColorRatio;
  } else if (vibrantColorRatio > 0.3) {
    colorMood = 'energetic';
    colorScore = vibrantColorRatio;
  } else if (darkColorRatio > 0.5) {
    colorMood = 'sad';
    colorScore = darkColorRatio;
  }

  // 基于亮度的情绪
  let brightnessMood = 'neutral';
  if (brightness > 0.7) {
    brightnessMood = 'happy';
  } else if (brightness < 0.3) {
    brightnessMood = 'sad';
  } else if (contrast > 0.5) {
    brightnessMood = 'energetic';
  } else {
    brightnessMood = 'calm';
  }

  // 综合预测
  let predictedMood = 'neutral';
  let confidence = 0.5;

  // 规则引擎
  if (colorMood === 'happy' && brightnessMood === 'happy') {
    predictedMood = 'happy';
    confidence = 0.8;
  } else if (colorMood === 'calm' && brightnessMood === 'calm') {
    predictedMood = 'calm';
    confidence = 0.7;
  } else if (colorMood === 'energetic' || (saturation > 0.6 && contrast > 0.4)) {
    predictedMood = 'energetic';
    confidence = 0.6;
  } else if (colorMood === 'sad' && brightnessMood === 'sad') {
    predictedMood = 'sad';
    confidence = 0.7;
  } else {
    // 使用加权平均
    const moods = [colorMood, brightnessMood];
    const moodCounts: Record<string, number> = {};
    for (const mood of moods) {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    }

    let maxCount = 0;
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        predictedMood = mood;
      }
    }

    confidence = 0.5 + (maxCount / moods.length) * 0.3;
  }

  return {
    predictedMood,
    moodConfidence: Math.min(0.95, confidence),
    colorMood,
    brightnessMood,
  };
}

/**
 * RGB转十六进制
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * 简化版图片分析（用于快速分析）
 */
export async function analyzeImageQuick(imageUrl: string): Promise<{
  dominantColor: string;
  brightness: number;
  predictedMood: string;
}> {
  const features = await analyzeImageFeatures(imageUrl, {
    maxColors: 3,
    sampleSize: 50,
    skipAdvanced: true,
  });

  return {
    dominantColor: features.dominantColors[0]?.hex || '#000000',
    brightness: features.brightness,
    predictedMood: features.predictedMood,
  };
}

/**
 * 生成图片情绪描述（用户可读，不含技术参数）
 */
export function generateImageDescription(_features: ImageFeatures, userDescription?: string): string {
  if (userDescription) return userDescription;
  return '一张图片记录';
}