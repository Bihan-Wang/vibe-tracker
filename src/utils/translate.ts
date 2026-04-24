/**
 * Tag translation map (English → Chinese)
 */
const TAG_TRANSLATIONS: Record<string, string> = {
  // Nature & scenery
  nature: '自然', landscape: '风景', scenery: '风景',
  sunset: '日落', sunrise: '日出', sky: '天空', ocean: '海洋',
  mountain: '山景', forest: '森林', garden: '花园',
  // Color & tone
  soft: '柔和', gentle: '柔和', subtle: '细腻', pastel: '素雅',
  warm: '温暖', cool: '凉爽', bright: '明亮', dark: '暗调',
  colorful: '多彩', muted: '素雅', saturated: '鲜艳',
  // Mood
  happy: '开心', joy: '快乐', joyful: '欢乐',
  calm: '平静', relaxed: '放松', chill: '悠闲', peaceful: '宁静',
  serene: '安宁', tranquil: '安宁',
  sad: '低落', melancholy: '忧郁', gloomy: '阴沉',
  anxious: '焦虑', nervous: '紧张', tense: '紧张',
  energetic: '活力', vibrant: '活力', lively: '生动',
  tired: '疲惫', exhausted: '疲倦',
  angry: '生气', frustrated: '沮丧', annoyed: '烦躁',
  content: '满足', satisfied: '满意', pleased: '愉快',
  neutral: '中性', regular: '平常', normal: '平常',
  // Social & life
  social: '社交', friends: '友情', friend: '朋友', family: '家庭',
  friendship: '友情', leisure: '休闲', hobby: '爱好',
  work: '工作', job: '工作', office: '办公', career: '事业',
  school: '学习', study: '学习', exam: '考试',
  // Activities
  exercise: '运动', fitness: '运动', workout: '锻炼', sports: '体育',
  travel: '旅行', adventure: '冒险', outdoor: '户外',
  music: '音乐', art: '艺术', creative: '创意',
  meditation: '冥想', mindfulness: '正念', yoga: '瑜伽',
  reading: '阅读', book: '书籍', writing: '写作',
  cooking: '烹饪', food: '美食', culinary: '烹饪', meal: '餐食',
  // People
  people: '人物', portrait: '人像', selfie: '自拍',
  animals: '动物', pets: '宠物', pet: '宠物',
  // Urban & architecture
  urban: '城市', architecture: '建筑', city: '都市',
  // Health
  health: '健康', sick: '生病', pain: '疼痛',
  sleep: '睡眠', rest: '休息', bed: '休息',
  // Weather
  weather: '天气', sun: '晴天', rain: '雨天', snow: '雪天',
  // Time
  morning: '早晨', night: '夜晚', evening: '傍晚', afternoon: '午后',
  // Qualities
  positive: '积极', negative: '消极',
  detailed: '详细', personal: '个人', daily: '日常', life: '生活',
  reflection: '反思', insight: '感悟',
  gratitude: '感恩', thankful: '感激', blessed: '幸运',
  hope: '希望', optimistic: '乐观',
  // Productivity
  productivity: '效率', success: '成就', accomplishment: '成就',
  progress: '进步', growth: '成长', goal: '目标',
  // Aesthetic
  aesthetic: '美感', elegant: '优雅', minimal: '简约',
  romantic: '浪漫', dreamy: '梦幻', cozy: '温馨',
  highContrast: '高对比', dramatic: '戏剧性',
  desaturated: '低饱和', moody: '情绪化',
  luminous: '明亮', radiant: '闪耀',
};

export function translateTag(tag: string): string {
  return TAG_TRANSLATIONS[tag.toLowerCase().trim()] || tag;
}
