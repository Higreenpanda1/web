'use strict';
// Numbered menus and the quote-request flow (approved by the owner on 28 Oct 2026).
// The customer replies with a number, or types freely. Pure decisions on the chat
// state `c.menu`; no WhatsApp, no network, so test.js can drive every path.
//
// handle() returns { text, handoff?, reason?, lead?, leadReady?, unsure? } or null
// when the message is not for the menus (free text with no menu step waiting).

const D = require('./data');
const B = require('./brain');
const T = require('./texts');
const { hasAny, normalize } = require('./text');

const H = 3600 * 1000;
const STATE_TTL = 24 * H;   // a menu step older than this is forgotten
const RETURNING = 24 * H;   // a customer silent this long gets "welcome back"
const PORTAL = { ar: 'higreenpanda.com/portal/login', en: 'higreenpanda.com/en/portal/login' };

// Main menu order: the website's categories, then follow-up and a person.
const CATEGORIES = ['import', 'company', 'banking', 'visas', 'ecommerce', 'consulting'];
const FOLLOW = CATEGORIES.length + 1;
const HUMAN = CATEGORIES.length + 2;

// Services whose quote needs product / quantity / destination / budget.
const GOODS = new Set(['full-import-management', 'product-sourcing', 'manufacturing', 'quality-inspection', 'shipping-and-freight']);
// Retired services: asked about by name → a colleague answers, never a price.
const RETIRED_WORDS = ['تاشيره اعمال', 'تاشيره الاعمال', 'فيزا اعمال', 'فيزا الاعمال', 'فيزا تجاريه', 'business visa', 'multiple entry'];

const fill = T.fill;

function servicesIn(cat) {
  return D.visible().filter(s => s.category === cat).sort((a, b) => (a.order || 0) - (b.order || 0));
}
function catName(cat, lang) { return (D.business.categories[cat] || {})[lang] || cat; }

/** "1" / "١" / "1." / " 2 " → 1, 2 ; anything else → null */
function choice(text) {
  const n = normalize(text).replace(/\s/g, '');
  return /^\d{1,2}$/.test(n) ? Number(n) : null;
}

function mainMenu(lang, { salam = false, back = false } = {}) {
  const t = T[lang];
  const items = CATEGORIES.map((cat, i) => `${i + 1}. ${catName(cat, lang)}`);
  items.push(`${FOLLOW}. ${t.menuFollow}`, `${HUMAN}. ${t.menuHuman}`);
  const head = back ? t.welcomeBack : (salam ? t.salam + '\n' : '') + t.welcomeShort + '\n\n' + t.menuIntro;
  return [head, '', items.join('\n'), '', t.menuFree].join('\n');
}

function categoryMenu(cat, lang) {
  const t = T[lang];
  const list = servicesIn(cat).map((s, i) => `${i + 1}. ${(s[lang] || s.ar).title}`);
  return [fill(t.catHead, { category: catName(cat, lang) }), '', list.join('\n'), '', t.backMain].join('\n');
}

function serviceCard(s, lang) {
  const t = T[lang];
  const L = s[lang] || s.ar;
  const out = [`*${L.title}*\n${L.summary}`];
  const p = D.priceText(s, lang);
  if (p) out.push(fill(t.priceLine, { price: p }) + '\n' + t.priceNote);
  else if (s.slug === 'business-consulting') out.push(B.consultationText(lang));
  else out.push(t.noFixedPrice);
  out.push(fill(t.detailsLink, { url: s.url[lang] }));
  out.push(t.svcOptions);
  return out.join('\n\n');
}

function questions(slug) { return GOODS.has(slug) ? ['product', 'quantity', 'country', 'budget'] : ['nationality', 'details']; }
const ASK = { product: 'qProduct', quantity: 'qQuantity', country: 'qCountry', budget: 'qBudget', nationality: 'qNationality', details: 'qDetails' };

function summary(slug, answers, lang) {
  const t = T[lang];
  const s = D.getService(slug);
  const rows = [[t.labels.service, (s[lang] || s.ar).title], ...questions(slug).map(k => [t.labels[k], answers[k]])].filter(r => r[1]);
  return [t.summaryHead, rows.map(r => `${r[0]}: ${r[1]}`).join('\n'), '', t.summaryTail].join('\n');
}

function humanText(lang, now) {
  return D.isOpen(new Date(now)) ? T[lang].human : fill(T[lang].humanClosed, { hours: D.business.hours[lang] });
}

/**
 * @param c     the chat record (engine), holds c.menu and c.history
 * @param m     { text, media, now }
 * @param lang  'ar' | 'en'
 * @param opts  { ai: true } when the AI answers free questions: the menus then
 *              keep only numbers, menu steps, greetings and the retired service
 */
