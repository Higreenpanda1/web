'use strict';
// The bot's decision-making, separate from WhatsApp so it can be tested offline.
// bot.js feeds it events; it returns what to send (reply to customer, notice to owner).

const fs = require('fs');
const path = require('path');
const D = require('./data');
const K = require('./knowledge');
const B = require('./brain');
const AI = require('./ai');
const T = require('./texts');
const { createHubSpot } = require('./hubspot');
const { detectLang } = require('./text');

const H = 3600 * 1000;

function createEngine(cfg, opts = {}) {
  const chatsFile = opts.chatsFile || path.join(__dirname, '..', 'chats.json');
  const saveConfig = opts.saveConfig || (() => {});
  const fetchImpl = opts.fetch || globalThis.fetch;
  const log = opts.log || console.log;

  let store = { chats: {}, stats: {} };
  try { store = Object.assign(store, JSON.parse(fs.readFileSync(chatsFile, 'utf8'))); } catch { /* first run */ }
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fs.writeFileSync(chatsFile, JSON.stringify(store)), 500); };
  const flush = () => { clearTimeout(saveTimer); fs.writeFileSync(chatsFile, JSON.stringify(store)); };

  const chat = id => (store.chats[id] = store.chats[id] || { history: [], pausedUntil: 0, sent: [] });
  const hubspot = createHubSpot({
    chat, store, save, log, fetch: opts.hubspotFetch || globalThis.fetch, token: opts.hubspotToken,
    idleMinutes: cfg.hubspotIdleMinutes, enabled: cfg.hubspot !== false,
    detectServices: t => D.searchServices(t, 2).map(s => s.slug),
  });
  hubspot.resume();
  const day = now => new Date(now).toISOString().slice(0, 10);
  function stat(now, key, inc = 1) {
    const d = day(now);
    const s = (store.stats[d] = store.stats[d] || { chats: [], replies: 0, handoffs: 0, leads: 0, aiErrors: 0, learned: 0 });
    if (key === 'chat') { if (!s.chats.includes(inc)) s.chats.push(inc); } else s[key] = (s[key] || 0) + inc;
    const days = Object.keys(store.stats).sort();
    while (days.length > 60) delete store.stats[days.shift()];
  }

  function remember(c, role, text, now) {
    if (!text) return;
    c.history.push({ role, text: String(text).slice(0, 1500), at: now });
    const max = Math.max(4, cfg.historyMessages || 16);
    if (c.history.length > max) c.history.splice(0, c.history.length - max);
  }

  function who(c, number, name) { return `${name ? name + ' ' : ''}+${number}`; }

  function leadSummary(l, lang) {
    if (!l) return '';
    const s = l.service ? D.getService(l.service) : null;
    const rows = [
      ['الخدمة', s ? s.ar.title : l.service], ['الطلب', l.summary], ['المنتج', l.product], ['الكمية', l.quantity],
      ['الدولة', l.country], ['الميزانية', l.budget], ['الموعد', l.timeline], ['الاسم', l.name],
    ].filter(r => r[1]);
    return rows.map(r => `• ${r[0]}: ${r[1]}`).join('\n') + (lang ? `\n• اللغة: ${lang === 'ar' ? 'عربي' : 'إنجليزي'}` : '');
  }

  function ownerNotice(kind, c, info) {
    const head = {
      handoff: '🔔 *محادثة تحتاجك*',
      lead: '🟢 *عميل جاهز لعرض سعر*',
      again: '💬 *العميل كتب مرة أخرى*',
      media: '📎 *العميل أرسل ملفًا/صورة*',
      voice: '🎤 *العميل أرسل رسالة صوتية*',
      limit: '⚠️ *توقف البوت في محادثة (رسائل كثيرة)*',
    }[kind];
    const lines = [head, `العميل: ${info.who}`];
    if (info.reason) lines.push(`السبب: ${info.reason}`);
    if (info.text) lines.push(`آخر رسالة: «${String(info.text).slice(0, 400)}»`);
    const ls = leadSummary(info.lead, info.lang);
    if (ls) lines.push('', ls);
    if (kind !== 'again') lines.push('', `رد عليه مباشرة في محادثته — البوت متوقف فيها ${cfg.handoffPauseHours || 6} ساعات، ويتعلم من ردك.`);
    return lines.join('\n');
  }

  // Simple mode (no AI key): the fixed answers, plus Sami's own earlier answers
  // for questions the fixed answers don't cover — that is how it learns without AI.
  function ruleReply(text, lang, now) {
    const r = B.reply(text, { lang, includeLinks: cfg.includeLinks, now: new Date(now) });
    if (r.unanswered) {
      const ex = K.relevantExamples(text, 1, 0.6)[0];
      if (ex) return { text: ex.a, handoff: false, reason: 'owner answer reused' };
    }
    return { text: r.text, handoff: r.handoff, reason: r.reason, unsure: r.unanswered };
  }

  function pause(c, hours, now) { c.pausedUntil = Math.max(c.pausedUntil || 0, now + hours * H); }

  // ------------------------------------------------------------------
  /**
   * A customer's (buffered) message.
   * @param {{chatId, number, name, text, media?:'image'|'document'|'video'|'voice'|null, now?:number, saved?:boolean}} m
   * @returns {Promise<{reply:string|null, notify:string|null}>}
   */
  async function onCustomer(m) {
    const now = m.now || Date.now();
    const c = chat(m.chatId);
    const text = String(m.text || '').trim();
    c.number = m.number; if (m.name) c.name = m.name;
    const lang = detectLang(text) || c.lang || 'ar';
    c.lang = lang;
    const W = who(c, m.number, m.name);
    const out = { reply: null, notify: null };

    const record = () => {
      const line = m.media ? `[${m.media}] ${text}`.trim() : text;
      remember(c, 'user', line, now);
      hubspot.record(m.chatId, m.number, 'user', line, now);
    };

    if (cfg.paused || c.off) { record(); save(); return out; }

    if (c.pausedUntil > now) {
      record();
      if (c.awaitingOwner && (!c.lastAgainAt || now - c.lastAgainAt > 0.5 * H)) {
        c.lastAgainAt = now;
        out.notify = ownerNotice('again', c, { who: W, text: m.media ? `[${m.media}] ${text}` : text });
      }
      save();
      return out;
    }
    if (c.awaitingOwner && c.pausedUntil <= now) c.awaitingOwner = null; // pause ended, bot is back

    // flood / bot-loop protection
    c.sent = (c.sent || []).filter(t => now - t < H);
    if (c.sent.length >= (cfg.maxRepliesPerChatPerHour || 20)) {
      record(); pause(c, cfg.handoffPauseHours || 6, now);
      out.notify = ownerNotice('limit', c, { who: W, text });
      save(); return out;
    }

    stat(now, 'chat', m.chatId);
    let res;

    if (m.media === 'voice') {
      record();
      res = { text: T[lang].voice, handoff: false };
      out.notify = ownerNotice('voice', c, { who: W, text: 'رسالة صوتية — افتح المحادثة واسمعها' });
    } else if (m.media && m.media !== 'sticker' && cfg.mediaPolicy !== 'continue') {
      record();
      res = { text: B.handoffText(lang, new Date(now)), handoff: true, reason: `sent ${m.media}${text ? ' with caption' : ''} (could be a receipt/document)` };
    } else if (!text && !m.media) {
      return out;
    } else {
      const hand = B.mustHandoff(text);
      if (hand) {
        record();
        res = { text: B.handoffText(lang, new Date(now)), handoff: true, reason: hand };
      } else if (cfg.ai && cfg.ai.enabled && AI.hasKey(cfg)) {
        const history = c.history.slice();
        record();
        const q = m.media ? `[customer sent a ${m.media}] ${text}` : text;
        try {
          const r = await AI.reply(cfg, { history, text: q, lang }, fetchImpl);
          if (r.text === null) {
            log(`[guard] blocked AI reply for ${W}: ${r.reason} :: ${r.blocked}`);
            res = { text: B.handoffText(lang, new Date(now)), handoff: true, reason: 'البوت لم يكن متأكدًا من رقم — يحتاج ردك', unsure: true, lead: r.lead };
          } else {
            res = { text: r.text, handoff: r.handoff, reason: r.reason, lead: r.lead, leadReady: r.leadReady, unsure: r.handoff && !r.leadReady && /sure|unknown|cannot|not covered|outside|متأكد|لا اعرف/i.test(r.reason || '') };
          }
        } catch (e) {
          stat(now, 'aiErrors');
          log('[ai] error, using rule mode:', e.message);
          res = ruleReply(text, lang, now);
        }
      } else {
        record();
        res = ruleReply(text, lang, now);
      }
    }

    // lead tracking
    let lead = K.getLead(m.chatId);
    if (res.lead && Object.keys(res.lead).length) {
      const wasReady = lead && lead.ready;
      lead = K.upsertLead(m.chatId, Object.assign({ number: m.number, whatsappName: m.name, lang }, res.lead, res.leadReady ? { ready: 'yes' } : {}));
      if (res.leadReady && !wasReady) stat(now, 'leads');
    }

    if (res.handoff) {
      stat(now, 'handoffs');
      pause(c, cfg.handoffPauseHours || 6, now);
      // learn from the owner's answer only for knowledge gaps — never payments, discounts, complaints, orders
      c.awaitingOwner = { q: text || `[${m.media}]`, at: now, learnable: !!res.unsure };
      c.lastAgainAt = now;
      if (res.unsure) K.logUnanswered(text, m.number, res.reason);
      out.notify = ownerNotice(res.leadReady ? 'lead' : (m.media && m.media !== 'voice' ? 'media' : 'handoff'), c, { who: W, reason: res.reason, text: text || `[${m.media}]`, lead, lang });
    }

    out.reply = res.text || null;
    if (out.reply) {
      remember(c, 'assistant', out.reply, now);
      hubspot.record(m.chatId, m.number, 'assistant', out.reply, now);
      c.sent.push(now);
      stat(now, 'replies');
    }
    // HubSpot: a handoff or a ready lead is written at once, everything else when the chat goes quiet
    hubspot.update(m.chatId, { handoff: res.handoff, reason: res.reason, lead: res.lead, leadReady: res.leadReady, at: now });
    save();
    return out;
  }

  // ------------------------------------------------------------------
  /**
   * The owner typed in a customer chat (from his phone, not the bot).
   * @returns {{handled:boolean, deleteCommand?:boolean, confirm?:string}}
   */
  function onOwnerInChat({ chatId, text, now = Date.now() }) {
    const c = chat(chatId);
    const t = String(text || '').trim();
    const cmd = t.toLowerCase();
    if (cmd === '!off') { c.off = true; save(); return { handled: true, deleteCommand: true, confirm: '🤖 البوت متوقف في هذه المحادثة (اكتب ‎!on‎ لإعادته).' }; }
    if (cmd === '!on') { c.off = false; c.pausedUntil = 0; c.awaitingOwner = null; save(); return { handled: true, deleteCommand: true, confirm: '🤖 البوت عاد للعمل في هذه المحادثة.' }; }
    if (cmd === '!nolearn') { c.noLearn = true; save(); return { handled: true, deleteCommand: true, confirm: '🤖 لن يتعلم البوت من ردودك في هذه المحادثة.' }; }

    // owner is talking → bot steps back
    pause(c, cfg.ownerPauseHours || 2, now);
    remember(c, 'assistant', t, now);
    hubspot.record(chatId, c.number, 'team', t, now);

    // learn: owner answering a question the bot handed over
    if (c.awaitingOwner && c.awaitingOwner.learnable && !c.noLearn && now - c.awaitingOwner.at < 24 * H && t.length >= 4) {
      const a = c.ownerAnswer && now - c.ownerAnswer.at < 5 * 60 * 1000 && c.ownerAnswer.q === c.awaitingOwner.q
        ? c.ownerAnswer.a + '\n' + t : t;
      c.ownerAnswer = { q: c.awaitingOwner.q, a, at: now };
      if (!/^\[/.test(c.awaitingOwner.q) && K.addExample(c.awaitingOwner.q, a, c.lang)) stat(now, 'learned');
    }
    save();
    return { handled: true };
  }

  // ------------------------------------------------------------------
  /** Commands from the owner's "Message yourself" chat or an admin number. */
  function onCommand(text, now = Date.now()) {
    const [raw, ...rest] = String(text).trim().split(/\s+/);
    const cmd = raw.toLowerCase();
    const arg = rest.join(' ').trim();
    const persist = () => saveConfig(cfg);

    switch (cmd) {
      case '!help': return HELP;
      case '!status': {
        const paused = Object.values(store.chats).filter(c => c.pausedUntil > now).length;
        return [`🤖 البوت: ${cfg.paused ? '⏸️ متوقف' : '▶️ يعمل'}`, `🧠 الذكاء الاصطناعي: ${cfg.ai.enabled && AI.hasKey(cfg) ? 'مفعّل (' + AI.providerOf(cfg).name + ' / ' + AI.providerOf(cfg).model + ')' : 'متوقف — الوضع البسيط (بدون مفتاح)'}`,
          `🧪 وضع التجربة: ${cfg.testMode ? 'مفعّل — يرد فقط على: ' + cfg.testNumbers.join(', ') : 'متوقف — يرد على الجميع'}`,
          `🏢 المكتب الآن: ${D.isOpen(new Date(now)) ? 'مفتوح' : 'مغلق'}`, `⏳ محادثات متوقفة مؤقتًا: ${paused}`,
          `📚 ملاحظات: ${K.listNotes().length} • أمثلة متعلَّمة: ${K.listExamples().length} • أسئلة بلا جواب: ${K.listUnanswered().length}`,
          `🔗 HubSpot: ${hubspot.enabled ? 'مربوط' : 'غير مربوط'}`].join('\n');
      }
      case '!pause': cfg.paused = true; persist(); return '⏸️ البوت متوقف عن الرد على الجميع. ‎!resume‎ للتشغيل.';
      case '!resume': cfg.paused = false; persist(); return '▶️ البوت يعمل.';
      case '!ai':
        if (!/^(on|off)$/.test(arg)) return 'استخدم: ‎!ai on‎ أو ‎!ai off‎';
        cfg.ai.enabled = arg === 'on'; persist(); return arg === 'on' ? '🧠 الذكاء الاصطناعي مفعّل.' : '📋 وضع القواعد البسيطة (بدون ذكاء اصطناعي).';
      case '!test':
        if (!/^(on|off)$/.test(arg)) return 'استخدم: ‎!test on‎ أو ‎!test off‎';
        cfg.testMode = arg === 'on'; persist();
        return arg === 'on' ? `🧪 وضع التجربة: يرد فقط على ${cfg.testNumbers.join(', ')}` : '🚀 البوت الآن يرد على جميع العملاء.';
      case '!testadd': {
        const n = arg.replace(/\D/g, ''); if (n.length < 8) return 'استخدم: ‎!testadd 9665XXXXXXXX‎';
        cfg.testNumbers = [...new Set([...(cfg.testNumbers || []).filter(x => /^\d+$/.test(x)), n])]; persist(); return `✅ أضيف رقم التجربة ${n}`;
      }
      case '!services': case '!prices': {
        return D.services.map(s => `• ${s.slug} — ${s.ar.title}\n   ${D.priceText(s, 'ar') || 'بدون سعر ثابت'}`).join('\n') + '\n\nلتغيير سعر: ‎!price slug المبلغ‎  (أو ‎!price slug none‎ لإخفائه، ‎!price slug reset‎ للرجوع)';
      }
      case '!price': case '!set': {
        const [slug, val] = rest;
        if (!slug || !val || !D.getService(slug)) return 'استخدم: ‎!price company-formation 6500‎ — اكتب ‎!services‎ لرؤية الأسماء.';
        if (val === 'reset') { D.setPrice(slug, undefined); return `↩️ رجع سعر الموقع: ${D.priceText(D.getService(slug), 'ar') || 'بدون سعر ثابت'}`; }
        if (val === 'none') { D.setPrice(slug, null); return `✅ ${D.getService(slug).ar.title}: بدون سعر ثابت — سيقول البوت إن الفريق يرسل عرض السعر.`; }
        const n = Number(String(val).replace(/[,٬]/g, ''));
        if (!Number.isFinite(n) || n <= 0) return 'المبلغ غير صحيح.';
        D.setPrice(slug, n);
        return `✅ ${D.getService(slug).ar.title}: ${D.priceText(D.getService(slug), 'ar')}`;
      }
      case '!hide': return D.setHidden(arg, true) ? `🙈 أُخفيت الخدمة ${arg}` : 'اسم خدمة غير معروف.';
      case '!show': return D.setHidden(arg, false) ? `👁️ ظهرت الخدمة ${arg}` : 'اسم خدمة غير معروف.';
      case '!learn':
        if (arg.length < 5) return 'استخدم: ‎!learn المعلومة‎  مثال: ‎!learn المكتب مغلق في عطلة العيد الوطني من 1 إلى 7 أكتوبر‎';
        return `📚 حفظت الملاحظة رقم ${K.addNote(arg)}.`;
      case '!notes': {
        const n = K.listNotes(); return n.length ? n.map((x, i) => `${i + 1}. ${x.text}`).join('\n') : 'لا توجد ملاحظات. أضف بـ ‎!learn‎';
      }
      case '!forget': return K.forgetNote(Number(arg)) ? '🗑️ حُذفت الملاحظة.' : 'رقم غير صحيح. اكتب ‎!notes‎';
      case '!examples': {
        const e = K.listExamples();
        if (!e.length) return 'لم يتعلم البوت من ردودك بعد.';
        return e.slice(-15).map((x, i) => `${e.length - Math.min(15, e.length) + i + 1}. س: ${x.q.slice(0, 80)}\n   ج: ${x.a.slice(0, 120)}`).join('\n');
      }
      case '!delex': return K.deleteExample(Number(arg)) ? '🗑️ حُذف المثال.' : 'رقم غير صحيح. اكتب ‎!examples‎';
      case '!unanswered': {
        const u = K.listUnanswered().slice(-15);
        return u.length ? '❓ أسئلة لم يعرف البوت جوابها:\n' + u.map(x => `• ${x.q.slice(0, 120)}`).join('\n') + '\n\nعلّمه الجواب بـ ‎!learn‎' : 'لا توجد أسئلة بلا جواب 👍';
      }
      case '!leads': {
        const n = Math.min(Number(arg) || 10, 30);
        const l = K.listLeads().slice(-n).reverse();
        return l.length ? l.map(x => `${x.ready ? '🟢' : '⚪'} +${x.number}${x.name ? ' ' + x.name : ''} — ${x.summary || x.service || ''}${x.country ? ' — ' + x.country : ''}`).join('\n') : 'لا يوجد عملاء محتملون بعد.';
      }
      case '!hubspot': return hubspot.statusText();
      case '!report': {
        const d = day(now); const s = store.stats[d] || { chats: [], replies: 0, handoffs: 0, leads: 0, aiErrors: 0, learned: 0 };
        return [`📊 تقرير اليوم ${d}`, `محادثات: ${s.chats.length}`, `ردود البوت: ${s.replies}`, `تحويل لك: ${s.handoffs}`, `عملاء جاهزون لعرض سعر: ${s.leads}`, `تعلّم من ردودك: ${s.learned}`, `أخطاء الذكاء الاصطناعي: ${s.aiErrors}`].join('\n');
      }
      default: return null;
    }
  }

  return { onCustomer, onOwnerInChat, onCommand, flush, store, chat, hubspot };
}

