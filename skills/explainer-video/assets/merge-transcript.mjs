// merge-transcript.mjs — merge per-scene Whisper transcripts onto the video timeline.
// Pre: vo/lines.tsv has the FINAL scene start times in column 2 (run patch-time.mjs first),
//      and each scene has been transcribed to vo/<id>.json (a flat [{text,start,end},...] array).
// Outputs transcript.json (word-level, video timeline) and captions-data.js (window.CAPTION_WORDS).
import fs from 'fs';

const lines = fs.readFileSync('vo/lines.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
const out = [];
let wi = 0;
for (const [id, start] of lines) {
  const off = parseFloat(start);
  const words = JSON.parse(fs.readFileSync(`vo/${id}.json`, 'utf8'));
  for (const w of words) {
    out.push({ id: `w${wi++}`, text: w.text, start: +(w.start + off).toFixed(3), end: +(w.end + off).toFixed(3), scene: id });
  }
}
fs.writeFileSync('transcript.json', JSON.stringify(out, null, 2));
const compact = out.map(x => ({ t: x.text, s: x.start, e: x.end, sc: x.scene }));
fs.writeFileSync('captions-data.js', 'window.CAPTION_WORDS = ' + JSON.stringify(compact) + ';\n');
console.log(`merged ${out.length} words; span ${out[0].start}s .. ${out[out.length - 1].end}s`);
