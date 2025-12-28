// js/main.js
import { COLS, ROWS, BLK, COLORS, DEFAULT_SVG, STRINGS } from './constants.js';
import { genGarbage, createPiece, rotate, collide, merge } from './core.js';
import { audioCtx, initAudio, playBGM, playRandomBGM, stopBGM, playSFX, playEndSound, toggleAudioMute, setAudioVolume } from './audio.js';
import { Bot } from './bot.js';
import { saveRankData, getRankingsByLevel, checkIfRanker, saveHeartComment, incrementHeartCount, getHeartMessages, getHeartCount, updateFightLog, getGameStats, getRecentGameLogs } from './firebase.js';

const state = {
    grid: [], 
    opponent: { grid:[], score:0, isAI:true, bot:null },
    autoBotLeft: null, 
    player: { pos:{x:0,y:0}, matrix:null, score:0 },
    stats: { atk:0, rec:0 },
    record: { win:0, lose:0 },
    difficulty: 'normal',
    bag: [], next: null, run: false, isPaused: false,
    isAutoMode: false,
    dropCounter: 0, dropInterval: 1000, lastTime: 0,
    startTime: 0, duration: 120000, pauseStartTime: 0, animationId: null,
    currentBGM: 'classicA', curLang: 'en',
    wasPausedByRank: false,
    heartClickCount: 0,
    currentSessionStats: { win: 0, lose: 0 }
};

const canvasMe = document.getElementById('my-tetris');
const ctxMe = canvasMe.getContext('2d');
const canvasOpp = document.getElementById('opp-tetris');
const ctxOpp = canvasOpp.getContext('2d');
const canvasNext = document.getElementById('next-canvas');
const ctxNext = canvasNext.getContext('2d');

window.onload = () => {
    detectAndSetLang();
    try { loadProfile(); } catch(e) { localStorage.clear(); loadProfile(); }
    
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKey);

    drawGrid(ctxMe, Array(20).fill(Array(10).fill(0)), BLK);
    drawGrid(ctxOpp, Array(20).fill(Array(10).fill(0)), BLK);
    
    setupEventListeners();

    document.getElementById('ranking-overlay').onclick = (e) => {
        if(e.target.id === 'ranking-overlay') closeRankingModal();
    };

    document.getElementById('admin-msg-overlay').onclick = (e) => {
        if(e.target.id === 'admin-msg-overlay') closeAdminModal();
    };
    document.getElementById('admin-close-x').onclick = closeAdminModal;
};

function setupEventListeners() {
    document.getElementById('mute-btn').onclick = (e) => {
        e.stopPropagation();
        const dummyBtn = { innerText: '' }; 
        const muted = toggleAudioMute(dummyBtn);
        updateSpeakerIcon(muted);
        
        const slider = document.getElementById('vol-slider');
        if (muted) {
            slider.value = 0;
            stopBGM();
        } else {
            slider.value = 50; 
            setAudioVolume(50);
            if(state.run && !state.isPaused && !state.isAutoMode) playBGM(state.currentBGM);
        }
    };

    document.getElementById('vol-slider').oninput = (e) => {
        const val = Number(e.target.value);
        setAudioVolume(val);
        updateSpeakerIcon(val === 0);
    };

    document.getElementById('bgm-select').onchange = (e) => {
        state.currentBGM = e.target.value;
        if(state.run && !state.isPaused && !state.isAutoMode) playBGM(state.currentBGM);
    };
    
    ['bgm-select', 'vol-slider', 'lang-btn', 'profile-trigger', 'file-in', 'nick-in', 'comment-in', 'heart-input'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onclick = (e) => e.stopPropagation();
    });

    document.getElementById('lang-btn').onclick = (e) => { e.stopPropagation(); toggleLangMenu(); };
    document.querySelectorAll('.lang-opt').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); setLang(btn.dataset.lang); };
    });
    
    document.getElementById('profile-trigger').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('file-in').click();
    };
    document.getElementById('file-in').onchange = handleFile;

    document.getElementById('start-btn').onclick = (e) => { e.stopPropagation(); startCountdown(); };
    document.getElementById('lobby-rank-btn').onclick = (e) => { e.stopPropagation(); openRankingModal(); };

    document.getElementById('quit-btn').onclick = (e) => { e.stopPropagation(); quitGame(); };
    document.getElementById('restart-btn').onclick = (e) => { e.stopPropagation(); restart(); };
    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.onclick = (e) => { e.stopPropagation(); setDifficulty(btn.dataset.diff); };
    });

    document.getElementById('top-left-rank-btn').onclick = (e) => { e.stopPropagation(); openRankingModal(); };
    document.getElementById('rank-close-x').onclick = (e) => { e.stopPropagation(); closeRankingModal(); };
    document.getElementById('save-rank-btn').onclick = (e) => { e.stopPropagation(); handleSaveRank(); };
    
    document.getElementById('auto-mode-btn').onclick = (e) => {
        e.stopPropagation();
        closeResultAndStartAuto();
    };

    document.querySelectorAll('.rank-tab').forEach(tab => {
        tab.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            loadRankingData(Number(e.target.dataset.lvl));
        };
    });

    ['heart-lobby', 'heart-result'].forEach(id => {
        const container = document.getElementById(id);
        if(!container) return;
        
        const icon = container.querySelector('.heart-icon-wrapper');
        const text = container.querySelector('.heart-text');
        const input = container.querySelector('.heart-input');

        container.onclick = (e) => e.stopPropagation(); 
        icon.onclick = (e) => { e.stopPropagation(); handleHeartIconClick(e); };
        text.onclick = (e) => { e.stopPropagation(); handleHeartTextClick(text, input); };
        input.onblur = () => resetHeartInput(text, input);
        input.onkeydown = (e) => { 
            if (e.key === 'Enter') handleHeartInputKey(e, text, input);
            if (e.key === 'Escape') resetHeartInput(text, input);
        };
    });

    document.querySelectorAll('.admin-tab').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const targetId = e.target.dataset.target;
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
        };
    });
}

