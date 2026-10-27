'use strict';
// Rule-based brain. Used (1) as safety checks before the AI runs, and
// (2) as the whole bot when AI mode is off or the API is down.
// Pure functions — no WhatsApp, no network — so test.js can drive them.

const T = require('./texts');
const D = require('./data');
const { detectLang, hasAny, normalize } = require('./text');

// ---------- things that must ALWAYS go to the owner ----------
const HANDOFF_RULES = [
  { reason: 'payment', words: ['حولت', 'حوّلت', 'تحويل', 'دفعت', 'سددت', 'ايصال', 'إيصال', 'وصل الدفع', 'فاتوره', 'فاتورة', 'رقم الحساب', 'حسابكم البنكي', 'ارسلت المبلغ', 'أرسلت المبلغ', 'paid', 'payment sent', 'transferred', 'receipt', 'invoice', 'bank details', 'paypal', 'بايبال'] },
  { reason: 'discount / negotiation', words: ['خصم', 'تخفيض', 'نزل السعر', 'نزّل السعر', 'أقل سعر', 'اقل سعر', 'آخر سعر', 'اخر سعر', 'غالي', 'discount', 'cheaper', 'best price', 'last price', 'lower the price', 'negotiate', 'too expensive'] },
  { reason: 'complaint', words: ['شكوى', 'شكوي', 'اشتكي', 'عندي مشكله', 'صارت مشكله', 'تأخرت', 'تاخرت', 'متأخره', 'نصب', 'نصاب', 'احتيال', 'استرجاع', 'استرداد', 'رجعوا فلوسي', 'خربان', 'تالف', 'complaint', 'delayed', 'scam', 'refund', 'damaged', 'broken', 'angry', 'not happy', 'disappointed'] },
  { reason: 'existing order / shipment status', words: ['طلبي', 'شحنتي', 'بضاعتي', 'وين وصلت', 'وين الشحنه', 'رقم التتبع', 'my order', 'my shipment', 'my goods', 'tracking number', 'where is my', 'order status'] },
  { reason: 'asked for a person', words: ['ابغى اكلم', 'أبغى أكلم', 'ابي اكلم', 'ابغا اكلم', 'اريد التحدث', 'أريد التحدث', 'اكلم موظف', 'موظف حقيقي', 'شخص حقيقي', 'انسان حقيقي', 'اكلم سامي', 'الاستاذ سامي', 'اتصل بي', 'اتصلوا علي', 'كلمني', 'human', 'real person', 'call me', 'talk to sami', 'speak to someone', 'representative', 'talk to a person'] },
  { reason: 'contract / signing / order confirmation', words: ['العقد', 'نوقع', 'توقيع', 'اعتمد الطلب', 'موافق على العرض', 'خلنا نبدا', 'نبدا الشغل', 'contract', 'sign the', 'confirm the order', 'go ahead', 'lets start', 'let s start'] },
];

function mustHandoff(text) {
  for (const r of HANDOFF_RULES) if (hasAny(text, r.words)) return r.reason;
  return null;
}

// ---------- simple intents ----------
const INTENTS = {
  greeting: ['السلام عليكم', 'سلام عليكم', 'السلام', 'مرحبا', 'مرحبًا', 'اهلا', 'أهلا', 'هلا', 'صباح الخير', 'مساء الخير', 'hello', 'hi', 'hey', 'good morning', 'good evening', 'salam'],
  thanks: ['شكرا', 'شكرًا', 'مشكور', 'يعطيك العافيه', 'يعطيك العافية', 'جزاك الله', 'تسلم', 'thanks', 'thank you', 'thx'],
  menu: ['خدماتكم', 'الخدمات', 'وش تقدمون', 'ايش تقدمون', 'ماذا تقدمون', 'وش خدماتكم', 'قائمه', 'services', 'what do you do', 'what do you offer', 'menu'],
  price: ['سعر', 'السعر', 'بكم', 'كم التكلفه', 'كم التكلفة', 'تكلفه', 'تكلفة', 'كم يكلف', 'رسوم', 'اسعار', 'أسعار', 'price', 'cost', 'how much', 'fee', 'fees', 'rate'],
  contact: ['رقمكم', 'ايميل', 'الايميل', 'عنوانكم', 'وين مكتبكم', 'موقعكم', 'مكانكم', 'اوقات العمل', 'أوقات العمل', 'دوام', 'متى تفتحون', 'contact', 'email', 'address', 'location', 'office', 'working hours', 'open'],
  consultation: ['استشاره', 'استشارة', 'مكالمه', 'مكالمة', 'اجتماع', 'موعد', 'consultation', 'consult', 'meeting', 'appointment'],
  founder: ['من انتم', 'من أنتم', 'مين انتم', 'مين صاحب', 'المؤسس', 'سامي الحجري', 'who are you', 'founder', 'about you'],
};

