#!/usr/bin/env bash
# Premium SFX kit — layered, stereo, reverb-treated. All synthesized (royalty-free).
set -e
cd "$(dirname "$0")"
mkdir -p sfx
SR=48000

# ── POP: sub thump + tonal body (pitch-drop, 2 partials) + bright transient click ──
ffmpeg -y \
 -f lavfi -i "aevalsrc='sin(2*PI*(72*t+78*(1-exp(-55*t))/55))*exp(-17*t)':d=0.3:s=$SR" \
 -f lavfi -i "aevalsrc='(0.7*sin(2*PI*(185*t+760*(1-exp(-55*t))/55))+0.32*sin(4*PI*(185*t+760*(1-exp(-55*t))/55)))*exp(-25*t)':d=0.26:s=$SR" \
 -f lavfi -i "anoisesrc=d=0.022:c=white:a=0.85:r=$SR" \
 -filter_complex "[2]highpass=f=2200,afade=t=out:st=0:d=0.022,volume=0.45[clk]; \
   [0]volume=0.85[sub];[1]volume=1.0[bod]; \
   [sub][bod][clk]amix=inputs=3:normalize=0, \
   acompressor=threshold=-18dB:ratio=3:attack=1:release=70, \
   highpass=f=55,lowpass=f=9500, \
   aecho=0.9:0.85:17:0.16,volume=1.35, \
   pan=stereo|c0=c0|c1=c0" sfx/pop.wav -loglevel error

# ── WHOOSH: swelling band-passed noise + flanger movement + auto-pan width + tail ──
ffmpeg -y \
 -f lavfi -i "anoisesrc=d=0.52:c=pink:a=0.8:r=$SR" \
 -af "highpass=f=300,lowpass=f=6000,flanger=depth=5:speed=1.2:width=70, \
   afade=t=in:st=0:d=0.24:curve=tri,afade=t=out:st=0.24:d=0.28, \
   aecho=0.85:0.6:70|115:0.3|0.18, \
   acompressor=threshold=-20dB:ratio=2:attack=2:release=120, \
   pan=stereo|c0=c0|c1=c0,apulsator=mode=sine:hz=5:width=1.4,volume=1.2" \
 sfx/whoosh.wav -loglevel error

# ── TICK: crisp noise transient + tiny pitched blip, EQ-brightened ──
ffmpeg -y \
 -f lavfi -i "anoisesrc=d=0.045:c=white:a=0.85:r=$SR" \
 -f lavfi -i "aevalsrc='sin(2*PI*(950*t+1100*(1-exp(-60*t))/60))*exp(-80*t)':d=0.045:s=$SR" \
 -filter_complex "[0]highpass=f=1800,afade=t=out:st=0:d=0.045[n];[1]volume=0.5[s]; \
   [n][s]amix=inputs=2:normalize=0, \
   equalizer=f=3200:width_type=q:w=1.2:g=4, \
   aecho=0.9:0.8:11:0.13,volume=1.0,pan=stereo|c0=c0|c1=c0" \
 sfx/tick.wav -loglevel error

# ── CHIME: 3 staggered inharmonic bells (E5 G#5 B5) + long reverb + Haas width ──
bell() { echo "(sin(2*PI*$1*t)*exp(-4*t)+0.55*sin(2*PI*2.76*$1*t)*exp(-7*t)+0.32*sin(2*PI*5.4*$1*t)*exp(-11*t))"; }
ffmpeg -y \
 -f lavfi -i "aevalsrc='$(bell 659.25)':d=1.1:s=$SR" \
 -f lavfi -i "aevalsrc='$(bell 830.61)':d=1.1:s=$SR" \
 -f lavfi -i "aevalsrc='$(bell 987.77)':d=1.1:s=$SR" \
 -filter_complex "[0]adelay=0[a];[1]adelay=85[b];[2]adelay=180[c]; \
   [a][b][c]amix=inputs=3:normalize=0, \
   aecho=0.85:0.7:130|210:0.35|0.22, \
   equalizer=f=2500:width_type=q:w=1.5:g=3,volume=0.85, \
   pan=stereo|c0=c0|c1=c0,adelay=0|11" \
 sfx/chime.wav -loglevel error

# ── BOOM: outro sub impact (pitch-drop sine + soft saturation + tail) ──
ffmpeg -y \
 -f lavfi -i "aevalsrc='sin(2*PI*(58*t+34*(1-exp(-32*t))/32))*exp(-8*t)':d=0.6:s=$SR" \
 -f lavfi -i "anoisesrc=d=0.03:c=brown:a=0.5:r=$SR" \
 -filter_complex "[1]lowpass=f=400,afade=t=out:st=0:d=0.03,volume=0.4[imp]; \
   [0]volume=1.0[sub]; \
   [sub][imp]amix=inputs=2:normalize=0, \
   lowpass=f=190,acompressor=threshold=-16dB:ratio=4:attack=2:release=150, \
   aecho=0.9:0.75:50:0.2,volume=1.45,pan=stereo|c0=c0|c1=c0" \
 sfx/boom.wav -loglevel error

echo "durations:"
for f in pop whoosh tick chime boom; do printf "  %s\t%ss\n" "$f" "$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 sfx/$f.wav)"; done
