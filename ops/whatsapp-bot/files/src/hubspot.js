'use strict';
// HubSpot CRM sync: every customer who talks to the bot becomes a HubSpot
// contact, and each conversation is saved on that contact as one note.
//
// Same contract as the website's sync (Higreenpanda1/web src/lib/hubspot.ts):
// nothing here may throw into the bot or slow a reply. If HubSpot is down or
// the token is wrong, the chat goes on and the sync is retried later.
//
// • Contacts are matched by WhatsApp number ("+<digits>" in `phone` or
//   `mobilephone`), the same rule the website uses, so a customer who writes on
//   WhatsApp and also fills a form on the site stays ONE contact.
// • One note per conversation (a conversation ends after 24 h of silence). The
//   note is written when the chat goes quiet for `idleMinutes`, or at once on a
//   handoff, and is updated in place as the conversation goes on.
// • A deal is opened only when the AI marks a lead ready for a quote (AI mode).
//
// Switched on by HUBSPOT_TOKEN (env, or the file hubspot.env next to bot.js).

const fs = require('fs');
const path = require('path');

const MIN = 60 * 1000;
const H = 60 * MIN;
const CONVERSATION_GAP = 24 * H;
const MAX_LINES = 300;
const MAX_NOTE = 60000; // HubSpot's limit is 65,536 characters

// HubSpot's fixed association type ids.
const ASSOC = { dealToContact: 3, noteToContact: 202, noteToDeal: 214 };

// Bot service slug → the deal property "Service / 服务" (hgp_service).
const SERVICE = {
  'full-import-management': 'full_import',
  'product-sourcing': 'product_sourcing',
  'manufacturing': 'manufacturing',
  'quality-inspection': 'quality_inspection',
  'shipping-and-freight': 'shipping',
  'trade-fair-support': 'trade_fair',
  'company-formation': 'company_registration',
  'ecommerce-launch': 'store_setup',
  'marketplace-store-setup': 'store_setup',
  'business-consulting': 'consultation',
  'registered-address': 'registered_address',
  'business-licence-changes': 'licence_changes',
  'accounting-and-tax': 'accounting',
  'trademark-registration': 'trademark',
  'bank-account-opening': 'bank_account',
  'alipay-wechat-business-accounts': 'alipay_wechat',
  'business-invitation-letter': 'invitation_letter',
  'business-visa': 'business_visa',
  'work-visa-and-residence': 'work_permit',
  'family-reunion-visa': 'family_visa',
};
// Same labels as the HubSpot property, so the note reads like the deal.
const SERVICE_LABEL = {
  company_registration: 'Company Registration / 公司注册', registered_address: 'Registered Address / 注册地址',
  accounting: 'Accounting & Tax / 会计及纳税申报', licence_changes: 'Licence Changes / 营业执照变更',
  bank_account: 'Bank Account / 银行开户', alipay_wechat: 'Alipay & WeChat Pay / 支付宝和微信支付',
  trademark: 'Trademark / 商标注册', work_permit: 'Work & Residence Permit / 工作许可和居留许可',
  business_visa: 'Business Visa / 商务签证', invitation_letter: 'Invitation Letter / 商务邀请函',
  family_visa: 'Family Reunion Visa / 家庭团聚签证', store_setup: 'Store Setup / 店铺开设',
  consultation: 'Consultation / 咨询', product_sourcing: 'Product Sourcing / 产品采购',
  manufacturing: 'Manufacturing / 生产制造', quality_inspection: 'Quality Inspection / 质量检验',
  shipping: 'Shipping & Freight / 运输与货运', trade_fair: 'Trade Fair Support / 展会陪同',
  full_import: 'Full Import Management / 全程进口管理',
};
// Trade services belong to Nasher, the rest to HiGP (deal property our_company).
const NASHER = new Set(['full_import', 'product_sourcing', 'manufacturing', 'quality_inspection', 'shipping', 'trade_fair']);

// How interested the customer is, kept on the contact as "WhatsApp interest / 兴趣"
// (hgp_whatsapp_interest) so the team can list the ones worth a reply. It only
// ever goes up, and never below what someone set by hand in HubSpot.
const LEVELS = ['cold', 'warm', 'hot'];
const rank = l => LEVELS.indexOf(l);

const ROLE = { user: 'Customer / 客户', assistant: 'Bot / 机器人', team: 'Team / 团队' };

