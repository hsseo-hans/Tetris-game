// js/audio.js

export let audioCtx = null;
let bgmSource = null;
let gainNode = null;
let isMuted = false;
let volume = 0.5;

// [수정됨] 1개의 외부 링크 + 4개의 로컬 파일 (bgm 폴더)
const SOUNDS = {
    // 1. 기존 유지 (외부 링크)
    bgm_classicA: 'https://archive.org/download/TetrisThemeMusic/Tetris.mp3',
    
    // 2. 로컬 파일 (bgm 폴더 안의 파일들)
    // 주의: 파일명이 PC에 있는 것과 띄어쓰기/대소문자까지 정확히 일치해야 합니다.
    bgm_troika: 'bgm/Tetris-Troika-tetis.mp3',
    bgm_bradinsky: 'bgm/Tetris-Bradinsky-tetis.mp3',
    bgm_loginska: 'bgm/Alexys-Loginska.mp3',
    bgm_karinka: 'bgm/Tetris-NES-Karinka.mp3',
    
    // 효과음 (기존 유지)
    start: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    drop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    clear: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    attack: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    count: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
    lose: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
    swoosh: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
};

const buffers = {};

export async function initAudio() {
    if(audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioCtx.destination);

    // 사운드 파일 로딩
    for(const [key, url] of Object.entries(SOUNDS)) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            buffers[key] = await audioCtx.decodeAudioData(buf);
            console.log(`Sound loaded: ${key}`);
        } catch(e) { 
            console.warn(`Sound load fail (${key} at ${url}):`, e); 
        }
    }
}

export function playBGM(type) {
    if(isMuted || !audioCtx) return;
    stopBGM();
    
    // index.html의 value와 매칭 (예: troika -> bgm_troika)
    const key = `bgm_${type}`;
    
    if(buffers[key]) {
        bgmSource = audioCtx.createBufferSource();
        bgmSource.buffer = buffers[key];
        bgmSource.loop = true;
        bgmSource.connect(gainNode);
        bgmSource.start(0);
    } else {
        console.warn(`BGM Key not found: ${key}`);
    }
}

export function stopBGM() {
    if(bgmSource) {
        try { bgmSource.stop(); } catch(e){}
        bgmSource = null;
    }
}

export function playSFX(key) {
    if(isMuted || !audioCtx || !buffers[key]) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buffers[key];
    src.connect(gainNode);
    src.start(0);
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
    // 0~100 사이 값을 0.0~1.0으로 변환
    volume = val / 100;
    if(gainNode && !isMuted) gainNode.gain.value = volume;
}