// js/audio.js

export let audioCtx = null;
let bgmSource = null;
let gainNode = null;
let isMuted = false;
let volume = 0.5;

// 효과음 파일 목록 (슈웅~ 소리 추가됨: swoosh)
const SOUNDS = {
    bgm_classicA: 'https://archive.org/download/TetrisThemeMusic/Tetris.mp3',
    bgm_classicB: 'https://ia800504.us.archive.org/11/items/TetrisThemeMusic/Tetris%20Theme%20Music%20B.mp3',
    bgm_fast: 'https://ia800504.us.archive.org/11/items/TetrisThemeMusic/Tetris%20Theme%20Music%20C.mp3',
    
    start: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // 게임 시작음
    drop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',  // 블럭 놓기
    clear: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // 라인 클리어
    attack: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // 공격 받음
    count: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // 카운트다운
    win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',   // 승리
    lose: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',  // 패배
    
    // [추가됨] 공격 보낼 때 나는 소리 (슈웅~)
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

    // 사운드 미리 로딩
    for(const [key, url] of Object.entries(SOUNDS)) {
        try {
            const res = await fetch(url);
            const buf = await res.arrayBuffer();
            buffers[key] = await audioCtx.decodeAudioData(buf);
        } catch(e) { console.log('Sound load fail:', key); }
    }
}

export function playBGM(type) {
    if(isMuted || !audioCtx) return;
    stopBGM();
    const key = `bgm_${type}`;
    if(buffers[key]) {
        bgmSource = audioCtx.createBufferSource();
        bgmSource.buffer = buffers[key];
        bgmSource.loop = true;
        bgmSource.connect(gainNode);
        bgmSource.start(0);
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
    volume = val;
    if(gainNode && !isMuted) gainNode.gain.value = volume;
}