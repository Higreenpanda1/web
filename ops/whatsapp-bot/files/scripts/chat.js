'use strict';
// Talk to the bot in the terminal, without WhatsApp.
//   node scripts/chat.js            → you are a customer
//   type  !owner <text>            → reply as the owner in this chat (teaches the bot)
//   type  !cmd <command>           → run an owner command, e.g. "!cmd !report"
//   type  /quit                    → exit
// Uses the real config.json (AI mode if the API key is set) but separate test files.

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hgp-chat-'));
process.env.HGP_STATE = path.join(tmp, 'state.json');
process.env.HGP_NO_HUBSPOT = '1'; // never write test chats to the real HubSpot
process.env.HGP_KNOWLEDGE = path.join(__dirname, '..', 'knowledge.json'); // shared with the real bot so !learn notes apply

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
const envKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
if (envKey && /PASTE/.test(cfg.ai.apiKey)) cfg.ai.apiKey = envKey;
const AI = require('../src/ai');
cfg.handoffPauseHours = 0; // keep talking in the simulator even after a handoff
const { createEngine } = require('../src/engine');
const engine = createEngine(cfg, { chatsFile: path.join(tmp, 'chats.json'), log: (...a) => console.log('   [log]', ...a) });

console.log(`HiGreenPanda bot simulator — ${cfg.ai.enabled && AI.hasKey(cfg) ? 'AI mode (' + AI.providerOf(cfg).name + ' / ' + AI.providerOf(cfg).model + ')' : 'simple mode (no AI key)'}. Type /quit to exit.\n`);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'customer> ' });
rl.prompt();
rl.on('line', async line => {
  const t = line.trim();
  if (t === '/quit') { engine.flush(); process.exit(0); }
  if (t.startsWith('!owner ')) {
    engine.onOwnerInChat({ chatId: 'sim@c.us', text: t.slice(7) });
    console.log('   (owner replied — bot paused here; learned if it was a handed-off question)\n');
  } else if (t.startsWith('!cmd ')) {
    console.log(engine.onCommand(t.slice(5)) || 'unknown command', '\n');
  } else if (t) {
    const media = { '[photo]': 'image', '[voice]': 'voice', '[pdf]': 'document' }[t];
    const res = await engine.onCustomer({ chatId: 'sim@c.us', number: '966500000000', name: 'Test', text: media ? '' : t, media: media || null });
    engine.chat('sim@c.us').pausedUntil = 0;
    if (res.reply) console.log('\nbot> ' + res.reply.replace(/\n/g, '\n     ') + '\n');
    if (res.notify) console.log('   [to owner] ' + res.notify.replace(/\n/g, '\n              ') + '\n');
  }
  rl.prompt();
});
