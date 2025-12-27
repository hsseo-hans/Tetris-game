// js/audio.js
import { playRetroSFX } from './retro_sound.js';

export let audioCtx = null;
let bgmSource = null;
let gainNode = null;
let isMuted = false;
let volume = 0.5;

// [배경음악 목록]
const BGM_FILES = {
    bgm_classicA: 'bgm/Tetris.mp3',
    bgm_troika: 'bgm/Tetris-Troika-tetis.mp3',
    bgm_bradinsky: 'bgm/Tetris-Bradinsky-tetis.mp3',
    bgm_loginska: 'bgm/Alexys-Loginska.mp3',
    bgm_karinka: 'bgm/Tetris-NES-Karinka.mp3'
};

const bgmBuffers = {};

export async function initAudio() {
    if(audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioCtx.destination);

    for(const [key, url] of Object.entries(BGM_FILES)) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            bgmBuffers[key] = await audioCtx.decodeAudioData(buf);
            console.log(`BGM Loaded: ${key}`);
        } catch(e) { 
            console.warn(`BGM Load Failed (${key}):`, e); 
        }
    }
}

export function playBGM(type) {
    if(isMuted || !audioCtx) return;
    stopBGM();
    
    const key = `bgm_${type}`;
    if(bgmBuffers[key]) {
        bgmSource = audioCtx.createBufferSource();
        bgmSource.buffer = bgmBuffers[key];
        bgmSource.loop = true;
        bgmSource.connect(gainNode);
        bgmSource.start(0);
    } else {
        console.warn(`BGM Key not found: ${key}`);
    }
}

// [추가됨] 랜덤 BGM 재생 함수
export function playRandomBGM() {
    if(isMuted || !audioCtx) return null;

    // 1. 등록된 키 목록을 가져옴 (['bgm_classicA', 'bgm_troika', ...])
    const keys = Object.keys(BGM_FILES);
    
    // 2. 랜덤 인덱스 선택
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    
    // 3. 'bgm_' 접두사를 제거하여 type 추출 (예: 'bgm_troika' -> 'troika')
    const type = randomKey.replace('bgm_', '');
    
    // 4. 재생 및 타입 반환
    playBGM(type);
    return type; 
}

export function stopBGM() {
    if(bgmSource) {
        try { bgmSource.stop(); } catch(e){}
        bgmSource = null;
    }
}

export function playSFX(key) {
    if(isMuted || !audioCtx) return;
    playRetroSFX(audioCtx, key, volume);
}

export function playEndSound(type) {
    stopBGM();
    playSFX(type);
}

export function toggleAudioMute(btn) {
    isMuted = !isMuted;
    if(isMuted) {
        if(gainNode) gainNode.gain.value = 0;
        btn.innerText = "🔇";
    } else {
        if(gainNode) gainNode.gain.value = volume;
        btn.innerText = "🔊";
    }
    return isMuted;
}

export function setAudioVolume(val) {
    volume = val / 100;
    if(gainNode && !isMuted) gainNode.gain.value = volume;
}