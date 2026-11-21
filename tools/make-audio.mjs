// Generates natural-voice MP3s for every Japanese text the app can speak,
// using Google Cloud Text-to-Speech (Chirp 3 HD voices).
//
//   node tools/make-audio.mjs              generate missing clips + audio/manifest.js
//   node tools/make-audio.mjs --voices     list the Japanese voices your key can use
//   node tools/make-audio.mjs --samples    write a few test sentences in several voices to tools/samples/
//   node tools/make-audio.mjs --dry        count what would be generated (no key needed)
//
// The API key is read from $GOOGLE_TTS_KEY or ~/.oroboro-tts-key and is never written into the app.
// Clips are named by a hash of (voice + text), so re-running only fetches what changed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'audio');
const VOICE_YOU = process.env.VOICE_YOU || 'ja-JP-Chirp3-HD-Iapetus';  // lines you say
const VOICE_THEY = process.env.VOICE_THEY || 'ja-JP-Chirp3-HD-Leda';   // lines you hear, kana, words

const KEY = process.env.GOOGLE_TTS_KEY || (() => {
  try { return fs.readFileSync(path.join(os.homedir(), '.oroboro-tts-key'), 'utf8').trim(); } catch { return ''; }
})();
const DRY = process.argv[2] === '--dry';
if (!KEY && !DRY) { console.error('No API key. Put it in ~/.oroboro-tts-key or set GOOGLE_TTS_KEY.'); process.exit(1); }

const API = 'https://texttospeech.googleapis.com/v1';

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function synth(text, voice, tries = 6) {
  for (let t = 1; ; t++) {
    try { return await synthOnce(text, voice); }
    catch (e) {
      // 429 = per-minute quota: wait and retry
      if (!/^429/.test(e.message) || t >= tries) throw e;
      await sleep(15000 * t);
    }
  }
}
async function synthOnce(text, voice) {
  const res = await fetch(`${API}/text:synthesize?key=${KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'ja-JP', name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from((await res.json()).audioContent, 'base64');
}

// ── Load the app's data without a browser ──
function loadData() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const start = html.lastIndexOf('<script>', html.indexOf('//  KANA DATA')) + '<script>'.length;
  const data = html.slice(start, html.indexOf('//  PROGRESS (localStorage)'));
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'course.js'), 'utf8') + '\n' + data +
    '\n;globalThis.__d = { KANA, PHRASES, PH_BY_KANA, COURSE_ITEMS };', ctx);
  return ctx.__d;
}

function collect() {
  const { KANA, PHRASES, PH_BY_KANA, COURSE_ITEMS } = loadData();
  const texts = new Map();   // text → voice (first role wins)
  const add = (t, voice) => { if (t && !texts.has(t)) texts.set(t, voice); };
  COURSE_ITEMS.forEach(it => add(it.say, it.role === 'they' ? VOICE_THEY : VOICE_YOU));
  PHRASES.forEach(p => add(p.say, p.role === 'they' ? VOICE_THEY : VOICE_YOU));
  PHRASES.forEach(p => (p.replies || []).forEach(r => { const q = PH_BY_KANA[r.replace(/\s/g, '')]; add(q ? q.say : r, VOICE_YOU); }));
  [...KANA.h, ...KANA.k].forEach(k => { add(k.ch, VOICE_THEY); add(k.w, VOICE_THEY); });
  add('こんにちは。日本語の勉強、頑張りましょう！', VOICE_THEY);
  return texts;
}

const fileFor = (text, voice) => crypto.createHash('sha1').update(voice + '\n' + text).digest('hex').slice(0, 12) + '.mp3';

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const j = i++; await fn(items[j], j); } }));
}

async function generate() {
  fs.mkdirSync(OUT, { recursive: true });
  const texts = collect();
  const manifest = {};
  const todo = [];
  for (const [text, voice] of texts) {
    const f = fileFor(text, voice);
    manifest[text] = f;
    if (!fs.existsSync(path.join(OUT, f))) todo.push([text, voice, f]);
  }
  console.log(`${texts.size} texts, ${todo.length} to generate (${todo.reduce((a, t) => a + t[0].length, 0)} characters).`);
  if (DRY) return;
  let done = 0, failed = 0;
  await pool(todo, 2, async ([text, voice, f]) => {
    try {
      fs.writeFileSync(path.join(OUT, f), await synth(text, voice));
      if (++done % 25 === 0) console.log(`  ${done} / ${todo.length}`);
    } catch (e) { failed++; delete manifest[text]; console.error(`  ✗ ${text}: ${e.message.slice(0, 200)}`); }
  });
  // Remove clips nothing points to any more
  const keep = new Set(Object.values(manifest));
  fs.readdirSync(OUT).filter(f => f.endsWith('.mp3') && !keep.has(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  fs.writeFileSync(path.join(OUT, 'manifest.js'),
    '// Generated by tools/make-audio.mjs. Maps spoken text to its clip.\nwindow.AUDIO_FILES = ' + JSON.stringify(manifest, null, 0) + ';\n');
  console.log(`Done: ${done} new, ${failed} failed. manifest.js has ${Object.keys(manifest).length} clips.`);
}

async function listVoices() {
  const res = await fetch(`${API}/voices?languageCode=ja-JP&key=${KEY}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  (await res.json()).voices.forEach(v => console.log(v.name.padEnd(28), v.ssmlGender));
}

async function samples() {
  const dir = path.join(ROOT, 'tools', 'samples');
  fs.mkdirSync(dir, { recursive: true });
  const lines = ['すみません、駅はどこですか？', 'インターネットでホテルの予約をしました。', 'いらっしゃいませ！何名様ですか？'];
  const voices = (process.env.SAMPLE_VOICES || 'Aoede,Kore,Leda,Zephyr,Charon,Fenrir,Orus,Puck').split(',').map(v => 'ja-JP-Chirp3-HD-' + v);
  for (const v of voices) {
    try { fs.writeFileSync(path.join(dir, v.split('-').pop() + '.mp3'), await synth(lines.join(' '), v)); console.log('✓', v); }
    catch (e) { console.error('✗', v, e.message.slice(0, 160)); }
  }
}

const arg = process.argv[2];
(arg === '--voices' ? listVoices() : arg === '--samples' ? samples() : generate()).catch(e => { console.error(e.message); process.exit(1); });