function handle(c, m, lang, opts = {}) {
  const now = m.now || Date.now();
  const text = String(m.text || '').trim();
  const t = T[lang];
  let st = c.menu && now - (c.menu.at || 0) < STATE_TTL ? c.menu : null;
  const set = s => { c.menu = s ? Object.assign(s, { at: now }) : null; };
  const lastSeen = c.history.length ? c.history[c.history.length - 1].at || 0 : 0;
  const firstContact = c.history.length === 0;
  const returning = !firstContact && now - lastSeen > RETURNING;
  const n = choice(text);

  // ---- a quote request in progress: every message is the next answer ----
  if (st && st.step === 'quote') {
    if (n === 0) { set({ step: 'main' }); return { text: mainMenu(lang) }; }
    const keys = questions(st.slug);
    const key = keys[st.i];
    // a photo sent after the product question belongs to the product: note it, ask again
    if (m.media && key !== 'product' && st.answers.product && !text) {
      if (!st.answers.product.includes(t.sentPhoto)) st.answers.product += ' ' + t.sentPhoto;
      set(st);
      return { text: t[ASK[key]] };
    }
    const answer = m.media && !text ? t.sentPhoto : (m.media ? `${text} ${t.sentPhoto}` : text);
    if (!answer) return null;
    st.answers[key] = answer.slice(0, 300);
    st.i += 1;
    if (st.i < keys.length) { set(st); return { text: t[ASK[keys[st.i]]] }; }
    const a = st.answers;
    set(null);
    const lead = { service: st.slug, product: a.product, quantity: a.quantity, country: a.country, budget: a.budget, nationality: a.nationality, summary: a.details };
    return { text: summary(st.slug, a, lang), handoff: true, leadReady: true, reason: 'طلب عرض سعر من القائمة', lead };
  }
  if (m.media) return null; // photos/files outside a quote → the engine's media rule

  // ---- waiting for a request number / name after "follow up" ----
  if (st && st.step === 'follow' && text && n === null) {
    set(null);
    return { text: humanText(lang, now), handoff: true, reason: `متابعة طلب قائم: ${text.slice(0, 120)}` };
  }

  // ---- a number answers the menu on screen ----
  if (n !== null && !firstContact && !returning) {
    const step = st ? st.step : 'main';
    if (n === 0) { set({ step: 'main' }); return { text: mainMenu(lang) }; }
    if (step === 'main' || step === 'follow') {
      if (n >= 1 && n <= CATEGORIES.length) {
        const cat = CATEGORIES[n - 1];
        const list = servicesIn(cat);
        if (list.length === 1) { set({ step: 'service', slug: list[0].slug }); return { text: serviceCard(list[0], lang) }; }
        set({ step: 'category', cat });
        return { text: categoryMenu(cat, lang) };
      }
      if (n === FOLLOW) { set({ step: 'follow' }); return { text: fill(t.follow, { portal: PORTAL[lang] }) }; }
      if (n === HUMAN) { set(null); return { text: humanText(lang, now), handoff: true, reason: 'طلب التحدث مع أحد الزملاء' }; }
      return { text: t.invalid };
    }
    if (step === 'category') {
      const s = servicesIn(st.cat)[n - 1];
      if (!s) return { text: t.invalid };
      set({ step: 'service', slug: s.slug });
      return { text: serviceCard(s, lang) };
    }
    if (step === 'service') {
      if (n === 1) { set({ step: 'quote', slug: st.slug, i: 0, answers: {} }); return { text: t[ASK[questions(st.slug)[0]]] }; }
      if (n === 2) {
        const s = D.getService(st.slug);
        set(null);
        return { text: humanText(lang, now), handoff: true, reason: `طلب التحدث مع أحد الزملاء عن: ${s.ar.title}`, lead: { service: st.slug } };
      }
      return { text: t.invalid };
    }
  }

  // ---- free text ----
  const salam = lang === 'ar' && /سلام/.test(text);
  if (hasAny(text, RETIRED_WORDS)) {
    set(null);
    return { text: B.handoffText(lang, new Date(now)), handoff: true, reason: 'سأل عن تأشيرة الأعمال (خدمة متوقفة)' };
  }
  const intent = B.detectIntent(text);
  const found = D.searchServices(text, 3);
  if (intent === 'thanks' && !firstContact) return { text: t.thanks };
  if (returning && (intent === 'greeting' || n !== null || !found.length)) { set({ step: 'main' }); return { text: mainMenu(lang, { back: true }) }; }
  if (intent === 'menu' || (intent === 'greeting' && !found.length) || n !== null) { set({ step: 'main' }); return { text: mainMenu(lang, { salam }) }; }
  if (opts.ai) return null; // a real question → the AI answers it
  if (intent === 'consultation' && !found.some(s => s.slug !== 'business-consulting')) {
    const s = D.getService('business-consulting');
    set({ step: 'service', slug: s.slug });
    return { text: (salam ? t.salam + '\n\n' : '') + serviceCard(s, lang) };
  }
  if (intent === 'founder') return { text: t.founder };
  if (intent === 'contact') {
    const r = B.reply(text, { lang });
    if (r.intent === 'contact') return { text: r.text };
  }
  if (found.length) {
    set({ step: 'service', slug: found[0].slug });
    return { text: (salam ? t.salam + '\n\n' : '') + serviceCard(found[0], lang) };
  }
  // a first message that is not a question ("؟", "hi there") gets the menu; a real question goes to the team
  if (firstContact && normalize(text).split(' ').length < 3) { set({ step: 'main' }); return { text: mainMenu(lang, { salam }) }; }
  return null; // not understood → the engine hands it to the team (and learns from the answer)
}

module.exports = { handle, mainMenu, categoryMenu, serviceCard, choice, CATEGORIES };
