'use strict';
// Business data: services, prices, contact details, articles.
// Numbers the bot quotes come ONLY from here (never from the AI's own head).

const fs = require('fs');
const path = require('path');
const { tokens, normalize, hasAny } = require('./text');

const DATA = path.join(__dirname, '..', 'data');
const STATE_FILE = process.env.HGP_STATE || path.join(__dirname, '..', 'state.json');

const services = JSON.parse(fs.readFileSync(path.join(DATA, 'services.json'), 'utf8'));
const business = JSON.parse(fs.readFileSync(path.join(DATA, 'business.json'), 'utf8'));
let articles = [];
try { articles = JSON.parse(fs.readFileSync(path.join(DATA, 'articles.json'), 'utf8')); } catch { /* optional */ }

// Extra words customers actually type (Gulf Arabic + English), per service.
const KEYWORDS = {
  'full-import-management': 'استيراد استورد نستورد اورد بضاعه بضاعة كامل كامله من الالف الى الياء مستودع import importing whole process end to end door',
  'product-sourcing': 'توريد مورد موردين مصنع مصانع منتج منتجات ابحث دور لي سعر جمله جملة كميه source sourcing supplier suppliers factory product wholesale find',
  'manufacturing': 'تصنيع اصنع صناعه ماركه ماركة براند علامه خاصه تغليف لوقو شعار عينه manufacture manufacturing oem odm private label brand logo packaging sample',
  'quality-inspection': 'فحص افحص نفحص يفحص جوده جودة تفتيش مراقبه عيوب اتاكد المصنع حقيقي نصب inspection inspect quality qc check defects audit verify',
  'shipping-and-freight': 'شحن شحنه شحنة بحري جوي حاويه حاوية كونتينر تخليص جمركي جمارك نقل وصول ship shipping freight container sea air customs clearance delivery lcl fcl',
  'company-formation': 'تاسيس شركه شركة افتح شركه سجل شركة كيان wfoe company formation register incorporate setup open company entity',
  'ecommerce-launch': 'نون امازون أمازون شوبيفاي متجر الكتروني اونلاين تجاره الكترونيه noon amazon shopify ecommerce e-commerce online store fba',
  'business-consulting': 'استشاره استشارة نصيحه رايك مشوره جدوى consult consulting consultation advice opinion call meeting',
  'trade-fair-support': 'معرض معارض كانتون قوانزو مرافقه مترجم ترجمه canton fair exhibition trade fair translator guide accompany yiwu',
  'registered-address': 'عنوان مسجل ايجار عقد مقر virtual address office lease registered address',
  'business-licence-changes': 'تعديل رخصه رخصة ممثل قانوني نشاط راس المال تغيير عنوان licence license amendment change legal representative scope capital',
  'accounting-and-tax': 'محاسبه محاسب ضريبه ضرائب اقرار ضريبي تقرير سنوي accounting accountant tax bookkeeping annual report vat',
  'trademark-registration': 'علامه تجاريه علامة تجارية تسجيل ماركه براند حمايه trademark brand register protect ip',
  'bank-account-opening': 'حساب بنكي بنك فتح حساب مصرف هونغ كونغ هونج كونج bank account banking hong kong hk',
  'alipay-wechat-business-accounts': 'علي باي اليباي وي تشات ويشات دفع alipay wechat pay wechatpay payment account',
  'marketplace-store-setup': 'تيمو temu علي اكسبرس اليكسبرس علي بابا alibaba aliexpress amazon متجر store seller',
  'business-invitation-letter': 'دعوه دعوة خطاب دعوه رساله دعوة فيزا زياره تاشيره اعمال m invitation letter visa business visit',
  'business-visa': 'فيزا تاشيره تأشيرة اعمال متعدده سنه visa business multiple entry m visa',
  'work-visa-and-residence': 'كرت العمل كرت عمل اقامه إقامة تصريح عمل فيزا عمل z residence work permit work visa residency',
  'family-reunion-visa': 'لم شمل عائلتي زوجتي family reunion spouse wife s1 q1',
};