function resetHeartInput(textEl, inputEl) {
    inputEl.value = "";
    inputEl.classList.add('hidden');
    textEl.classList.remove('hidden');
}

async function handleHeartIconClick(e) {
    state.heartClickCount++;

    const myNick = localStorage.getItem('tetris_nick');
    if (myNick === 'Hans' && state.curLang === 'ko' && state.heartClickCount % 10 === 0) {
        openAdminModal();
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    for(let i=0; i<3; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.innerText = '❤️';
            heart.className = 'floating-heart';
            heart.style.left = (x + (Math.random() * 40 - 20)) + 'px';
            heart.style.top = y + 'px';
            document.body.appendChild(heart);
            setTimeout(() => heart.remove(), 1500);
        }, i * 100);
    }

    const count = await incrementHeartCount();
    createFlyingCount(x, y, count);
}

async function openAdminModal() {
    const overlay = document.getElementById('admin-msg-overlay');
    overlay.classList.remove('hidden');
    
    document.querySelectorAll('.admin-tab')[0].click();

    const countEl = document.getElementById('admin-total-hearts');
    const msgListDiv = document.getElementById('admin-msg-list');
    
    countEl.innerText = "💖 받은 하트: 불러오는 중...";
    msgListDiv.innerHTML = '<div style="padding:20px; text-align:center;">로딩중...</div>';

    const totalHearts = await getHeartCount();
    countEl.innerText = `💖 받은 하트 총 개수: ${totalHearts.toLocaleString()}개`;

    const msgs = await getHeartMessages();
    renderAdminMessages(msgs);

    const statsEl = document.getElementById('admin-game-stats');
    const logListDiv = document.getElementById('admin-log-list');
    
    statsEl.innerText = "📊 통계 로딩중...";
    logListDiv.innerHTML = '<div style="padding:20px; text-align:center;">로딩중...</div>';

    const stats = await getGameStats();
    statsEl.innerHTML = `오늘 게임 유저: <span style="color:#fff">${stats.todayUsers}명</span> <span style="color:#666">|</span> 누적 유저: <span style="color:#fff">${stats.totalUsers}명</span>`;

    const logs = await getRecentGameLogs();
    renderAdminLogs(logs);
}

function closeAdminModal() {
    document.getElementById('admin-msg-overlay').classList.add('hidden');
}

function renderAdminMessages(msgs) {
    const listDiv = document.getElementById('admin-msg-list');
    if (msgs.length === 0) {
        listDiv.innerHTML = '<div style="padding:20px; text-align:center;">메시지가 없습니다.</div>';
        return;
    }

    let html = '';
    msgs.forEach(m => {
        html += `
            <div class="msg-row">
                <div class="msg-info">
                    <span style="color:#0DFF72">${m.hartnickname}</span>
                    <span style="color:#666; margin: 0 5px;">|</span>
                    <span style="font-size:0.8rem">${m.dateStr}</span>
                </div>
                <div class="msg-body">${m.hartcomment}</div>
            </div>
        `;
    });
    listDiv.innerHTML = html;
}

