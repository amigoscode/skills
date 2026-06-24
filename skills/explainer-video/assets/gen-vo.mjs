// gen-vo.mjs — generate per-scene voiceover with ElevenLabs, then convert to wav.
// Run from a video project dir that contains config.json and vo/lines.tsv.
//   ELEVEN_LABS=<key> node gen-vo.mjs
// Outputs vo/<id>.mp3, vo/<id>.wav, and vo/durs.json (measured durations).
import fs from 'fs';
import { execSync } from 'child_process';

const KEY = process.env.ELEVEN_LABS;
if (!KEY) { console.error('Set ELEVEN_LABS (your ElevenLabs API key).'); process.exit(1); }

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const VOICE = cfg.voiceId;
const MODEL = cfg.voiceModel || 'eleven_multilingual_v2';
const VS = cfg.voiceSettings || { stability: 0.3, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true };

const lines = fs.readFileSync('vo/lines.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
const durs = {};
for (const [id, , text] of lines) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: VS }),
  });
  if (!res.ok) { console.error(id, 'FAILED', res.status, await res.text()); process.exit(1); }
  fs.writeFileSync(`vo/${id}.mp3`, Buffer.from(await res.arrayBuffer()));
  execSync(`ffmpeg -y -i vo/${id}.mp3 -ar 44100 -ac 1 vo/${id}.wav -loglevel error`);
  durs[id] = +parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 vo/${id}.wav`).toString()).toFixed(3);
  console.log(id, 'ok', durs[id] + 's');
}
fs.writeFileSync('vo/durs.json', JSON.stringify(durs));
console.log('wrote vo/durs.json');