const HELP = `🤖 *أوامر البوت* (اكتبها في محادثة "مراسلة نفسك")
‎!status‎ — الحالة
‎!pause‎ / ‎!resume‎ — إيقاف/تشغيل البوت للجميع
‎!test on|off‎ — وضع التجربة • ‎!testadd رقم‎
‎!ai on|off‎ — الذكاء الاصطناعي أو القواعد البسيطة
‎!services‎ — الخدمات والأسعار
‎!price slug مبلغ‎ — تغيير سعر بداية خدمة (none / reset)
‎!hide slug‎ / ‎!show slug‎ — إخفاء/إظهار خدمة
‎!learn معلومة‎ — علّم البوت معلومة • ‎!notes‎ • ‎!forget رقم‎
‎!examples‎ — ما تعلّمه من ردودك • ‎!delex رقم‎
‎!unanswered‎ — أسئلة لم يعرف جوابها
‎!leads‎ — العملاء المحتملون • ‎!report‎ — تقرير اليوم
‎!hubspot‎ — حالة الربط مع HubSpot

*داخل محادثة عميل:*
‎!off‎ إيقاف البوت فيها • ‎!on‎ إعادته • ‎!nolearn‎ لا تتعلم من ردودي هنا`;

module.exports = { createEngine, HELP };