function renderAdminLogs(logs) {
    const listDiv = document.getElementById('admin-log-list');
    if (logs.length === 0) {
        listDiv.innerHTML = '<div style="padding:20px; text-align:center; line-height:1.5;">최근 게임 기록이 없습니다.<br><span style="font-size:0.9rem; color:#888;">(업데이트 이후 게임을 진행해야 표시됩니다)</span></div>';
        return;
    }

    let html = '';
    logs.forEach(l => {
        html += `
            <div class="msg-row" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="color:#FFD700; font-weight:bold; font-size:1.1rem;">${l.nickname}</span>
                    <br>
                    <span style="font-size:0.8rem; color:#aaa;">${l.time}</span>
                </div>
                <div style="text-align:right; font-size:0.9rem; color:#ccc;">
                    <span style="color:#fff">Total: ${l.total}</span> <br>
                    <span style="color:#0DFF72">W:${l.win}</span> / <span style="color:#FF0D72">L:${l.lose}</span>
                </div>
            </div>
        `;
    });
    listDiv.innerHTML = html;
}

function createFlyingCount(x, y, count) {
    const el = document.createElement('div');
    el.className = 'flying-count';
    el.innerText = `+${count.toLocaleString()}`; 
    el.style.left = x + 'px';
    el.style.top = (y - 30) + 'px'; 
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

function handleHeartTextClick(textEl, inputEl) {
    inputEl.value = ""; 
    textEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    inputEl.focus();
}

async function handleHeartInputKey(e, textEl, inputEl) {
    const msg = e.target.value.trim();
    if (!msg) {
        resetHeartInput(textEl, inputEl);
        return;
    }

    const nick = localStorage.getItem('tetris_nick') || "Anonymous";
    await saveHeartComment(nick, msg);
    
    resetHeartInput(textEl, inputEl);
    showToast("❤️ 감사합니다!");
}

function updateSpeakerIcon(isMuted) {
    const wave = document.getElementById('spk-wave');
    const cross = document.getElementById('spk-cross');
    if (isMuted) {
        wave.classList.add('hidden');
        cross.classList.remove('hidden');
    } else {
        wave.classList.remove('hidden');
        cross.classList.add('hidden');
    }
}

function handleGlobalKey(e) {
    if (state.isAutoMode) {
        stopAutoModeAndStartGame();
    } else {
        if(!state.run || state.isPaused) return;
        if(!document.getElementById('ranking-overlay').classList.contains('hidden')) return;
        if(!document.getElementById('admin-msg-overlay').classList.contains('hidden')) return; 

        if([32,37,38,39,40].includes(e.keyCode)) e.preventDefault();
        if(e.keyCode===37) playerMove(-1); else if(e.keyCode===39) playerMove(1);
        else if(e.keyCode===40) playerDrop(); else if(e.keyCode===38) playerRotate();
        else if(e.keyCode===32) playerHardDrop();
    }
}

function handleGlobalClick(e) {
    initAudio(); 
    
    const langMenu = document.getElementById('lang-menu');
    if (langMenu.classList.contains('show') && !e.target.closest('#lang-ctrl')) {
        langMenu.classList.remove('show');
        return; 
    }
    
    if(!document.getElementById('ranking-overlay').classList.contains('hidden')) return;
    if(!document.getElementById('admin-msg-overlay').classList.contains('hidden')) return;

    if (state.isAutoMode) {
        stopAutoModeAndStartGame();
        return;
    }

    if (!state.run || !document.getElementById('lobby').classList.contains('hidden')) return;
    if (document.getElementById('result-area').style.display === 'flex') return;

    if (e.target.closest('button, input, select, label, .profile-container, #audio-ctrl, #lang-ctrl, .diff-ctrl, .heart-container')) return;
    
    togglePause();
}

function stopAutoModeAndStartGame() {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.isAutoMode = false;
    state.run = false;
    document.getElementById('auto-msg-overlay').classList.add('hidden');
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
    startCountdown();
}

function togglePause() {
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
        state.pauseStartTime = Date.now();
        cancelAnimationFrame(state.animationId);
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
        document.getElementById('timer').style.opacity = '0.3';
        document.getElementById('game-title').innerText = "PAUSED"; 
    } else {
        if (state.pauseStartTime > 0) {
            state.startTime += (Date.now() - state.pauseStartTime);
            state.pauseStartTime = 0;
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        state.lastTime = performance.now(); 
        document.getElementById('timer').style.opacity = '1';
        document.getElementById('game-title').innerText = state.isAutoMode ? STRINGS[state.curLang].autoModeTitle : STRINGS[state.curLang].title;
        loop(performance.now());
    }
}

function detectAndSetLang() {
    const browserLang = navigator.language || navigator.userLanguage; 
    if(browserLang.includes('ko')) setLang('ko');
    else if(browserLang.includes('ja')) setLang('ja');
    else setLang('en');
}
function setLang(lang) {
    state.curLang = lang;
    const S = STRINGS[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(S[key]) el.innerText = S[key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if(S[key]) el.placeholder = S[key];
    });
    
    // [수정] 하트 메시지 업데이트
    document.querySelectorAll('.heart-text').forEach(el => {
        el.innerText = S.heartMsg;
    });

    document.body.className = '';
    if(lang === 'ko') document.body.classList.add('font-ko');
    else if(lang === 'ja') document.body.classList.add('font-ja');
    else document.body.classList.add('font-en');
    updateCreditsUI(lang);
    
    const nickIn = document.getElementById('nick-in');
    if(!nickIn.value) {
        document.getElementById('my-nick-side').innerText = S.me;
        document.getElementById('game-my-label').innerText = S.me;
    }
    
    const titleEl = document.getElementById('game-title');
    if (state.isAutoMode) {
        titleEl.innerText = S.autoModeTitle;
    } else if (!state.isPaused) {
        titleEl.innerText = S.title;
    }

    document.querySelectorAll('.lang-opt').forEach(btn => btn.classList.remove('active'));
    const idx = lang === 'ko' ? 0 : lang === 'ja' ? 1 : 2;
    document.querySelectorAll('.lang-opt')[idx].classList.add('active');
    document.getElementById('lang-menu').classList.remove('show');
}

function updateCreditsUI(lang) {
    const C = STRINGS[lang].credits;
    const dateStr = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : lang === 'ja' ? 'ja-JP' : 'en-US');
    const html = `${C.pdLabel} <span>${C.pdName}</span><br>${C.devLabel} <span>${C.devName}</span><br>${C.timeLabel} <span>${C.timeVal}</span> (${dateStr})`;
    document.getElementById('credits-area').innerHTML = html;
}
function toggleLangMenu() { document.getElementById('lang-menu').classList.toggle('show'); }

