'use strict';
// Offline tests — no WhatsApp, no real API calls.   node test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hgp-test-'));
process.env.HGP_STATE = path.join(tmp, 'state.json');
process.env.HGP_NO_HUBSPOT = '1'; // never write test chats to the real HubSpot
process.env.HGP_KNOWLEDGE = path.join(tmp, 'knowledge.json');

const B = require('./src/brain');
const D = require('./src/data');
const K = require('./src/knowledge');
const AI = require('./src/ai');
const { createEngine } = require('./src/engine');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message); }
}
const OPEN = new Date('2026-09-28T03:00:00Z');   // Monday 11:00 China time
const CLOSED = new Date('2026-09-26T14:00:00Z'); // Saturday 22:00 China time

(async () => {
  console.log('\nRule mode — real customer-style messages');
  const cases = [
    // [message, expected intent (prefix), handoff?]
    ['السلام عليكم', 'greeting', false],
    ['مرحبا', 'greeting', false],
    ['ايش خدماتكم؟', 'menu', false],
    ['ابغى استورد ملابس من الصين', 'service:full-import-management', false],
    ['ابي مورد اثاث من فوشان', 'service:product-sourcing', false],
    ['كم سعر تأسيس شركة في الصين؟', 'service:company-formation', false],
    ['ابغى افحص البضاعة قبل الشحن', 'service:quality-inspection', false],
    ['كم الشحن البحري لجدة؟ حاوية 40', 'service:shipping-and-freight', false],
    ['ابي خطاب دعوة لمعرض كانتون', 'service:business-invitation-letter', false],
    ['ودي افتح متجر على نون وامازون', 'service:ecommerce-launch', false],
    ['فتح حساب بنكي في هونغ كونغ', 'service:bank-account-opening', false],
    ['تسجيل علامة تجارية', 'service:trademark-registration', false],
    ['ابغى اقامة عمل في الصين', 'service:work-visa-and-residence', false],
    ['متى دوامكم؟', 'contact', false],
    ['وين مكتبكم؟', 'contact', false],
    ['كم سعر كرت العمل؟', 'service:work-visa-and-residence', false],
    ['ابغى استشارة', 'consultation', false],
    ['مين صاحب الشركة؟ من انتم', 'founder', false],
    ['شكرا لك', 'thanks', false],
    ['حولت المبلغ وهذا الايصال', 'handoff', true],
    ['ممكن تعطيني خصم؟', 'handoff', true],
    ['وين شحنتي؟', 'handoff', true],
    ['ابغى اكلم الاستاذ سامي', 'handoff', true],
    ['ما في مشكلة، كم سعر فتح حساب علي باي؟', 'service:alipay-wechat-business-accounts', false],
    ['Hello', 'greeting', false],
    ['What services do you offer?', 'menu', false],
    ['I need a sourcing agent for furniture', 'service:product-sourcing', false],
    ['How much is a business invitation letter?', 'service:business-invitation-letter', false],
    ['Can you help me register a company in Shenzhen?', 'service:company-formation', false],
    ['shipping a container from Yiwu to Dubai', 'service:shipping-and-freight', false],
    ['I want to translate my brochure', 'unknown', true], // must NOT be a "late" complaint; falls to owner
    ['I already paid, here is the receipt', 'handoff', true],
    ['Can I get a discount?', 'handoff', true],
    ['Do you sell gold bars?', 'unknown', true],
  ];
  for (const [msg, intent, handoff] of cases) {
    await test(`"${msg}" → ${intent}${handoff ? ' + owner' : ''}`, () => {
      const r = B.reply(msg, { now: OPEN });
      assert.ok(r.intent.startsWith(intent), `got ${r.intent}`);
      assert.strictEqual(r.handoff, handoff, `handoff=${r.handoff} (${r.reason})`);
      assert.strictEqual(r.lang, /[؀-ۿ]/.test(msg) ? 'ar' : 'en');
    });
  }

  console.log('\nPrices come from data, with the owner note');
  await test('company formation shows ¥7,200 in person / ¥8,200 remote + confirmation note', () => {
    const r = B.reply('كم سعر تأسيس شركة', { now: OPEN });
    assert.ok(r.text.includes('7,200') && r.text.includes('8,200 يوان للتأسيس عن بُعد'), r.text);
    assert.ok(r.text.includes('والسعر النهائي نؤكده لك'));
    assert.ok(B.reply('How much to register a company?', { now: OPEN }).text.includes('from ¥8,200 for remote formation'));
  });
  await test('work permit is "كرت العمل" at ¥7,600 plus ¥400 government fees', () => {
    const r = B.reply('كم سعر كرت العمل؟', { now: OPEN });
    assert.ok(r.text.includes('كرت العمل') && !r.text.includes('تأشيرة العمل'), r.text);
    assert.ok(r.text.includes('7,600 يوان صيني (¥)، تُضاف إليها رسوم حكومية 400 يوان'), r.text);
  });
  await test('bank account shows mainland and Hong Kong prices', () => {
    const r = B.reply('كم سعر فتح حساب بنكي؟', { now: OPEN });
    assert.ok(r.text.includes('1,400') && r.text.includes('1,700 يوان لحساب في هونغ كونغ'), r.text);
  });
  await test('"where is your office" gives the KK100 head office, not the registered-address service', () => {
    const r = B.reply('وين مكتبكم؟', { now: OPEN });
    assert.ok(r.text.includes('KK100') && r.text.includes('contact@higreenpanda.com'), r.text);
    assert.ok(B.reply('Where is your office?', { now: OPEN }).text.includes('Head office: 41F-35, Tower A, KK100'));
  });
  await test('sourcing has no fixed price and asks qualifying questions', () => {
    const r = B.reply('ابي مورد اثاث', { now: OPEN });
    assert.ok(/تختلف حسب المنتج/.test(r.text) && /الكمية/.test(r.text));
  });
  await test('handoff text mentions working hours when office is closed', () => {
    assert.ok(B.reply('حولت المبلغ', { now: CLOSED }).text.includes('09:00'));
    assert.ok(!B.reply('حولت المبلغ', { now: OPEN }).text.includes('09:00'));
  });
  await test('office hours (Mon–Fri 09–18): Mon 11:00 open, Sat 22:00 closed, Fri 11:00 open, Sun 11:00 closed', () => {
    assert.ok(D.isOpen(OPEN)); assert.ok(!D.isOpen(CLOSED));
    assert.ok(D.isOpen(new Date('2026-09-25T03:00:00Z')));
    assert.ok(!D.isOpen(new Date('2026-09-27T03:00:00Z')));
  });

  console.log('\nNumber guard');
  await test('rejects a price the tools never gave', () => {
    assert.deepStrictEqual(AI.unverifiedNumbers('السعر 4,500 يوان', 'priceFrom 6,000'), ['4500']);
  });
  await test('accepts tool prices with commas and Arabic digits', () => {
    assert.deepStrictEqual(AI.unverifiedNumbers('يبدأ من ٦٬٠٠٠ أو 6,000 يوان', '"price":"يبدأ من 6,000 يوان"'), []);
  });
  await test('small numbers (1–9) are allowed', () => {
    assert.deepStrictEqual(AI.unverifiedNumbers('خطوة 1 و 2', ''), []);
  });

  console.log('\nAI loop with a fake Claude API');
  const cfg = { ownerName: 'Sami', ai: { enabled: true, apiKey: 'test-key', model: 'fake', maxTokens: 500 }, handoffPauseHours: 6, ownerPauseHours: 2, historyMessages: 16, includeLinks: true, maxRepliesPerChatPerHour: 20 };
  function fakeClaude(script) {
    const calls = [];
    const f = async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      // messages must alternate and start with user
      body.messages.forEach((m, i) => assert.strictEqual(m.role, i % 2 === 0 ? 'user' : 'assistant', 'roles must alternate'));
      const step = script[calls.length - 1];
      if (!step) throw new Error('no more scripted steps');
      return { ok: true, json: async () => ({ content: step, stop_reason: step.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn' }) };
    };
    f.calls = calls;
    return f;
  }
  await test('tool call → tool_result → send_reply with the real price', async () => {
    const f = fakeClaude([
      [{ type: 'text', text: 'let me check' }, { type: 'tool_use', id: 't1', name: 'get_service', input: { slug: 'business-invitation-letter' } }],
      [{ type: 'tool_use', id: 't2', name: 'send_reply', input: { text: 'خطاب الدعوة يبدأ من 600 يوان صيني، والسعر النهائي يؤكده الفريق. من أي دولة جوازك؟', handoff: false, lead: { service: 'business-invitation-letter' } } }],
    ]);
    const r = await AI.reply(cfg, { history: [{ role: 'assistant', text: 'hi' }, { role: 'user', text: 'السلام عليكم' }, { role: 'assistant', text: 'وعليكم السلام' }], text: 'كم سعر خطاب الدعوة؟' }, f);
    assert.ok(r.text.includes('600'));
    assert.strictEqual(f.calls.length, 2);
    const tr = f.calls[1].messages.at(-1).content[0];
    assert.strictEqual(tr.type, 'tool_result'); assert.ok(tr.content.includes('600'));
  });
  await test('an invented number is blocked and handed to the owner', async () => {
    const f = fakeClaude([[{ type: 'tool_use', id: 'x', name: 'send_reply', input: { text: 'الشحن لجدة تقريبا 2500 دولار', handoff: false } }]]);
    const r = await AI.reply(cfg, { history: [], text: 'كم الشحن لجدة؟' }, f);
    assert.strictEqual(r.text, null); assert.ok(r.handoff);
  });
  await test('Gemini (OpenAI-compatible) loop: tool call → tool message → send_reply', async () => {
    const seen = [];
    const steps = [
      { choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'get_service', arguments: '{"slug":"trademark-registration"}' } }] } }] },
      { choices: [{ message: { content: null, tool_calls: [{ id: 'c2', type: 'function', function: { name: 'send_reply', arguments: JSON.stringify({ text: 'تسجيل العلامة يبدأ من 1,900 يوان لكل فئة، والسعر النهائي يؤكده الفريق.', handoff: false }) } }] } }] },
    ];
    const f = async (url, init) => {
      const body = JSON.parse(init.body); seen.push({ url, body, auth: init.headers.authorization });
      return { ok: true, json: async () => steps[seen.length - 1] };
    };
    const gcfg = Object.assign({}, cfg, { ai: { enabled: true, provider: 'gemini', apiKey: 'g-key', model: '' } });
    const r = await AI.reply(gcfg, { history: [], text: 'كم تسجيل العلامة التجارية؟' }, f);
    assert.ok(r.text.includes('1,900'));
    assert.ok(seen[0].url.startsWith('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'));
    assert.strictEqual(seen[0].body.model, 'gemini-2.5-flash');
    assert.strictEqual(seen[0].auth, 'Bearer g-key');
    assert.strictEqual(seen[0].body.messages[0].role, 'system');
    const last = seen[1].body.messages.at(-1);
    assert.strictEqual(last.role, 'tool'); assert.strictEqual(last.tool_call_id, 'c1'); assert.ok(last.content.includes('1,900') || last.content.includes('1900'));
  });
  await test('owner notes and learned answers are placed in the prompt', () => {
    K.addNote('المكتب مغلق في عطلة العيد الوطني');
    K.addExample('هل تشحنون إلى اليمن؟', 'نعم نشحن إلى عدن عن طريق البحر', 'ar');
    const p = AI.systemPrompt('ar', 'تشحنون لليمن؟', cfg);
    assert.ok(p.includes('العيد الوطني')); assert.ok(p.includes('عدن'));
  });

  console.log('\nEngine — full conversations');
  const eng = createEngine(cfg, { chatsFile: path.join(tmp, 'chats.json'), log: () => {} });
  await test('lead-ready reply pauses the chat and notifies the owner with a summary', async () => {
    const f = fakeClaude([[{ type: 'tool_use', id: 'a', name: 'send_reply', input: { text: 'تمام، الفريق بيجهز لك العرض ويتواصل معك هنا 🙏', handoff: true, lead_ready: true, handoff_reason: 'ready for quote', lead: { service: 'product-sourcing', product: 'كراسي مكتب', quantity: '500 قطعة', country: 'السعودية', budget: '20 ألف دولار', summary: 'توريد كراسي مكتب' } } }]]);
    const e2 = createEngine(cfg, { chatsFile: path.join(tmp, 'c2.json'), fetch: f, log: () => {} });
    const r = await e2.onCustomer({ chatId: 'L@c.us', number: '966511111111', name: 'Ahmed', text: 'ابي 500 كرسي مكتب للسعودية وميزانيتي 20 ألف دولار', now: OPEN.getTime() });
    assert.ok(r.reply.includes('العرض'));
    assert.ok(r.notify.includes('جاهز لعرض سعر') && r.notify.includes('كراسي مكتب') && r.notify.includes('السعودية'), r.notify);
    const again = await e2.onCustomer({ chatId: 'L@c.us', number: '966511111111', text: 'متى يوصل العرض؟', now: OPEN.getTime() + 60000 });
    assert.strictEqual(again.reply, null, 'bot must stay quiet while paused');
  });
  await test('payment message → handoff, bot pauses, second message only notifies owner', async () => {
    const t0 = OPEN.getTime();
    const r1 = await eng.onCustomer({ chatId: 'P@c.us', number: '971500000000', text: 'حولت المبلغ على الحساب', now: t0 });
    assert.ok(r1.reply && r1.notify.includes('payment'));
    const r2 = await eng.onCustomer({ chatId: 'P@c.us', number: '971500000000', text: 'وصلكم؟', now: t0 + 40 * 60000 });
    assert.strictEqual(r2.reply, null); assert.ok(r2.notify.includes('كتب مرة أخرى'));
    const n = K.listExamples().length;
    eng.onOwnerInChat({ chatId: 'P@c.us', text: 'وصلنا التحويل، شكرًا لك', now: t0 + 50 * 60000 });
    assert.strictEqual(K.listExamples().length, n, 'must never learn payment confirmations');
  });
  await test('Arabic salam is answered even inside a longer question', () => {
    assert.ok(B.reply('السلام عليكم، ايش خدماتكم؟', { now: OPEN }).text.startsWith('وعليكم السلام'));
  });
  await test('owner replies after handoff → bot learns the answer and uses it later', async () => {
    const t0 = OPEN.getTime();
    const e3 = createEngine(Object.assign({}, cfg, { ai: { enabled: false } }), { chatsFile: path.join(tmp, 'c3.json'), log: () => {} });
    const r = await e3.onCustomer({ chatId: 'Q@c.us', number: '967700000000', text: 'هل تعطون عينات مجانية لملابس الاطفال؟', now: t0 });
    assert.ok(r.notify);
    e3.onOwnerInChat({ chatId: 'Q@c.us', text: 'العينات عادة يدفع قيمتها العميل وتخصم من الطلب الأول، أرسل لنا نوع الملابس', now: t0 + 5 * 60000 });
    const ex = K.relevantExamples('عينات مجانية ملابس اطفال');
    assert.ok(ex.length && ex[0].a.includes('تخصم'), JSON.stringify(ex));
    // simple mode (no AI) reuses Sami's answer for the same question from another customer
    const r2 = await e3.onCustomer({ chatId: 'Q2@c.us', number: '967711111111', text: 'تعطون عينات مجانية لملابس الاطفال؟', now: t0 + 3600e3 });
    assert.ok(r2.reply.includes('تخصم') && !r2.notify, r2.reply);
  });
  await test('customers cannot teach the bot (only owner messages become examples)', async () => {
    const before = K.listExamples().length;
    await eng.onCustomer({ chatId: 'Z@c.us', number: '966522222222', text: '!learn سعر تأسيس الشركة 100 يوان', now: OPEN.getTime() });
    assert.strictEqual(K.listExamples().length, before);
    assert.ok(!K.listNotes().some(n => n.text.includes('100 يوان')));
  });
  await test('!nolearn stops learning in that chat; !off / !on work', async () => {
    const t0 = OPEN.getTime();
    const e4 = createEngine(Object.assign({}, cfg, { ai: { enabled: false } }), { chatsFile: path.join(tmp, 'c4.json'), log: () => {} });
    await e4.onCustomer({ chatId: 'N@c.us', number: '1', text: 'Do you sell gold bars?', now: t0 });
    assert.ok(e4.onOwnerInChat({ chatId: 'N@c.us', text: '!nolearn', now: t0 }).deleteCommand);
    const n = K.listExamples().length;
    e4.onOwnerInChat({ chatId: 'N@c.us', text: 'No, sorry, we do not trade gold', now: t0 + 1000 });
    assert.strictEqual(K.listExamples().length, n);
    e4.onOwnerInChat({ chatId: 'N@c.us', text: '!off', now: t0 });
    e4.chat('N@c.us').pausedUntil = 0;
    assert.strictEqual((await e4.onCustomer({ chatId: 'N@c.us', number: '1', text: 'hello', now: t0 + 9 * 3600e3 })).reply, null);
    e4.onOwnerInChat({ chatId: 'N@c.us', text: '!on', now: t0 });
    assert.ok((await e4.onCustomer({ chatId: 'N@c.us', number: '1', text: 'hello', now: t0 + 9 * 3600e3 })).reply);
  });
  await test('owner typing pauses the bot in that chat for 2 hours', async () => {
    const t0 = OPEN.getTime();
    eng.onOwnerInChat({ chatId: 'O@c.us', text: 'أهلا أخي، أنا سامي', now: t0 });
    assert.strictEqual((await eng.onCustomer({ chatId: 'O@c.us', number: '2', text: 'مرحبا', now: t0 + 60e3 })).reply, null);
    assert.ok((await eng.onCustomer({ chatId: 'O@c.us', number: '2', text: 'مرحبا', now: t0 + 2.1 * 3600e3 })).reply);
  });
  await test('voice note → asks to type + tells owner, bot keeps working', async () => {
    const r = await eng.onCustomer({ chatId: 'V@c.us', number: '3', text: '', media: 'voice', now: OPEN.getTime() });
    assert.ok(r.reply.includes('صوتية') && r.notify.includes('صوتية'));
    assert.ok((await eng.onCustomer({ chatId: 'V@c.us', number: '3', text: 'ابي استشارة', now: OPEN.getTime() + 1000 })).reply);
  });
  await test('photo / PDF → owner (could be a receipt)', async () => {
    const r = await eng.onCustomer({ chatId: 'M@c.us', number: '4', text: '', media: 'image', now: OPEN.getTime() });
    assert.ok(r.notify && r.notify.includes('ملفًا/صورة'));
  });
  await test('AI down → falls back to rule mode', async () => {
    const e5 = createEngine(cfg, { chatsFile: path.join(tmp, 'c5.json'), fetch: async () => ({ ok: false, status: 529, text: async () => 'overloaded' }), log: () => {} });
    const r = await e5.onCustomer({ chatId: 'F@c.us', number: '5', text: 'كم سعر تسجيل علامة تجارية', now: OPEN.getTime() });
    assert.ok(r.reply.includes('1,900'), r.reply);
  });
  await test('flood protection stops the bot after too many replies in an hour', async () => {
    const e6 = createEngine(Object.assign({}, cfg, { ai: { enabled: false }, maxRepliesPerChatPerHour: 3 }), { chatsFile: path.join(tmp, 'c6.json'), log: () => {} });
    let last;
    for (let i = 0; i < 4; i++) last = await e6.onCustomer({ chatId: 'X@c.us', number: '6', text: 'مرحبا', now: OPEN.getTime() + i * 1000 });
    assert.strictEqual(last.reply, null); assert.ok(last.notify.includes('رسائل كثيرة'));
  });

  console.log('\nOwner commands');
  await test('!price changes the quoted price, reset restores it, none removes it', async () => {
    assert.ok(eng.onCommand('!price company-formation 6500').includes('6,500'));
    assert.ok(B.reply('كم سعر تأسيس شركة', { now: OPEN }).text.includes('6,500'));
    assert.ok(eng.onCommand('!price company-formation reset').includes('7,200'));
    eng.onCommand('!price company-formation none');
    assert.ok(/تختلف حسب المنتج/.test(B.reply('كم سعر تأسيس شركة', { now: OPEN }).text));
    eng.onCommand('!price company-formation reset');
  });
  await test('!learn / !notes / !forget', () => {
    const n = K.listNotes().length;
    eng.onCommand('!learn نحن نعمل أيضًا في مدينة ييوو');
    assert.strictEqual(K.listNotes().length, n + 1);
    assert.ok(eng.onCommand('!notes').includes('ييوو'));
    eng.onCommand('!forget ' + (n + 1));
    assert.strictEqual(K.listNotes().length, n);
  });
  await test('!help, !status, !report, !leads, !unanswered, !services answer', () => {
    for (const c of ['!help', '!status', '!report', '!leads', '!unanswered', '!services', '!examples']) assert.ok(eng.onCommand(c), c);
    assert.strictEqual(eng.onCommand('!nonsense'), null);
  });
  await test('every service has Arabic + English text and a link', () => {
    for (const s of D.services) { assert.ok(s.ar.title && s.en.title && s.ar.summary && s.en.summary && s.url.ar, s.slug); }
    assert.strictEqual(D.services.length, 20);
  });

  console.log('\nHubSpot sync (fake HubSpot, no network)');
  const { phoneOf } = require('./src/hubspot');
  function fakeHubSpot(existing = {}) {
    const calls = []; let id = 100;
    const f = async (url, init) => {
      const body = init.body ? JSON.parse(init.body) : null;
      const p = url.replace('https://api.hubapi.com', '');
      calls.push({ method: init.method, p, body });
      const ok = j => ({ ok: true, status: 200, json: async () => j, text: async () => '' });
      if (p === '/crm/v3/objects/contacts/search') {
        const phone = body.filterGroups[0].filters[0].value;
        return ok({ results: existing[phone] ? [{ id: existing[phone] }] : [] });
      }
      if (init.method === 'POST') return ok({ id: String(++id) });
      return ok({});
    };
    return { f, calls };
  }
  const hsCfg = Object.assign({}, cfg, { ai: { enabled: false } });
  await test('phone numbers: real numbers kept, hidden @lid ids skipped', () => {
    assert.strictEqual(phoneOf('966501234567@c.us', '966501234567'), '+966501234567');
    assert.strictEqual(phoneOf('123456789012345@lid', '123456789012345'), null);
    assert.strictEqual(phoneOf('123456789012345@lid', '967771234567'), '+967771234567');
    assert.strictEqual(phoneOf('x@c.us', '12'), null);
  });
  await test('no token → nothing is sent to HubSpot', async () => {
    const hs = fakeHubSpot();
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h0.json'), log: () => {}, hubspotFetch: hs.f, hubspotToken: '' });
    await e.onCustomer({ chatId: '966500000001@c.us', number: '966500000001', name: 'Ali', text: 'السلام عليكم', now: OPEN.getTime() });
    await e.hubspot.syncSoon('966500000001@c.us');
    assert.strictEqual(hs.calls.length, 0);
    assert.ok(e.onCommand('!hubspot').includes('غير مربوط'));
  });
  await test('a handoff writes contact + note at once; more messages update the SAME note', async () => {
    const hs = fakeHubSpot();
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h1.json'), log: () => {}, hubspotFetch: hs.f, hubspotToken: 't' });
    const id = '966500000002@c.us';
    await e.onCustomer({ chatId: id, number: '966500000002', name: 'Naif Ali', text: 'كم سعر تأسيس شركة؟', now: OPEN.getTime() });
    await e.onCustomer({ chatId: id, number: '966500000002', name: 'Naif Ali', text: 'ابي اكلم سامي', now: OPEN.getTime() + 60000 });
    await e.hubspot.syncSoon(id);
    const created = hs.calls.filter(c => c.method === 'POST' && c.p === '/crm/v3/objects/contacts');
    assert.strictEqual(created.length, 1);
    assert.strictEqual(created[0].body.properties.phone, '+966500000002');
    assert.strictEqual(created[0].body.properties.firstname, 'Naif');
    const note = hs.calls.find(c => c.p === '/crm/v3/objects/notes');
    assert.ok(note.body.properties.hs_note_body.includes('Company Registration / 公司注册'));
    assert.ok(note.body.properties.hs_note_body.includes('Needs the team'));
    assert.ok(note.body.properties.hs_note_body.includes('ابي اكلم سامي'));
    assert.strictEqual(e.chat(id).hs.dirty, false);
    // the owner answers in the chat → same note is updated, no new contact
    e.onOwnerInChat({ chatId: id, text: 'هلا نايف، أنا سامي', now: OPEN.getTime() + 120000 });
    await e.hubspot.syncSoon(id);
    const patch = hs.calls.find(c => c.method === 'PATCH' && c.p.startsWith('/crm/v3/objects/notes/'));
    assert.ok(hs.calls.some(c => c.method === 'PATCH' && c.p.startsWith('/crm/v3/objects/contacts/') && c.body.properties.hgp_whatsapp_interest === 'hot'), 'marked hot');
    assert.ok(patch && patch.p.endsWith('/' + e.chat(id).hs.noteId));
    assert.ok(patch.body.properties.hs_note_body.includes('Team / 团队'));
    assert.strictEqual(hs.calls.filter(c => c.p === '/crm/v3/objects/contacts').length, 1);
    assert.strictEqual(hs.calls.filter(c => c.p === '/crm/v3/objects/deals').length, 0);
  });
  await test('a customer already in HubSpot (from the website) is reused, not duplicated', async () => {
    const hs = fakeHubSpot({ '+967771234567': '555' });
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h2.json'), log: () => {}, hubspotFetch: hs.f, hubspotToken: 't' });
    await e.onCustomer({ chatId: '967771234567@c.us', number: '967771234567', name: 'Saleh', text: 'مرحبا', now: OPEN.getTime() });
    await e.hubspot.syncSoon('967771234567@c.us');
    assert.strictEqual(hs.calls.filter(c => c.p === '/crm/v3/objects/contacts').length, 0);
    assert.strictEqual(hs.calls.find(c => c.p === '/crm/v3/objects/notes').body.associations[0].to.id, '555');
  });
  await test('after 24 h of silence the next chat gets a new note', async () => {
    const hs = fakeHubSpot();
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h3.json'), log: () => {}, hubspotFetch: hs.f, hubspotToken: 't' });
    const id = '971500000003@c.us';
    await e.onCustomer({ chatId: id, number: '971500000003', text: 'مرحبا', now: OPEN.getTime() });
    await e.hubspot.syncSoon(id);
    await e.onCustomer({ chatId: id, number: '971500000003', text: 'مرحبا مرة ثانية', now: OPEN.getTime() + 26 * 3600000 });
    await e.hubspot.syncSoon(id);
    assert.strictEqual(hs.calls.filter(c => c.method === 'POST' && c.p === '/crm/v3/objects/notes').length, 2);
    assert.ok(!e.chat(id).hs.lines.some(l => l.text === 'مرحبا'));
  });
  await test('a ready lead (AI mode) opens a deal at New Inquiry with service + company', async () => {
    const hs = fakeHubSpot();
    const f = fakeClaude([[{ type: 'tool_use', id: 'a', name: 'send_reply', input: { text: 'تمام، الفريق بيجهز لك العرض', handoff: true, lead_ready: true, handoff_reason: 'ready for quote', lead: { service: 'product-sourcing', product: 'كراسي', quantity: '500', country: 'السعودية', summary: 'توريد كراسي' } } }]]);
    const e = createEngine(cfg, { chatsFile: path.join(tmp, 'h4.json'), fetch: f, log: () => {}, hubspotFetch: hs.f, hubspotToken: 't' });
    await e.onCustomer({ chatId: '966500000004@c.us', number: '966500000004', name: 'Fahad', text: 'ابي 500 كرسي مكتب للسعودية', now: OPEN.getTime() });
    await e.hubspot.syncSoon('966500000004@c.us');
    const deal = hs.calls.find(c => c.p === '/crm/v3/objects/deals');
    assert.ok(deal, 'deal created');
    assert.strictEqual(deal.body.properties.hgp_service, 'product_sourcing');
    assert.strictEqual(deal.body.properties.our_company, 'nasher');
    assert.strictEqual(deal.body.properties.dealstage, '4392706760');
    assert.strictEqual(deal.body.properties.hgp_request_source, 'WhatsApp bot');
  });
  await test('interest level: "hello" only = cold, a service question = warm, never lowered', async () => {
    const hs = fakeHubSpot();
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h6.json'), log: () => {}, hubspotFetch: hs.f, hubspotToken: 't' });
    const id = '966500000006@c.us';
    const lvl = () => hs.calls.filter(c => c.method === 'PATCH' && c.p.startsWith('/crm/v3/objects/contacts/')).map(c => c.body.properties.hgp_whatsapp_interest);
    await e.onCustomer({ chatId: id, number: '966500000006', text: 'السلام عليكم', now: OPEN.getTime() });
    await e.hubspot.syncSoon(id);
    assert.deepStrictEqual(lvl(), ['cold']);
    await e.onCustomer({ chatId: id, number: '966500000006', text: 'كم سعر فتح حساب بنكي؟', now: OPEN.getTime() + 60000 });
    await e.hubspot.syncSoon(id);
    assert.deepStrictEqual(lvl(), ['cold', 'warm']);
    await e.onCustomer({ chatId: id, number: '966500000006', text: 'شكرا', now: OPEN.getTime() + 120000 });
    await e.hubspot.syncSoon(id);
    assert.deepStrictEqual(lvl(), ['cold', 'warm']);
  });
  await test('a level set by hand in HubSpot is not lowered by the bot', async () => {
    const hs = fakeHubSpot({ '+966500000007': '777' });
    const f = async (url, init) => {
      const r = await hs.f(url, init);
      if (url.endsWith('/contacts/search')) { const j = await r.json(); j.results.forEach(x => { x.properties = { hgp_whatsapp_interest: 'hot' }; }); return { ok: true, status: 200, json: async () => j }; }
      return r;
    };
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h7.json'), log: () => {}, hubspotFetch: f, hubspotToken: 't' });
    await e.onCustomer({ chatId: '966500000007@c.us', number: '966500000007', text: 'كم سعر فتح حساب بنكي؟', now: OPEN.getTime() });
    await e.hubspot.syncSoon('966500000007@c.us');
    assert.strictEqual(hs.calls.filter(c => c.method === 'PATCH' && c.p.includes('/contacts/')).length, 0);
  });
  await test('hubspotSkipCold: "hello" and gone is not written; writing more later writes the whole chat', async () => {
    const hs = fakeHubSpot();
    const e = createEngine(Object.assign({}, hsCfg, { hubspotSkipCold: true }), { chatsFile: path.join(tmp, 'h8.json'), log: () => {}, hubspotFetch: hs.f, hubspotToken: 't' });
    const id = '966500000008@c.us';
    await e.onCustomer({ chatId: id, number: '966500000008', text: 'السلام عليكم', now: OPEN.getTime() });
    await e.hubspot.syncSoon(id);
    assert.strictEqual(hs.calls.length, 0);
    await e.onCustomer({ chatId: id, number: '966500000008', text: 'ابي اسجل علامة تجارية', now: OPEN.getTime() + 60000 });
    await e.hubspot.syncSoon(id);
    const note = hs.calls.find(c => c.p === '/crm/v3/objects/notes');
    assert.ok(note && note.body.properties.hs_note_body.includes('السلام عليكم'));
  });
  await test('HubSpot down → the customer still gets the reply, the sync waits for a retry', async () => {
    const down = async () => ({ ok: false, status: 503, text: async () => 'down', json: async () => ({}) });
    const e = createEngine(hsCfg, { chatsFile: path.join(tmp, 'h5.json'), log: () => {}, hubspotFetch: down, hubspotToken: 't' });
    const r = await e.onCustomer({ chatId: '966500000005@c.us', number: '966500000005', text: 'ابي اكلم سامي', now: OPEN.getTime() });
    assert.ok(r.reply);
    await e.hubspot.syncSoon('966500000005@c.us');
    assert.strictEqual(e.chat('966500000005@c.us').hs.dirty, true);
    assert.ok(e.onCommand('!hubspot').includes('503'));
  });

  eng.flush();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