// Strong multi-word phrases: a hit here outweighs single shared words.
const PHRASES = {
  'quality-inspection': ['افحص', 'فحص البضاعه', 'فحص المصنع', 'قبل الشحن', 'مراقبه الجوده', 'quality check', 'inspection'],
  'alipay-wechat-business-accounts': ['علي باي', 'اليباي', 'وي تشات', 'ويشات باي', 'alipay', 'wechat pay'],
  'bank-account-opening': ['حساب بنكي', 'حساب بنك', 'bank account'],
  'trademark-registration': ['علامه تجاريه', 'تسجيل الماركه', 'تسجيل ماركه', 'اسجل ماركتي', 'اسجل الماركه', 'اسجل ماركه', 'اسجل العلامه', 'trademark', 'register my brand'],
  'business-visa': ['فيزا اعمال', 'فيزا الاعمال', 'تاشيره اعمال', 'تاشيره الاعمال', 'business visa', 'multiple entry'],
  'family-reunion-visa': ['لم شمل', 'لم الشمل', 'family reunion'],
  'business-invitation-letter': ['خطاب دعوه', 'رساله دعوه', 'invitation letter'],
  'work-visa-and-residence': ['كرت العمل', 'كرت عمل', 'تصريح عمل', 'اقامه عمل', 'work permit', 'residence permit'],
  'company-formation': ['تاسيس شركه', 'افتح شركه', 'فتح شركه', 'register a company', 'company formation'],
  'marketplace-store-setup': ['تيمو', 'علي اكسبرس', 'علي بابا', 'temu', 'aliexpress', 'alibaba store'],
  'ecommerce-launch': ['نون', 'امازون', 'شوبيفاي', 'noon', 'amazon', 'shopify'],
  'trade-fair-support': ['معرض كانتون', 'canton fair', 'مرافقه في المعرض'],
  'shipping-and-freight': ['شحن بحري', 'شحن جوي', 'الشحن البحري', 'الشحن الجوي', 'حاويه', 'sea freight', 'air freight', 'container'],
  'accounting-and-tax': ['اقرار ضريبي', 'محاسب', 'tax return', 'bookkeeping'],
  'registered-address': ['عنوان مسجل', 'مكتب افتراضي', 'virtual office', 'registered address'],
  'business-licence-changes': ['تعديل الرخصه', 'تغيير الممثل', 'change the legal representative'],
};

