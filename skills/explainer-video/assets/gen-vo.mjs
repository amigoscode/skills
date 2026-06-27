// gen-vo.mjs — generate per-scene voiceover, then convert to wav.
// Run from a video project dir that contains config.json and vo/lines.tsv.
//   ELEVEN_LABS=<key> node gen-vo.mjs            # default voice from config
//   VOICE=free node gen-vo.mjs                   # a named voice from config.voices (Kokoro = free, no key)
//   VOICE=nelson ELEVEN_LABS=<key> node gen-vo.mjs
//   VOICE_ID=<rawId> node gen-vo.mjs             # one-off raw id (provider via VOICE_PROVIDER, default elevenlabs)
//
// Two engines:
//   elevenlabs — needs ELEVEN_LABS key (paid). voice value is a raw ElevenLabs voice id.
//   kokoro     — FREE, local, no key (via `npx hyperframes tts`). voice value is a Kokoro voice (e.g. bm_george).
// Outputs vo/<id>.wav (44100 mono), vo/<id>.mp3 (elevenlabs only), and vo/durs.json.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Load env keys (e.g. ELEVEN_LABS) without overriding anything already set in the
// shell. Precedence: shell environment > shared ~/amigoscode-skills/.env (one key
// file for every Amigoscode skill) > a local .env next to this script. Only fills
// variables that are not already defined, and the shared file is read first so it
// beats the skill-local fallback.
function loadEnvFile(p) {
  let text;
  try { text = fs.readFileSync(p, 'utf8'); } catch { return; }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let [, k, v] = m;
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}
loadEnvFile(path.join(os.homedir(), 'amigoscode-skills', '.env'));
loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'));

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const MODEL = cfg.voiceModel || 'eleven_multilingual_v2';
const VS = cfg.voiceSettings || { stability: 0.3, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true };

// A voices entry is either a string (an ElevenLabs id) or { provider, id }.
// provider defaults to "elevenlabs". Kokoro is the free local engine.
const voices = cfg.voices || {};
function norm(v, provider) {
  if (v == null) return null;
  if (typeof v === 'string') return { provider: provider || 'elevenlabs', id: v };
  return { provider: v.provider || provider || 'elevenlabs', id: v.id };
}
function resolveVoice() {
  if (process.env.VOICE_ID) return { ...norm(process.env.VOICE_ID, process.env.VOICE_PROVIDER), src: 'env VOICE_ID' };
  if (process.env.VOICE) {
    const v = voices[process.env.VOICE];
    if (!v) { console.error(`VOICE="${process.env.VOICE}" not in config.voices [${Object.keys(voices).join(', ') || 'none'}]`); process.exit(1); }
    return { ...norm(v), src: `env VOICE=${process.env.VOICE}` };
  }
  if (voices[cfg.voiceId]) return { ...norm(voices[cfg.voiceId]), src: `config voiceId="${cfg.voiceId}" (named)` };
  return { ...norm(cfg.voiceId, cfg.voiceProvider), src: 'config voiceId (raw id)' };
}
const { provider: PROVIDER, id: VOICE, src: VSRC } = resolveVoice();
if (!VOICE) { console.error('No voice resolved. Set config.voiceId / config.voices, or VOICE/VOICE_ID env.'); process.exit(1); }

const KEY = process.env.ELEVEN_LABS;
if (PROVIDER === 'elevenlabs' && !KEY) { console.error('elevenlabs voice needs ELEVEN_LABS (API key). Or pick a free Kokoro voice (e.g. VOICE=free).'); process.exit(1); }
console.log(`voice: ${VOICE} [${PROVIDER}] (${VSRC})`);

async function genElevenLabs(id, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: VS }),
  });
  if (!res.ok) { console.error(id, 'FAILED', res.status, await res.text()); process.exit(1); }
  fs.writeFileSync(`vo/${id}.mp3`, Buffer.from(await res.arrayBuffer()));
  execSync(`ffmpeg -y -i vo/${id}.mp3 -ar 44100 -ac 1 vo/${id}.wav -loglevel error`);
}

function genKokoro(id, text) {
  // pass text via a file so quotes/apostrophes never hit the shell
  const txt = `vo/${id}.txt`, raw = `vo/${id}.src.wav`;
  fs.writeFileSync(txt, text);
  execSync(`npx --yes hyperframes tts ${JSON.stringify(txt)} --voice ${JSON.stringify(VOICE)} --output ${JSON.stringify(raw)}`, { stdio: 'inherit' });
  execSync(`ffmpeg -y -i ${raw} -ar 44100 -ac 1 vo/${id}.wav -loglevel error`);
  fs.rmSync(raw, { force: true }); fs.rmSync(txt, { force: true });
}

const lines = fs.readFileSync('vo/lines.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
const durs = {};
for (const [id, , text] of lines) {
  if (PROVIDER === 'kokoro') genKokoro(id, text);
  else await genElevenLabs(id, text);
  durs[id] = +parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 vo/${id}.wav`).toString()).toFixed(3);
  console.log(id, 'ok', durs[id] + 's');
}
fs.writeFileSync('vo/durs.json', JSON.stringify(durs));
console.log('wrote vo/durs.json');