function detectIntent(text) {
  const n = normalize(text);
  const short = n.split(' ').length <= 4;
  if (hasAny(text, INTENTS.thanks) && short) return 'thanks';
  if (hasAny(text, INTENTS.greeting) && short) return 'greeting';
  if (hasAny(text, INTENTS.menu)) return 'menu';
  if (hasAny(text, INTENTS.consultation)) return 'consultation';
  if (hasAny(text, INTENTS.founder)) return 'founder';
  if (hasAny(text, INTENTS.contact)) return 'contact';
  if (hasAny(text, INTENTS.price)) return 'price';
  if (hasAny(text, INTENTS.greeting)) return 'greeting';
  return null;
}

function menuText(lang) {
  const t = T[lang];
  const lines = [t.menuHead];
  for (const cat of D.listServices(lang)) {
    lines.push('', `*${cat.category}*`);
    for (const s of cat.services) lines.push(`• ${s.title}`);
  }
  lines.push('', t.menuTail);
  return lines.join('\n');
}

function serviceText(s, lang, withLink = true) {
  const t = T[lang];
  const c = D.serviceCard(s, lang);
  const out = [T.fill(t.serviceHead, c)];
  const p = D.priceText(s, lang);
  out.push(p ? T.fill(t.priceLine, { price: p }) + '\n' + t.priceNote : t.noFixedPrice);
  if (withLink) out.push(T.fill(t.moreLink, { url: c.url }));
  return out.join('\n\n');
}

function contactText(lang) {
  const i = D.businessInfo(lang);
  return T.fill(T[lang].contact, { whatsapp: i.whatsapp, email: i.email, address: i.address, hours: i.workingHours, website: i.website });
}

function consultationText(lang) {
  const c = D.businessInfo(lang).consultation;
  return T.fill(T[lang].consultation, { options: c.options.map(o => '• ' + o).join('\n'), note: c.note, link: c.bookingLink });
}

/** Handoff message shown to the customer (depends on office hours). */
function handoffText(lang, now = new Date()) {
  return D.isOpen(now) ? T[lang].handoff : T.fill(T[lang].handoffClosed, { hours: D.business.hours[lang] });
}

/**
 * Rule-mode reply.
 * @returns {{text:string, handoff:boolean, reason?:string, intent:string, lang:string}}
 */
function reply(text, ctx = {}) {
  const lang = detectLang(text) || ctx.lang || 'ar';
  const t = T[lang];
  const link = ctx.includeLinks !== false;

  const salam = lang === 'ar' && /السلام عليكم|سلام عليكم/.test(text) ? t.salam + '\n\n' : '';
  const hand = mustHandoff(text);
  if (hand) return { text: handoffText(lang, ctx.now), handoff: true, reason: hand, intent: 'handoff', lang };

  const intent = detectIntent(text);
  const found = D.searchServices(text, 3);

  if (intent === 'thanks') return { text: t.thanks, handoff: false, intent, lang };
  if (intent === 'greeting' && !found.length) {
    const hi = lang === 'ar' && /سلام/.test(text) ? t.salam + '\n' : '';
    return { text: hi + t.welcome + '\n\n' + t.offer, handoff: false, intent, lang };
  }
  if (intent === 'menu') return { text: salam + menuText(lang), handoff: false, intent, lang };
  if (intent === 'consultation' && !found.some(s => s.slug !== 'business-consulting')) return { text: consultationText(lang), handoff: false, intent, lang };
  if (intent === 'founder') return { text: t.founder, handoff: false, intent, lang };
  // "Where is your office / address?" is about us, not the registered-address service.
  const aboutUs = hasAny(text, ['وين', 'فين', 'اين', 'أين', 'عنوانكم', 'مكتبكم', 'مقركم', 'where', 'your address', 'your office', 'your location'])
    && !hasAny(text, ['عنوان مسجل', 'عنوان تجاري', 'مكتب افتراضي', 'لشركتي', 'registered address', 'virtual office', 'for my company']);
  if (intent === 'contact' && (!found.length || aboutUs)) return { text: contactText(lang), handoff: false, intent, lang };

  if (found.length) {
    const main = found[0];
    let out = salam + serviceText(main, lang, link);
    if (['product-sourcing', 'full-import-management', 'manufacturing', 'shipping-and-freight', 'quality-inspection'].includes(main.slug)) out += '\n\n' + t.qualify;
    return { text: out, handoff: false, intent: 'service:' + main.slug, lang, service: main.slug };
  }
  if (intent === 'price') return { text: t.askWhich, handoff: false, intent, lang };

  // Nothing understood → owner answers (and the bot learns from that answer).
  return { text: t.fallback, handoff: true, reason: 'not understood', intent: 'unknown', lang, unanswered: true };
}

module.exports = { reply, mustHandoff, detectIntent, detectLang, menuText, serviceText, contactText, consultationText, handoffText };
