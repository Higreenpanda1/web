/**
 * Where the research starts: the head terms this audience types, one list per
 * language. Each is expanded through Google's autocomplete with question and
 * commercial modifiers, so the job discovers the long tail (what people ask
 * this month) rather than guessing it.
 *
 * Kept short on purpose. Every seed costs a handful of requests per market;
 * the tail comes from autocomplete, not from a longer list here.
 */
export const SEED_KEYWORDS: Record<'ar' | 'en', string[]> = {
  ar: [
    'الاستيراد من الصين',
    'الاستيراد من الصين إلى السعودية',
    'الاستيراد من الصين إلى الإمارات',
    'الاستيراد من الصين إلى اليمن',
    'الشحن من الصين',
    'وكيل شحن من الصين',
    'الجمارك السعودية الاستيراد',
    'شهادة سابر',
    'تأسيس شركة في الصين',
    'فتح حساب بنكي في الصين',
    'تسجيل علامة تجارية في الصين',
    'فيزا الصين تجارية',
    'دعوة تجارية من الصين',
    'معرض كانتون',
    'معارض الصين',
    'موقع 1688',
    'علي بابا الاستيراد',
    'مورد صيني موثوق',
    'فحص البضاعة في الصين',
    'التصنيع في الصين',
    'تجارة الجملة من الصين',
    'الدفع للمورد الصيني',
    'التجارة الإلكترونية الصين',
    'متجر إلكتروني منتجات صينية',
    'الاستثمار في الصين',
  ],
  en: [
    'import from china',
    'importing from china to uae',
    'importing from china to saudi arabia',
    'shipping from china',
    'china freight forwarder',
    'china sourcing agent',
    'verify chinese supplier',
    'alibaba vs 1688',
    'buy from 1688',
    'canton fair',
    'china company registration',
    'wfoe china',
    'china bank account for foreigners',
    'china trademark registration',
    'china business visa',
    'chinese factory inspection',
    'moq china',
    'landed cost china',
    'yiwu market',
    'shenzhen sourcing',
  ],
}

/**
 * Question and commercial modifiers, prepended or appended to a seed. Chosen
 * to surface intent, not volume: "cost of", "vs", "requirements" are the
 * phrases people use just before they buy a service.
 */
export const MODIFIERS: Record<'ar' | 'en', { before: string[]; after: string[] }> = {
  ar: {
    before: ['كيف', 'كم تكلفة', 'شروط', 'خطوات', 'أفضل', 'هل'],
    after: ['2026', 'للمبتدئين', 'بالتفصيل'],
  },
  en: {
    before: ['how to', 'cost of', 'best', 'is it worth', 'requirements for'],
    after: ['2026', 'for beginners', 'checklist', 'vs'],
  },
}

/**
 * Terms a trending search must contain to be worth the model's attention.
 * Google's daily trends are mostly sport and television; this keeps the few
 * that touch China trade, shipping, tariffs or the platforms the audience buys on.
 */
export const RELEVANCE_TERMS = [
  'الصين',
  'صيني',
  'صينية',
  'استيراد',
  'الاستيراد',
  'شحن',
  'جمارك',
  'الجمارك',
  'تعرفة',
  'رسوم جمركية',
  'كانتون',
  'علي بابا',
  '1688',
  'تيمو',
  'شي إن',
  'شين',
  'مصنع',
  'مصانع',
  'مورد',
  'تاجر',
  'حاويات',
  'ميناء',
  'سابر',
  'هواوي',
  'بي واي دي',
  'شاومي',
  'تيك توك',
  'نون',
  'أمازون',
  'china',
  'chinese',
  'import',
  'export',
  'tariff',
  'customs',
  'duty',
  'shipping',
  'freight',
  'container',
  'port',
  'alibaba',
  'aliexpress',
  '1688',
  'temu',
  'shein',
  'canton',
  'yiwu',
  'shenzhen',
  'guangzhou',
  'factory',
  'supplier',
  'byd',
  'huawei',
  'xiaomi',
  'tiktok shop',
  'amazon',
  'noon',
  'saber',
  'sasO',
  'trade',
  'yuan',
  'rmb',
]

export function isRelevant(text: string): boolean {
  const lower = text.toLowerCase()
  return RELEVANCE_TERMS.some((term) => lower.includes(term.toLowerCase()))
}