function handleFile(e) {
    if (e.target.files[0]) {
        const r = new FileReader();
        r.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = 100; c.height = 100;
                c.getContext('2d').drawImage(img, 0, 0, 100, 100);
                const data = c.toDataURL('image/jpeg', 0.8);
                document.getElementById('preview-img').src = data;
                document.getElementById('my-img').src = data;
                localStorage.setItem('tetris_img', data);
            };
            img.src = ev.target.result;
        };
        r.readAsDataURL(e.target.files[0]);
    }
}

function loadProfile() {
    const savedImg = localStorage.getItem('tetris_img') || DEFAULT_SVG;
    document.getElementById('preview-img').src = savedImg;
    document.getElementById('my-img').src = savedImg;
    const savedNick = localStorage.getItem('tetris_nick');
    if(savedNick) document.getElementById('nick-in').value = savedNick;
    const rec = JSON.parse(localStorage.getItem('tetris_record') || '{"win":0,"lose":0}');
    state.record = rec;
    const total = rec.win + rec.lose;
    const ratio = total > 0 ? rec.win / total : 0;
    if(ratio >= 0.7) setDifficulty('hard');
    else if(ratio < 0.3) setDifficulty('normal');
    updateRecordUI();
}
function saveNick() {
    const nick = document.getElementById('nick-in').value;
    if(nick) localStorage.setItem('tetris_nick', nick);
    const displayNick = nick || STRINGS[state.curLang].me;
    document.getElementById('my-nick-side').innerText = displayNick;
    document.getElementById('game-my-label').innerText = displayNick;
    document.getElementById('my-img').src = document.getElementById('preview-img').src;
}
function updateRecordUI() {
    document.getElementById('rec-win').innerText = state.record.win;
    document.getElementById('rec-lose').innerText = state.record.lose;
}
function setDifficulty(lvl) {
    state.difficulty = lvl;
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${lvl}`);
    if(targetBtn) targetBtn.classList.add('active');
    
    if(state.run && state.opponent.bot && !state.isAutoMode) {
        state.opponent.bot = new Bot(state.difficulty, receiveAtkFromBot);
    }
}

function startCountdown() {
    initAudio(); stopBGM(); saveNick();
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.isAutoMode = false;
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;

    const m = Math.floor(state.duration / 60000);
    const s = Math.floor((state.duration % 60000) / 1000);
    document.getElementById('timer').innerText = `0${m}:${s<10?'0':''}${s}`;
    
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('result-area').style.display = 'none';
    
    const countOverlay = document.getElementById('count-overlay');
    countOverlay.style.display = 'flex';
    
    const msgEl = document.getElementById('count-msg');
    if(msgEl) msgEl.innerText = (state.difficulty === 'superHard') ? STRINGS[state.curLang].superHardMsg : "";
    
    let count = 3;
    const cntEl = document.getElementById('count-text');
    cntEl.innerText = count;
    playSFX('count');
    
    const timer = setInterval(() => {
        count--;
        if (count > 0) {
            cntEl.innerText = count;
            cntEl.style.animation = 'none';
            cntEl.offsetHeight; cntEl.style.animation = 'pop 0.5s ease-out';
            playSFX('count');
        } else {
            clearInterval(timer);
            countOverlay.style.display = 'none';
            startAIGame();
        }
    }, 1000);
}

function startAIGame() {
    state.opponent.isAI = true;
    state.opponent.bot = new Bot(state.difficulty, receiveAtkFromBot); 
    document.getElementById('game-opp-label').innerText = STRINGS[state.curLang].ai;
    startGame();
}

function startGame() {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    
    state.run = true; state.isPaused = false;
    state.isAutoMode = false;
    state.autoBotLeft = null;

    state.grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    state.grid[18] = genGarbage(); state.grid[19] = genGarbage();
    state.player.score = 0; state.stats = {atk:0, rec:0};
    state.dropCounter = 0;
    state.startTime = Date.now();
    state.lastTime = performance.now();
    state.bag = []; state.next = null;
    
    initNextBlock(); resetPiece(); 
    updateUI();
    document.getElementById('quit-btn').classList.remove('hidden');
    playSFX('start'); 
    
    const randomBgmType = playRandomBGM(); 
    if (randomBgmType) {
        state.currentBGM = randomBgmType;
        const selectEl = document.getElementById('bgm-select');
        if(selectEl) selectEl.value = randomBgmType;
    }
    
    loop(performance.now());
}

function startAutoMode() {
    if (state.animationId) cancelAnimationFrame(state.animationId);

    state.run = true;
    state.isPaused = false;
    state.isAutoMode = true;
    
    state.autoBotLeft = new Bot('superHard', (lines) => {
        if(state.opponent.bot) state.opponent.bot.receiveAtk(lines);
        animateAttack('player', lines, null);
    });
    
    state.opponent.bot = new Bot('superHard', (lines) => {
        if(state.autoBotLeft) state.autoBotLeft.receiveAtk(lines);
        animateAttack('opponent', lines, null);
    });

    document.getElementById('timer').innerText = "AUTO";
    document.getElementById('game-title').innerText = STRINGS[state.curLang].autoModeTitle;
    document.getElementById('auto-msg-overlay').classList.remove('hidden');
    document.getElementById('quit-btn').classList.add('hidden');
    
    stopBGM();
    state.lastTime = performance.now();
    loop(performance.now());
}

function loop(time = 0) {
    if(!state.run || state.isPaused) return; 
    
    const dt = time - state.lastTime;
    state.lastTime = time;

    if (state.isAutoMode) {
        if(state.autoBotLeft) {
            const resLeft = state.autoBotLeft.update(dt);
            document.getElementById('s-my-score').innerText = state.autoBotLeft.score;
            if(resLeft === "WIN") { resetAutoMode(); return; }
        }
        if(state.opponent.bot) {
            const resRight = state.opponent.bot.update(dt);
            document.getElementById('s-opp-score').innerText = state.opponent.bot.score;
            if(resRight === "WIN") { resetAutoMode(); return; }
        }
        draw();
        state.animationId = requestAnimationFrame(loop);
        return;
    }

    const elapsed = Date.now() - state.startTime;
    const left = Math.max(0, state.duration - elapsed);
    const m = Math.floor(left/60000);
    const s = Math.floor((left%60000)/1000);
    document.getElementById('timer').innerText = `0${m}:${s<10?'0':''}${s}`;
    
    if(left <= 0) { endGame("TIME"); return; }
    
    state.dropCounter += dt;
    if(state.dropCounter > state.dropInterval) playerDrop();
    
    if(state.opponent.isAI && state.opponent.bot) {
        const res = state.opponent.bot.update(dt);
        document.getElementById('s-opp-score').innerText = state.opponent.bot.score; 
        if(res === "WIN") endGame("WIN"); 
        drawOpponent();
    }
    
    draw(); 
    state.animationId = requestAnimationFrame(loop);
}

function resetAutoMode() {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    startAutoMode();
}

function animateAttack(sender, lines, score, callback) {
    const srcId = sender === 'player' ? 'my-tetris' : 'opp-tetris';
    const tgtId = sender === 'player' ? 'opp-tetris' : 'my-tetris';
    const srcEl = document.getElementById(srcId);
    const tgtEl = document.getElementById(tgtId);
    if(!srcEl || !tgtEl) { if(callback) callback(); return; }
    
    const srcRect = srcEl.getBoundingClientRect();
    const tgtRect = tgtEl.getBoundingClientRect();
    
    if (!state.isAutoMode) playSFX('swoosh');
    
    const div = document.createElement('div');
    div.className = 'attack-projectile'; 
    
    // 블럭 높이 계산
    const oneBlockHeight = srcRect.height / ROWS;
    const h = lines * oneBlockHeight;
    
    div.style.width = srcRect.width + 'px';
    div.style.height = h + 'px';
    div.style.left = srcRect.left + 'px';
    div.style.top = (srcRect.bottom - h) + 'px'; 
    
    // [추가] 블럭 안 점수 텍스트
    if (score > 0) {
        const span = document.createElement('span');
        span.className = 'score-in-block';
        span.innerText = `+${score}`;
        div.appendChild(span);
    }

    document.body.appendChild(div);
    
    const anim = div.animate([
        { left: srcRect.left + 'px', top: (srcRect.bottom - h) + 'px', opacity: 0.8, transform: 'scale(0.9)' },
        { left: tgtRect.left + 'px', top: (tgtRect.bottom - h) + 'px', opacity: 1, transform: 'scale(1)' }
    ], { duration: 600, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
    
    anim.onfinish = () => {
        // [추가] 도착 후 점수 풍선 효과
        if (score > 0) {
            const balloon = document.createElement('div');
            balloon.className = 'score-balloon';
            balloon.innerText = `+${score}`;
            balloon.style.left = (tgtRect.left + tgtRect.width / 2 - 20) + 'px';
            balloon.style.top = (tgtRect.bottom - 50) + 'px';
            document.body.appendChild(balloon);
            setTimeout(() => balloon.remove(), 1500);
        }
        div.remove(); 
        if(callback) callback(); 
    };
}

function getPieceFromBag() {
    if (state.bag.length === 0) state.bag = 'ILJOTSZ'.split('').sort(() => Math.random() - 0.5);
    return createPiece(state.bag.pop());
}
function initNextBlock() { state.next = getPieceFromBag(); }
function resetPiece() {
    state.player.matrix = state.next;
    state.next = getPieceFromBag();
    state.player.pos.y = 0; state.player.pos.x = 3;
    drawNext();
    if(collide(state.grid, state.player)) endGame("LOSE");
}
function playerDrop() {
    state.player.pos.y++;
    if(collide(state.grid, state.player)) {
        state.player.pos.y--; merge(state.grid, state.player);
        checkLines(); resetPiece(); 
    }
    state.dropCounter = 0; draw();
}
function playerHardDrop() {
    while(!collide(state.grid, state.player)) state.player.pos.y++;
    state.player.pos.y--; merge(state.grid, state.player);
    checkLines(); resetPiece(); state.dropCounter = 0; draw(); playSFX('drop');
}
function playerMove(dir) {
    state.player.pos.x += dir;
    if(collide(state.grid, state.player)) state.player.pos.x -= dir;
    draw();
}
function playerRotate() {
    rotate(state.player.matrix);
    if(collide(state.grid, state.player)) {
        state.player.pos.x += 1;
        if(collide(state.grid, state.player)) {
            state.player.pos.x -= 2;
            if(collide(state.grid, state.player)) {
                state.player.pos.x += 1; rotate(state.player.matrix, true); 
            }
        }
    }
    draw();
}

// [수정] 점수 계산 + 공격 애니메이션에 점수 전달
function checkLines() {
    let lines = 0;
    outer: for(let y=ROWS-1; y>0; --y) {
        for(let x=0; x<COLS; ++x) if(state.grid[y][x] === 0) continue outer;
        state.grid.splice(y, 1)[0].fill(0);
        state.grid.unshift(new Array(COLS).fill(0));
        ++y; lines++;
    }
    if(lines > 0) {
        const scoreTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
        const scoreAdd = scoreTable[lines] || (lines * 100);
        
        state.player.score += scoreAdd; 
        state.stats.atk += lines;
        
        playSFX('clear'); updateUI();
        if(state.opponent.isAI && state.opponent.bot) {
            // [수정] 점수 전달
            animateAttack('player', lines, scoreAdd, () => {
                state.opponent.bot.receiveAtk(lines);
            });
        }
    }
}

function receiveAtkFromBot(lines) {
    // 봇 공격은 점수 0으로 표시하지 않음 (null or 0)
    animateAttack('opponent', lines, 0, () => {
        state.stats.rec += lines; updateUI();
        for(let i=0; i<lines; i++) { state.grid.shift(); state.grid.push(genGarbage()); }
        playSFX('attack'); draw();
    });
}
function draw() {
    ctxMe.fillStyle = '#000'; ctxMe.fillRect(0,0,320,640);
    if (state.isAutoMode && state.autoBotLeft) {
        drawGrid(ctxMe, state.autoBotLeft.getRenderGrid(), BLK);
    } else {
        drawGrid(ctxMe, state.grid, BLK); 
        if(state.player.matrix) {
            let gy = state.player.pos.y;
            while(!collide(state.grid, {matrix:state.player.matrix, pos:{x:state.player.pos.x, y:gy+1}})) gy++;
            drawMatrix(ctxMe, state.player.matrix, {x:state.player.pos.x, y:gy}, BLK, true);
            drawMatrix(ctxMe, state.player.matrix, state.player.pos, BLK);
        }
    }
    if (state.isAutoMode || (state.opponent.isAI && state.opponent.bot)) {
        drawOpponent();
    }
}
function drawOpponent() {
    ctxOpp.fillStyle = '#000'; ctxOpp.fillRect(0,0,320,640);
    let g = state.opponent.grid;
    if(state.opponent.bot) g = state.opponent.bot.getRenderGrid();
    drawGrid(ctxOpp, g, BLK);
}
function drawGrid(ctx, grid, size) {
    grid.forEach((row, y) => row.forEach((v, x) => { if(v) drawBlock(ctx, x*size, y*size, size, v); }));
}
function drawMatrix(ctx, m, offset, size, ghost=false) {
    m.forEach((row, y) => row.forEach((v, x) => { if(v) drawBlock(ctx, (x+offset.x)*size, (y+offset.y)*size, size, v, ghost); }));
}
function drawBlock(ctx, x, y, size, c, ghost=false) {
    if(ghost) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(x,y,size,size);
    } else {
        const color = COLORS[c];
        const grad = ctx.createLinearGradient(x, y, x+size, y+size);
        grad.addColorStop(0, '#fff'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#000');
        ctx.fillStyle = grad; ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeRect(x, y, size, size);
    }
}
function drawNext() {
    ctxNext.clearRect(0,0,150,150);
    if(state.next) {
        const bs = 40; const offX = (150 - state.next[0].length*bs)/2; const offY = (150 - state.next.length*bs)/2;
        state.next.forEach((r,y)=>r.forEach((v,x)=>{ if(v) drawBlock(ctxNext, x*bs+offX, y*bs+offY, bs, v); }));
    }
}
function updateUI() {
    document.getElementById('s-my-score').innerText = state.player.score;
    document.getElementById('s-atk').innerText = state.stats.atk;
    document.getElementById('s-rec').innerText = state.stats.rec;
}
function quitGame() { 
    if(!state.run) return; 
    stopBGM(); 
    endGame("LOSE"); 
}

async function endGame(res) {
    if(state.animationId) cancelAnimationFrame(state.animationId); 
    state.run = false; stopBGM();
    
    const nick = localStorage.getItem('tetris_nick') || "Anonymous";
    const lvlNum = getAiLevelNum(state.difficulty);
    const isWin = (res === "WIN");
    
    state.currentSessionStats = await updateFightLog(nick, lvlNum, isWin);

    document.getElementById('quit-btn').classList.add('hidden');
    document.getElementById('result-area').style.display='flex';
    document.getElementById('game-title').innerText = STRINGS[state.curLang].title;
    document.getElementById('timer').style.opacity = '1';

    document.getElementById('rank-save-area').classList.add('hidden');
    const txt = document.getElementById('res-text');

    if(isWin) {
        txt.innerText = STRINGS[state.curLang].winMsg;
        txt.classList.add('win'); 
        fireConfetti();
        playEndSound('win'); 
        state.record.win++;

        const isTop10 = await checkIfRanker(lvlNum, state.player.score);

        if (isTop10 && state.player.score > 0) {
            document.getElementById('rank-save-area').classList.remove('hidden');
            document.getElementById('comment-in').value = "";
            document.getElementById('save-rank-btn').disabled = false;
            document.getElementById('save-rank-btn').innerText = STRINGS[state.curLang].saveRankBtn;
        }
    } else {
        txt.innerText = STRINGS[state.curLang].loseMsg;
        txt.classList.remove('win');
        playEndSound('lose'); 
        state.record.lose++;
    }
    
    localStorage.setItem('tetris_record', JSON.stringify(state.record));
    updateRecordUI();
}

function restart() {
    document.getElementById('result-area').style.display='none';
    if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    startCountdown();
}
function fireConfetti(){const e=Date.now()+3000;(function f(){confetti({particleCount:5,angle:60,origin:{x:0}});confetti({particleCount:5,angle:120,origin:{x:1}});if(Math.random()<0.1)playSFX('clear');if(Date.now()<e)requestAnimationFrame(f);})();}

function getAiLevelNum(diffStr) {
    switch(diffStr) {
        case 'easy': return 1;
        case 'normal': return 2;
        case 'hard': return 3;
        case 'superHard': return 4;
        default: return 2;
    }
}
function getCountryCode(lang) {
    if (lang === 'ko') return 'KR';
    if (lang === 'ja') return 'JP';
    return 'US'; 
}
function closeResultAndStartAuto() {
    document.getElementById('result-area').style.display = 'none';
    startAutoMode();
}

async function handleSaveRank() {
    const btn = document.getElementById('save-rank-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    const comment = document.getElementById('comment-in').value;
    const nick = localStorage.getItem('tetris_nick') || "Unknown";
    
    const data = {
        ailevel: getAiLevelNum(state.difficulty),
        score: state.player.score,
        country: getCountryCode(state.curLang),
        nickname: nick,
        comment: comment,
        wincount: state.currentSessionStats.win,
        losecount: state.currentSessionStats.lose
    };

    try {
        const success = await saveRankData(data);
        if(success) {
            showToast(STRINGS[state.curLang].toastSaved);
            document.getElementById('rank-save-area').classList.add('hidden');
        } else {
            throw new Error("Save returned false");
        }
    } catch (e) {
        console.error(e);
        alert("Error saving rank.");
        btn.disabled = false;
        btn.innerText = STRINGS[state.curLang].saveRankBtn;
    }
}

function openRankingModal() {
    if (state.run && !state.isPaused) {
        state.wasPausedByRank = true;
        togglePause();
    } else {
        state.wasPausedByRank = false;
    }

    const overlay = document.getElementById('ranking-overlay');
    overlay.classList.remove('hidden');

    const currentDiffNum = getAiLevelNum(state.difficulty);
    document.querySelectorAll('.rank-tab').forEach(t => {
        t.classList.remove('active');
        if(Number(t.dataset.lvl) === currentDiffNum) t.classList.add('active');
    });

    loadRankingData(currentDiffNum);
}

function closeRankingModal() {
    document.getElementById('ranking-overlay').classList.add('hidden');
    if (state.run && state.isPaused && state.wasPausedByRank) {
        togglePause();
    }
}

async function loadRankingData(levelNum) {
    const listDiv = document.getElementById('ranking-list');
    listDiv.innerHTML = '<div style="padding:20px;">Loading...</div>';

    const ranks = await getRankingsByLevel(Number(levelNum));
    
    let html = '';
    
    // [수정] 랭킹 리스트 생성 로직
    if (ranks.length === 0) {
        html = '<div style="padding:20px;">No Data</div>';
    } else {
        ranks.forEach((r, idx) => {
            const flagUrl = `https://flagcdn.com/24x18/${r.country.toLowerCase()}.png`;
            const w = r.wincount || 0;
            const l = r.losecount || 0;
            html += `
                <div class="ranking-row">
                    <div class="rank-idx">${idx + 1}</div>
                    <div class="rank-nick">${r.nickname}</div>
                    <div class="rank-country">
                        <img src="${flagUrl}" alt="${r.country}" title="${r.country}">
                    </div>
                    <div class="rank-score">${r.ailevelscore.toLocaleString()}</div>
                    <div class="rank-win">${w}</div>
                    <div class="rank-lose">${l}</div>
                    <div class="rank-cmt">${r.usercomment}</div>
                </div>
            `;
        });
    }

    const myNick = localStorage.getItem('tetris_nick') || "";
    let isRanker = false;
    if(myNick) {
        isRanker = ranks.some(r => r.nickname === myNick);
    }

    // [수정] 도전 메시지 표시 조건 (5명 이하이고 본인이 없을 때)
    if (ranks.length <= 5 && !isRanker) {
        html += `<div class="rank-challenge">${STRINGS[state.curLang].challengeMsg}</div>`;
    }

    listDiv.innerHTML = html;
}

function showToast(msg) {
    const el = document.getElementById('toast-msg');
    el.innerText = msg;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    el.offsetHeight; 
    el.style.animation = 'fade-in-out 3s forwards';
    setTimeout(() => { el.classList.add('hidden'); }, 3000);
}