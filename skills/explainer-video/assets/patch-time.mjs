// patch-time.mjs — re-fit the whole composition timeline to the measured VO durations.
// Run from a video project dir. Reads:
//   config.json          (pad, overlap, sfx tracks/durations/volumes)
//   vo/durs.json         ({s1:5.06, s2:.., ...} measured by gen-vo.mjs)
//   vo/sfx-events.json   (optional) [{sfx:"pop", scene:"s3", at:2.0, vol?:0.6}, ...]
// Patches index.html scene/audio/const/CH_T/root/overlay/caption-clamp timing,
// regenerates the SOUND EFFECTS block, and writes the final scene starts back into vo/lines.tsv.
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const PAD = cfg.scenePad ?? 0.55;
const OVERLAP = cfg.sceneCrossfade ?? 0.4;
const SFX_DUR = { pop: 0.3, whoosh: 0.55, tick: 0.056, chime: 1.45, boom: 0.65, ...(cfg.sfxDurations || {}) };
const SFX_TRK = { pop: 8, whoosh: 7, tick: 11, chime: 9, boom: 12, ...(cfg.sfxTracks || {}) };
const SFX_VOL = { pop: 0.5, whoosh: 0.4, tick: 0.35, chime: 0.34, boom: 0.18, transition: 0.22, ...(cfg.sfxVolumes || {}) };

const vodur = JSON.parse(fs.readFileSync('vo/durs.json', 'utf8'));
const ids = Object.keys(vodur).sort((a, b) => +a.slice(1) - +b.slice(1));
const durs = {}, starts = {};
let t = 0;
for (const id of ids) { durs[id] = +(vodur[id] + PAD).toFixed(2); starts[id] = +t.toFixed(2); t = +(starts[id] + durs[id] - OVERLAP).toFixed(2); }
const last = ids[ids.length - 1];
const TOTAL = +(starts[last] + durs[last]).toFixed(2);

let h = fs.readFileSync('index.html', 'utf8');
for (const id of ids) {
  h = h.replace(new RegExp(`(<div id="${id}" class="scene clip" data-start=")[^"]*(" data-duration=")[^"]*(")`), `$1${starts[id]}$2${durs[id]}$3`);
  const n = id.slice(1);
  h = h.replace(new RegExp(`(<audio id="vo${n}"[^>]*?data-start=")[^"]*("[^>]*?data-duration=")[^"]*(")`), `$1${starts[id]}$2${+vodur[id].toFixed(2)}$3`);
  if (id !== 's1') h = h.replace(new RegExp(`(const ${id} = )[0-9.]+(;)`), `$1${starts[id]}$2`);
}
h = h.replace(/const CH_T = \[[^\]]*\];/, `const CH_T = [${ids.map(id => starts[id]).join(', ')}];`);
h = h.replace(/(data-composition-id="main" data-start="0" data-duration=")[^"]*(")/, `$1${TOTAL}$2`);
for (const el of ['watermark', 'chapter', 'captions']) h = h.replace(new RegExp(`(id="${el}"[^>]*?data-duration=")[^"]*(")`), `$1${TOTAL}$2`);
h = h.replace(/Math\.min\(gEnd \+ 0\.3, [0-9.]+\)/, `Math.min(gEnd + 0.3, ${(TOTAL - 0.02).toFixed(2)})`);

// ── SFX block ──
const events = [];
const abs = (scene, at) => scene === 'abs' ? at : +(starts[scene] + at).toFixed(3);
// auto transition whoosh at each scene start (except the first)
if (cfg.autoTransitions !== false) ids.slice(1).forEach(id => events.push({ sfx: 'whoosh', t: starts[id], vol: SFX_VOL.transition }));
let userEvents = [];
try { userEvents = JSON.parse(fs.readFileSync('vo/sfx-events.json', 'utf8')); } catch {}
for (const e of userEvents) events.push({ sfx: e.sfx, t: abs(e.scene, e.at ?? 0), vol: e.vol ?? SFX_VOL[e.sfx], track: e.track });
// assign tracks; pops alternate 8/10 within a scene so their tails ring out
const popCount = {};
for (const e of events) {
  if (e.track) continue;
  if (e.sfx === 'pop') { const k = Math.floor(e.t); popCount[k] = (popCount[k] || 0) + 1; e.track = (popCount[k] % 2) ? SFX_TRK.pop : 10; }
  else e.track = SFX_TRK[e.sfx];
}
events.sort((a, b) => a.t - b.t || a.track - b.track);
const tags = events.map((e, i) => `      <audio id="sfx${i + 1}" class="clip" src="sfx/${e.sfx}.wav" data-start="${+e.t.toFixed(3)}" data-duration="${SFX_DUR[e.sfx]}" data-track-index="${e.track}" data-volume="${e.vol}"></audio>`).join('\n');
h = h.replace(/( *<!-- SFX_START -->)[\s\S]*?( *<!-- SFX_END -->)/, `$1\n${tags}\n      $2`);

fs.writeFileSync('index.html', h);
// keep transcript offsets in sync for the caption merge
const lines = fs.readFileSync('vo/lines.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
lines.forEach(p => { p[1] = String(starts[p[0]]); });
fs.writeFileSync('vo/lines.tsv', lines.map(p => p.join('\t')).join('\n') + '\n');
console.log('total', TOTAL + 's | scenes', ids.length, '| sfx', events.length);
