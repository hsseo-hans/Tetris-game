import { BGM_DATA } from './constants.js';

export const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
let bgmInterval = null;
let volume = 0.1;
let isMuted = false;

export function initAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function setAudioVolume(v) { volume = v / 100; }
export function toggleAudioMute(btnEl) { 
    isMuted = !isMuted; 
    btnEl.innerText = isMuted ? "🔇" : "🔊";
    return isMuted;
}

export function playBGM(trackKey) {
    if (isMuted) return;
    stopBGM();
    
    const track = BGM_DATA[trackKey] || BGM_DATA.classicA;
    const { melody, bass, tempo, style } = track;
    
    let idx = 0;
    let bassIdx = 0;

    bgmInterval = setInterval(() => {
        if (melody[idx]) playNote(melody[idx], style, tempo/1000 * 0.9, 0.15);
        if (bass && bass.length > 0) {
            const bassNote = bass[Math.floor(bassIdx) % bass.length];
            if(bassNote && idx % 2 === 0) playNote(bassNote, 'bass', 0.2, 0.1);
            bassIdx += 0.5;
        }
        idx = (idx + 1) % melody.length;
    }, tempo);
}

export function stopBGM() { 
    if (bgmInterval) clearInterval(bgmInterval); 
    bgmInterval = null; 
}

function playNote(freq, style, dur, gainMod = 1) {
    if (isMuted || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator(); 
        const gain = audioCtx.createGain();
        const t = audioCtx.currentTime;
        osc.frequency.value = freq;
        osc.connect(gain); gain.connect(audioCtx.destination);
        
        let v = volume;
        if (style === 'pluck') {
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(v * gainMod * 1.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.8);
        } else if (style === 'synth') {
            osc.type = 'square';
            gain.gain.setValueAtTime(v * gainMod, t);
        } else if (style === 'classic') {
            osc.type = 'square';
            gain.gain.setValueAtTime(v * gainMod * 0.8, t);
            gain.gain.linearRampToValueAtTime(0, t + dur * 0.9);
        } else if (style === 'bass') {
            osc.type = 'triangle';
            gain.gain.setValueAtTime(v * gainMod, t);
            gain.gain.linearRampToValueAtTime(0, t + dur);
        } else {
            osc.type = 'sine';
            gain.gain.setValueAtTime(v * gainMod, t);
        }
        osc.start(t); osc.stop(t + dur);
    } catch(e){}
}

export function playSFX(type) {
    if (isMuted || !audioCtx) return;
    try {
        const now = audioCtx.currentTime; const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination); g.gain.value = volume * 0.3;
        if(type==='count') { o.frequency.setValueAtTime(600, now); o.stop(now+0.1); }
        else if(type==='drop') { o.type='triangle'; o.frequency.setValueAtTime(150, now); o.stop(now+0.1); }
        else if(type==='clear') { o.type='square'; o.frequency.setValueAtTime(400, now); o.frequency.linearRampToValueAtTime(800, now+0.1); o.stop(now+0.2); }
        else if(type==='attack') { o.type='sawtooth'; o.frequency.setValueAtTime(100, now); o.stop(now+0.3); }
        else if(type==='start') { o.frequency.setValueAtTime(400, now); o.frequency.exponentialRampToValueAtTime(800, now+0.5); o.stop(now+0.5); }
        o.start(now);
    } catch(e){}
}

export function playEndSound(type) {
    if (isMuted || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        if (type === 'win') {
            for(let i=0; i<5; i++) setTimeout(() => {
                const t = audioCtx.currentTime;
                const o1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
                o1.frequency.setValueAtTime(200, t); o1.frequency.linearRampToValueAtTime(800, t+0.1);
                g1.gain.setValueAtTime(volume*0.1, t); g1.gain.linearRampToValueAtTime(0, t+0.1);
                o1.connect(g1); g1.connect(audioCtx.destination); o1.start(t); o1.stop(t+0.1);
                const o2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
                o2.type = 'sawtooth'; o2.frequency.setValueAtTime(50+Math.random()*50, t+0.1);
                g2.gain.setValueAtTime(volume*0.3, t+0.1); g2.gain.exponentialRampToValueAtTime(0.01, t+0.4);
                o2.connect(g2); g2.connect(audioCtx.destination); o2.start(t+0.1); o2.stop(t+0.4);
            }, i*300);
        } else {
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(80, now + 1.5);
            gain.gain.setValueAtTime(volume * 0.3, now); gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.connect(gain); gain.connect(audioCtx.destination); osc.start(now); osc.stop(now + 1.5);
        }
    } catch(e){}
}