// ---------- persisted owner overrides (prices set with !price) ----------
let state = { priceOverrides: {}, hidden: {} };
try { state = Object.assign(state, JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))); } catch { /* first run */ }
function saveState() { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

function getService(slug) {
  return services.find(s => s.slug === slug) || null;
}

function priceOf(s) {
  if (Object.prototype.hasOwnProperty.call(state.priceOverrides, s.slug)) return state.priceOverrides[s.slug];
  return s.priceFrom;
}

function fmtNum(n) { return Number(n).toLocaleString('en-US'); }

const UNIT = {
  ar: { once: '', year: ' سنويًا', month: ' شهريًا', class: ' لكل فئة' },
  en: { once: '', year: ' per year', month: ' per month', class: ' per class' },
};

/** Price sentence built in code. null = no fixed price (quote after review). */
function priceText(s, lang = 'ar') {
  const p = priceOf(s);
  if (p === null || p === undefined) return null;
  const unit = UNIT[lang][s.priceUnit || 'once'] || '';
  // The extra wording (e.g. the remote-formation price) only goes with the website price, not an !price override.
  const extra = s.priceExtra && p === s.priceFrom ? ' ' + s.priceExtra[lang] : '';
  return lang === 'ar'
    ? `تبدأ من ${fmtNum(p)} يوان صيني (¥)${unit}${extra}`.replace(' ،', '،')
    : `from ¥${fmtNum(p)} (Chinese yuan)${unit}${extra}`.replace(' ,', ',');
}

function visible() { return services.filter(s => !state.hidden[s.slug]); }

function scoreService(s, qTokens) {
  const hay = new Set(tokens([s.slug.replace(/-/g, ' '), s.ar.title, s.en.title, KEYWORDS[s.slug] || ''].join(' ')));
  const body = new Set(tokens([s.ar.summary, s.en.summary, ...(s.ar.highlights || []), ...(s.en.highlights || [])].join(' ')));
  let score = 0;
  for (const t of qTokens) {
    if (hay.has(t)) score += 3;
    else if ([...hay].some(h => h.length > 4 && t.length > 4 && (h.startsWith(t) || t.startsWith(h)))) score += 2;
    else if (body.has(t)) score += 1;
  }
  return score;
}

/** Best matching services for free text. */
// Words that appear in almost every service, so they say nothing about which one.
const GENERIC = new Set(tokens('الصين صيني الصينيه china chinese service services خدمه خدمات your our نحن سؤال question بلدي country'));

function searchServices(query, limit = 5) {
  const q = tokens(query).filter(t => !GENERIC.has(t));
  if (!q.length) return [];
  return visible()
    .map(s => ({ s, score: scoreService(s, q) + (PHRASES[s.slug] && hasAny(query, PHRASES[s.slug]) ? 6 : 0) }))
    .filter(x => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.s);
}

function serviceCard(s, lang = 'ar', full = false) {
  const L = s[lang] || s.ar;
  const card = {
    slug: s.slug,
    title: L.title,
    category: (business.categories[s.category] || {})[lang] || s.category,
    summary: L.summary,
    price: priceText(s, lang) || (lang === 'ar' ? 'تُحدَّد الرسوم حسب الطلب، ونرسل عرض سعر بعد مراجعة التفاصيل' : 'Priced per request — quote after we review the details'),
    url: s.url[lang],
  };
  if (full) {
    card.details = L.body;
    card.highlights = L.highlights;
    if (L.faqs && L.faqs.length) card.faqs = L.faqs;
  }
  return card;
}

function listServices(lang = 'ar') {
  const byCat = {};
  for (const s of visible()) (byCat[s.category] = byCat[s.category] || []).push(s);
  return Object.entries(byCat).map(([cat, list]) => ({
    category: (business.categories[cat] || {})[lang] || cat,
    services: list.map(s => ({ slug: s.slug, title: (s[lang] || s.ar).title, price: priceText(s, lang) })),
  }));
}

function searchArticles(query, lang = 'ar', limit = 3) {
  const q = tokens(query);
  if (!q.length) return [];
  return articles
    .filter(a => a[lang] || a.ar)
    .map(a => {
      const L = a[lang] || a.ar;
      const t = new Set(tokens([L.title, L.keyword].join(' ')));
      const b = new Set(tokens([L.excerpt, ...(L.faqs || []).map(f => f.q)].join(' ')));
      let score = 0;
      for (const x of q) score += t.has(x) ? 3 : b.has(x) ? 1 : 0;
      return { a, L, score };
    })
    .filter(x => x.score >= 3)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(({ a, L }) => {
      const qn = new Set(q);
      const faqs = (L.faqs || [])
        .map(f => ({ f, s: tokens(f.q).filter(t => qn.has(t)).length }))
        .sort((x, y) => y.s - x.s).slice(0, 2).map(x => x.f);
      return { title: L.title, url: a[lang] ? a.url[lang] : a.url.ar, excerpt: L.excerpt, keyTakeaways: (L.takeaways || []).slice(0, 4), faqs };
    });
}

function businessInfo(lang = 'ar') {
  const b = business;
  const c = b.consultation;
  return {
    name: b.name[lang],
    tagline: b.tagline[lang],
    website: lang === 'en' ? b.website + '/en' : b.website,
    whatsapp: b.whatsapp,
    email: b.email,
    workingHours: b.hours[lang],
    offices: b.offices[lang],
    address: b.address[lang],
    replyTime: b.replyPromise[lang],
    consultation: {
      description: c.lead[lang],
      options: c.options.map(o => lang === 'ar' ? `${o.minutes} دقيقة: ${o.price} دولار` : `${o.minutes} minutes: $${o.price}`),
      note: c.note[lang],
      bookingLink: c.url[lang],
    },
    howItWorks: b.process[lang],
    founder: b.founder[lang],
    social: b.social,
  };
}

function setPrice(slug, value) {
  const s = getService(slug);
  if (!s) return false;
  // undefined = back to the website price; null = "no fixed price"; number = new starting price
  if (value === undefined) delete state.priceOverrides[slug];
  else state.priceOverrides[slug] = value;
  saveState();
  return true;
}

function setHidden(slug, hidden) {
  if (!getService(slug)) return false;
  if (hidden) state.hidden[slug] = true; else delete state.hidden[slug];
  saveState();
  return true;
}

/** Is the business open right now (China time)? */
function isOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: business.timezone, weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(date);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find(p => p.type === 'weekday').value);
  const h = Number(parts.find(p => p.type === 'hour').value) % 24;
  return business.workDays.includes(wd) && h >= business.workStart && h < business.workEnd;
}

module.exports = {
  services, business, getService, priceText, priceOf, searchServices, serviceCard, listServices,
  searchArticles, businessInfo, setPrice, setHidden, isOpen, normalize,
};