function readToken(dir) {
  if (process.env.HUBSPOT_TOKEN) return process.env.HUBSPOT_TOKEN.trim();
  try {
    const line = fs.readFileSync(path.join(dir, 'hubspot.env'), 'utf8').split('\n').find(l => /^HUBSPOT_TOKEN=/.test(l));
    return line ? line.slice('HUBSPOT_TOKEN='.length).trim() : '';
  } catch { return ''; }
}

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "+<digits>" for a real phone number, null for anything else (e.g. a WhatsApp @lid id). */
function phoneOf(chatId, number) {
  const n = String(number || '').replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(n)) return null;
  const [user, server] = String(chatId || '').split('@');
  if (server === 'lid' && user === n) return null; // a hidden id, not a phone number
  return '+' + n;
}

function chinaTime(ms) {
  return new Date(ms).toLocaleString('en-GB', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

function splitName(name) {
  const [first = '', ...rest] = String(name || '').trim().split(/\s+/);
  return { firstname: first.slice(0, 100), lastname: rest.join(' ').slice(0, 100) };
}

/**
 * @param {object} o
 * @param {(id:string)=>object} o.chat   the engine's chat record getter
 * @param {object} o.store               the engine's store (to sweep chats on start)
 * @param {()=>void} o.save              persists chats.json
 * @param {(text:string)=>string[]} o.detectServices  bot service slugs mentioned in a text
 */
function createHubSpot(o) {
  const token = o.token !== undefined ? o.token : readToken(o.dir || path.join(__dirname, '..'));
  const fetchImpl = o.fetch || globalThis.fetch;
  const log = o.log || console.log;
  const idle = (o.idleMinutes || 30) * MIN;
  const ownerId = o.ownerId !== undefined ? o.ownerId : (process.env.HUBSPOT_OWNER_ID || '99402659');
  const pipeline = process.env.HUBSPOT_PIPELINE_ID || 'default';
  const newStage = process.env.HUBSPOT_NEW_STAGE_ID || '4392706760';
  // HGP_NO_HUBSPOT=1: the self-test and the terminal simulator never pick up the real token
  const enabled = !!token && o.enabled !== false && (o.token !== undefined || !process.env.HGP_NO_HUBSPOT);
  const timers = new Map();
  const queues = new Map();
  const status = { synced: 0, failed: 0, lastError: '', lastErrorAt: 0, lastOkAt: 0 };

  async function call(method, p, body) {
    const res = await fetchImpl('https://api.hubapi.com' + p, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`HubSpot ${method} ${p} → ${res.status} ${String(t).slice(0, 300)}`);
    }
    return res.status === 204 ? {} : res.json();
  }
  const assoc = (id, typeId) => ({ to: { id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: typeId }] });
  const owner = () => (ownerId ? { hubspot_owner_id: ownerId } : {});

  async function findOrCreateContact(phone, name) {
    const found = await call('POST', '/crm/v3/objects/contacts/search', {
      filterGroups: [
        { filters: [{ propertyName: 'phone', operator: 'EQ', value: phone }] },
        { filters: [{ propertyName: 'mobilephone', operator: 'EQ', value: phone }] },
      ],
      sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
      properties: ['phone', 'hgp_whatsapp_interest'],
      limit: 1,
    });
    const hit = found.results && found.results[0];
    if (hit) return { id: hit.id, level: hit.properties && hit.properties.hgp_whatsapp_interest || '' };
    const created = await call('POST', '/crm/v3/objects/contacts', {
      properties: Object.assign({ phone, lifecyclestage: 'lead' }, name ? splitName(name) : {}, owner()),
    });
    return { id: created.id, level: '' };
  }

  function servicesIn(h) {
    const slugs = new Set();
    if (h.lead && h.lead.service) slugs.add(h.lead.service);
    for (const s of o.detectServices ? o.detectServices(h.lines.filter(l => l.role === 'user').map(l => l.text).join('\n')) : []) slugs.add(s);
    return [...slugs];
  }

  /** hot = handed to the team or ready for a quote; warm = asked about a service or wrote 3+ messages; cold = the rest. */
  function levelOf(h) {
    if (h.handoff || h.leadReady) return 'hot';
    if (servicesIn(h).length || h.lines.filter(l => l.role === 'user').length >= 3) return 'warm';
    return 'cold';
  }

  function hs(c) { return (c.hs = c.hs || { lines: [] }); }

  // ---------- what the note says ----------
  function noteBody(c, h) {
    const lines = h.lines;
    const first = lines[0] ? lines[0].at : Date.now();
    const last = lines.length ? lines[lines.length - 1].at : first;
    const services = servicesIn(h).map(s => SERVICE_LABEL[SERVICE[s]] || s).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);

    const rows = [
      ['Name / 姓名', c.name || h.lead && h.lead.name || '—'],
      ['WhatsApp', h.phone],
      ['Language / 语言', c.lang === 'en' ? 'English / 英语' : 'Arabic / 阿拉伯语'],
    ];
    if (services.length) rows.push(['Interested in / 感兴趣的服务', services.join(', ')]);
    const L = h.lead || {};
    for (const [k, label] of [['summary', 'Request / 需求'], ['product', 'Product / 产品'], ['quantity', 'Quantity / 数量'], ['country', 'Country / 国家'], ['budget', 'Budget / 预算'], ['timeline', 'Timeline / 时间']]) {
      if (L[k]) rows.push([label, L[k]]);
    }
    if (h.leadReady) rows.push(['Status / 状态', 'Ready for a quote / 可以报价']);
    if (h.handoff) rows.push(['Needs the team / 需要人工', `${h.handoff.reason || 'yes'} (${chinaTime(h.handoff.at)})`]);

    const head = `<p><b>WhatsApp chat / WhatsApp 对话</b> – ${esc(chinaTime(first))} → ${esc(chinaTime(last))} (China time / 北京时间)</p>`;
    const list = `<ul>${rows.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>`;
    let talk = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const row = `<li>${esc(chinaTime(l.at).slice(-5))} <b>${esc(ROLE[l.role] || l.role)}:</b> ${esc(l.text).replace(/\n/g, '<br>')}</li>`;
      if (head.length + list.length + talk.length + row.length > MAX_NOTE - 200) { talk = '<li>…</li>' + talk; break; }
      talk = row + talk;
    }
    return `${head}${list}<p><b>Conversation / 对话记录</b></p><ul>${talk}</ul>`;
  }

  // ---------- the sync itself (one at a time per chat) ----------
  async function syncNow(chatId) {
    const c = o.chat(chatId);
    const h = hs(c);
    if (!h.dirty || !h.phone || !h.lines.length) return;
    const version = h.version || 0;
    const level = levelOf(h);
    // skipCold: a "hello" and gone is not written; if they write more it becomes warm and the whole chat is written then
    if (o.skipCold && level === 'cold' && !h.contactId) { h.dirty = false; o.save(); return; }
    try {
      if (!h.contactId) {
        const found = await findOrCreateContact(h.phone, c.name);
        h.contactId = found.id; h.levelSent = found.level; o.save();
      }
      if (rank(level) > rank(h.levelSent || '')) {
        // the level is a nice-to-have: if it can't be written, the note still is
        try {
          await call('PATCH', `/crm/v3/objects/contacts/${h.contactId}`, { properties: { hgp_whatsapp_interest: level } });
          h.levelSent = level;
        } catch (e) { log('[hubspot] interest level not saved:', e.message); }
      }

      const properties = Object.assign({ hs_timestamp: new Date(h.lines[0].at).toISOString(), hs_note_body: noteBody(c, h) }, owner());
      if (h.noteId) {
        try { await call('PATCH', `/crm/v3/objects/notes/${h.noteId}`, { properties }); }
        catch (e) { if (/→ 404/.test(e.message)) h.noteId = null; else throw e; } // deleted in HubSpot → write a new one
      }
      if (!h.noteId) {
        const note = await call('POST', '/crm/v3/objects/notes', { properties, associations: [assoc(h.contactId, ASSOC.noteToContact)] });
        h.noteId = note.id;
      }

      if (h.leadReady && !h.dealId) {
        const svc = SERVICE[h.lead && h.lead.service] || '';
        const deal = await call('POST', '/crm/v3/objects/deals', {
          properties: Object.assign({
            dealname: `${svc ? SERVICE_LABEL[svc] : 'WhatsApp request / WhatsApp 询价'} – ${c.name || h.phone} – WhatsApp`,
            pipeline, dealstage: newStage,
            hgp_request_source: 'WhatsApp bot',
            our_company: NASHER.has(svc) ? 'nasher' : 'higp',
          }, svc ? { hgp_service: svc } : {}, owner()),
          associations: [assoc(h.contactId, ASSOC.dealToContact), assoc(h.noteId, ASSOC.noteToDeal)].filter(a => a.to.id),
        });
        h.dealId = deal.id;
      }

      if ((h.version || 0) === version) h.dirty = false; // nothing new arrived while we were writing
      h.error = '';
      status.synced++; status.lastOkAt = Date.now();
      o.save();
    } catch (e) {
      status.failed++; status.lastError = e.message; status.lastErrorAt = Date.now();
      h.error = e.message.slice(0, 300);
      o.save();
      log('[hubspot] sync failed for', h.phone, '-', e.message);
      schedule(chatId, 15 * MIN); // try again later; the chat itself is unaffected
    }
  }

  function syncSoon(chatId) {
    if (!enabled) return Promise.resolve();
    const prev = queues.get(chatId) || Promise.resolve();
    const next = prev.then(() => syncNow(chatId)).catch(e => log('[hubspot] error', e.message));
    queues.set(chatId, next);
    return next;
  }

  function schedule(chatId, ms) {
    if (!enabled) return;
    clearTimeout(timers.get(chatId));
    const t = setTimeout(() => { timers.delete(chatId); syncSoon(chatId); }, ms);
    if (t.unref) t.unref();
    timers.set(chatId, t);
  }

  // ---------- what the engine calls ----------
  /** A line of the conversation: role = user | assistant | team. */
  function record(chatId, number, role, text, at = Date.now()) {
    if (!enabled || !text) return;
    const c = o.chat(chatId);
    const h = hs(c);
    if (!h.phone) h.phone = phoneOf(chatId, number || c.number);
    if (!h.phone) return;
    const lastAt = h.lines.length ? h.lines[h.lines.length - 1].at : 0;
    if (lastAt && at - lastAt > CONVERSATION_GAP) {
      // a new conversation → a new note (the old one is already in HubSpot or still pending)
      if (h.dirty) syncSoon(chatId);
      Object.assign(h, { lines: [], noteId: null, handoff: null, lead: null, leadReady: false, dealId: null });
    }
    h.lines.push({ role, text: String(text).slice(0, 1500), at });
    if (h.lines.length > MAX_LINES) h.lines.splice(0, h.lines.length - MAX_LINES);
    h.dirty = true; h.version = (h.version || 0) + 1;
    schedule(chatId, idle);
  }

  /** After the engine decided: handoff and ready leads go to HubSpot at once. */
  function update(chatId, { handoff, reason, lead, leadReady, at = Date.now() } = {}) {
    if (!enabled) return Promise.resolve();
    const c = o.chat(chatId);
    const h = hs(c);
    if (!h.phone) return Promise.resolve();
    if (lead && Object.keys(lead).length) h.lead = Object.assign({}, h.lead, lead);
    if (leadReady) h.leadReady = true;
    if (handoff) h.handoff = { reason: reason || '', at };
    if (handoff || leadReady) {
      h.dirty = true; h.version = (h.version || 0) + 1;
      clearTimeout(timers.get(chatId)); timers.delete(chatId);
      return syncSoon(chatId);
    }
    return Promise.resolve();
  }

  /** On start: anything not written before a restart is retried. */
  function resume() {
    if (!enabled) return;
    let n = 0;
    for (const [id, c] of Object.entries(o.store.chats || {})) if (c.hs && c.hs.dirty) { schedule(id, MIN + n * 5000); n++; }
    if (n) log(`[hubspot] ${n} chat(s) waiting to be written`);
  }

  function statusText() {
    if (!enabled) return '🔗 HubSpot: غير مربوط (لا يوجد مفتاح)';
    const chats = Object.values(o.store.chats || {}).filter(c => c.hs && c.hs.contactId).length;
    const waiting = Object.values(o.store.chats || {}).filter(c => c.hs && c.hs.dirty).length;
    return [
      '🔗 HubSpot: مربوط ✅',
      `👤 عملاء في HubSpot من البوت: ${chats}`,
      `⏳ محادثات تنتظر الحفظ: ${waiting} (تُحفظ بعد ${Math.round(idle / MIN)} دقيقة من آخر رسالة، أو فورًا عند التحويل لك)`,
      status.lastError ? `⚠️ آخر خطأ (${chinaTime(status.lastErrorAt)}): ${status.lastError.slice(0, 200)}` : '✔️ لا أخطاء منذ التشغيل',
    ].join('\n');
  }

  return { enabled, record, update, resume, syncSoon, statusText, status, _noteBody: noteBody };
}

module.exports = { createHubSpot, phoneOf, SERVICE };
