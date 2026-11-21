# Nihongo Tabi 🇯🇵

A free, offline-capable Progressive Web App for learning **hiragana, katakana**
and the Japanese you actually need when travelling in Japan.
Built on the same engine as [Greek for Sailors](https://greek.sailingoroboro.com).

**Live app → [japanese.sailingoroboro.com](https://japanese.sailingoroboro.com)**

---

## What's in it

**Kana**
- Hiragana and katakana charts that colour in as you learn (new · learning · known)
- 14 learning units: the 10 basic rows, voiced kana (゛ ゜), combinations (きゃ…), extended katakana (ティ, ファ…)
- A mnemonic and an example word for every basic kana
- Reading and listening quizzes, a **Test out** button for rows you already know
- ⚡ Speed round (20 kana against the clock) and 👀 look-alike drill (シ/ツ, ソ/ン, ぬ/め…)

**Course**: 19 speaking chapters that follow the grammar order of the Paul Noble Japanese audio course
(Part 1 and Next Steps), with original sentences
- Each chapter shows which audio tracks it goes with: listen first, then drill
- 🗣 **Speaking drill**: read the English, say the Japanese out loud, reveal and hear it, grade yourself.
  Missed sentences come back at the end of the drill and go into Review

**Scenes**: 9 real-life situations, 2 lessons each
👋 Greetings · 🍜 Restaurant · 🏨 Hotel · 🗺️ Directions · 💬 Ice breakers ·
🥢 Dinner table · 🛒 Supermarket · 🏪 Konbini · 🛍️ Department store

- **They say / You say**: red lines are what staff say to you (train to understand),
  blue lines are what you say (polite です/ます form)
- Quick-reply chips under staff lines
- **Fading romaji**: romaji disappears for words whose kana you already know
- Lesson quiz and listening quiz with slow playback

**Review**: one spaced-repetition queue for kana, phrases and course sentences (Leitner boxes: 10 min → 1 day → 3 → 7 → 21 days).

---

## Features

- 🔊 Natural Japanese voice: pre-recorded Google Chirp 3 HD clips in `audio/` (one male voice for
  “you” lines, one female voice for “they” lines and kana). Anything without a clip falls back to the best
  voice on the device.
- 📱 Installable PWA that works offline (`sw.js`)
- 🌙 Dark mode, follows the system
- Zero dependencies: pure HTML, CSS and vanilla JS. Progress is saved in `localStorage`.

**Best voice on iPhone/Mac:** Settings → Accessibility → Spoken Content → Voices → Japanese →
download **Kyoko (Enhanced)** or **O-ren (Premium)**.

---

## Editing content

- `index.html` → `BASIC`: the 46 kana with romaji, mnemonics and example words
- `index.html` → `SCENES`: scenes → lessons → phrases
- `course.js` → `COURSE`: chapters → sentences, same format with `C(en, kana, romaji, kanji, {role, note})`

```js
P('they',                          // 'they' (heard) or 'you' (said)
  'おべんとう あたためますか？',     // kana, with spaces between words
  'obentou | atatamemasu ka?',     // romaji: one chunk per kana word, split by |
  'お弁当温めますか？',              // kanji form: sent to the voice, shown in a future kanji mode
  'Shall I heat up your bento?',   // English
  { note: '...', replies: ['はい、おねがいします'] })
```

Romaji uses doubled vowels that follow the kana: とおい → *tooi*, ありがとう → *arigatou*, コーヒー → *koohii*.

When you ship changes, bump `CACHE` in `sw.js` so installed copies update.

### Regenerating the audio

After adding or editing any Japanese text, run:

```sh
node tools/make-audio.mjs          # only fetches clips that are new or changed
```

It needs a Google Cloud Text-to-Speech API key in `~/.oroboro-tts-key` (never committed).
`--voices` lists available voices, `--samples` writes test clips to `tools/samples/`,
`--dry` counts what would be generated.

---

## Roadmap

- Role-play dialogues at the end of each scene
- Pattern cards (〜を ください, 〜は どこですか…)
- Stroke-order tracing
- Pitch-accent hints
- Optional kanji + furigana mode (kanji is already stored for every phrase)

---

## Project

Part of **Oroboro Language Courses**. MIT licensed.
