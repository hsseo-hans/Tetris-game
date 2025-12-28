// js/ui.js
import { state } from './state.js';
import { STRINGS, DEFAULT_SVG, ROWS } from './constants.js';
import { 
    saveRankData, getRankingsByLevel, saveHeartComment, incrementHeartCount, 
    getHeartMessages, getHeartCount, getGameStats, getRecentGameLogs 
} from './firebase.js';
import { playSFX } from './audio.js';

// --- 화면 및 언어 초기화 ---
export function detectAndSetLang() {
    const browserLang = navigator.language || navigator.userLanguage; 
    let targetLang = 'en';
    if(browserLang.includes('ko')) targetLang = 'ko';
    else if(browserLang.includes('ja')) targetLang = 'ja';
    
    setLang(targetLang);
    
    // 모바일 레이아웃 초기 체크 및 리스너 등록
    checkMobileLayout();
    window.addEventListener('resize', checkMobileLayout);
}

// [수정] 화면 비율에 따른 레이아웃 모드 설정 (사용자 요청 공식 적용)
export function checkMobileLayout() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // 가로*2가 세로보다 커야만 두 화면을 합쳐서 보여줌 (Combined)
    // 반대로 세로가 매우 길면(width*2 < height) 분리해서 보여줌 (Split)
    if (width * 2 > height) {
        state.isCombinedView = true;
        document.body.classList.add('mobile-combined');
    } else {
        state.isCombinedView = false;
        document.body.classList.remove('mobile-combined');
    }
    updateMobileView();
}

export function setLang(lang) {
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
    document.querySelectorAll('.heart-text').forEach(el => {
        el.innerText = S.heartMsg;
    });

    document.body.className = '';
    if(state.run) document.body.classList.add('game-started');
    
    // 레이아웃 클래스 복구
    if(state.isCombinedView) document.body.classList.add('mobile-combined');
    updateMobileView();

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

export function toggleLangMenu() { document.getElementById('lang-menu').classList.toggle('show'); }

// --- 모바일 뷰 관리 ---
export function updateMobileView() {
    // 기존 뷰 클래스 제거
    document.body.classList.remove('mobile-view-0', 'mobile-view-1', 'mobile-view-2', 'mobile-view-3');
    
    // 범위 제한 
    // Combined 모드: 0(내정보) <-> 1(게임합침) <-> 2(봇정보)
    // Split 모드: 0(내정보) <-> 1(내게임) <-> 2(봇게임) <-> 3(봇정보)
    const maxView = state.isCombinedView ? 2 : 3;
    if (state.mobileView > maxView) state.mobileView = maxView;
    
    document.body.classList.add(`mobile-view-${state.mobileView}`);
    
    const titleEl = document.getElementById('game-title');
    if (state.run) {
        // 게임 중 다른 뷰(정보창 등)로 가면 PAUSED 표시
        if (state.mobileView !== 1) {
            if(!state.isPaused) titleEl.innerText = "PAUSED";
        } else if (state.isPaused) {
            titleEl.innerText = "PAUSED";
        } else {
            titleEl.innerText = STRINGS[state.curLang].title;
        }
    }
}

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// --- 프로필 관련 ---
export function handleFile(e) {
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
        e.target.value = '';
    }
}

export function loadProfile() {
    const savedImg = localStorage.getItem('tetris_img') || DEFAULT_SVG;
    document.getElementById('preview-img').src = savedImg;
    document.getElementById('my-img').src = savedImg;
    const savedNick = localStorage.getItem('tetris_nick');
    if(savedNick) document.getElementById('nick-in').value = savedNick;
    const rec = JSON.parse(localStorage.getItem('tetris_record') || '{"win":0,"lose":0}');
    state.record = rec;
    const total = rec.win + rec.lose;
    const ratio = total > 0 ? rec.win / total : 0;
    
    let diff = 'normal';
    if(ratio >= 0.7) diff = 'hard';
    else if(ratio < 0.3) diff = 'normal';
    
    updateDiffUI(diff);
    updateRecordUI();
}

export function saveNick() {
    const nick = document.getElementById('nick-in').value;
    if(nick) localStorage.setItem('tetris_nick', nick);
    const displayNick = nick || STRINGS[state.curLang].me;
    document.getElementById('my-nick-side').innerText = displayNick;
    document.getElementById('game-my-label').innerText = displayNick;
    document.getElementById('my-img').src = document.getElementById('preview-img').src;
}

export function updateRecordUI() {
    document.getElementById('rec-win').innerText = state.record.win;
    document.getElementById('rec-lose').innerText = state.record.lose;
}

export function updateDiffUI(lvl) {
    state.difficulty = lvl;
    document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById(`btn-${lvl}`);
    if(targetBtn) targetBtn.classList.add('active');
}

export function updateStatsUI() {
    document.getElementById('s-my-score').innerText = state.player.score;
    document.getElementById('s-atk').innerText = state.stats.atk;
    document.getElementById('s-rec').innerText = state.stats.rec;
}

export function updateSpeakerIcon(isMuted) {
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

// --- 랭킹 모달 ---
export function openRankingModal(pauseCallback) {
    if (state.run && !state.isPaused) {
        state.wasPausedByRank = true;
        if(pauseCallback) pauseCallback();
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

export function closeRankingModal(resumeCallback) {
    document.getElementById('ranking-overlay').classList.add('hidden');
    if (state.run && state.isPaused && state.wasPausedByRank) {
        if(resumeCallback) resumeCallback();
    }
}

export async function handleSaveRank(getAiLevelNumFunc, getCountryCodeFunc, showToastFunc) {
    const btn = document.getElementById('save-rank-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    const comment = document.getElementById('comment-in').value;
    const nick = localStorage.getItem('tetris_nick') || "Unknown";
    
    const data = {
        ailevel: getAiLevelNumFunc(state.difficulty),
        score: state.player.score,
        country: getCountryCodeFunc(state.curLang),
        nickname: nick,
        comment: comment,
        wincount: state.currentSessionStats.win,
        losecount: state.currentSessionStats.lose
    };

    try {
        const success = await saveRankData(data);
        if(success) {
            showToastFunc(STRINGS[state.curLang].toastSaved);
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

export async function loadRankingData(levelNum) {
    const listDiv = document.getElementById('ranking-list');
    listDiv.innerHTML = '<div style="padding:20px;">Loading...</div>';

    const ranks = await getRankingsByLevel(Number(levelNum));
    
    let html = '';
    
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
                    <div class="rank-cmt" data-full="${r.usercomment}">${r.usercomment}</div>
                </div>
            `;
        });
    }

    const myNick = localStorage.getItem('tetris_nick') || "";
    let myRankIdx = -1;
    if(myNick && ranks.length > 0) {
        myRankIdx = ranks.findIndex(r => r.nickname === myNick);
    }

    if (myRankIdx !== -1) {
        const msg = STRINGS[state.curLang].rankedMsg.replace('{0}', myRankIdx + 1);
        html += `<div class="rank-challenge" style="border-color:#0DFF72; color:#0DFF72;">${msg}</div>`;
    } else {
        html += `<div class="rank-challenge">${STRINGS[state.curLang].challengeMsg}</div>`;
    }

    listDiv.innerHTML = html;
}

// --- 어드민 모달 ---
export async function openAdminModal() {
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

export function closeAdminModal() {
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

export async function handleHeartIconClick(e) {
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

export function handleHeartTextClick(textEl, inputEl) {
    inputEl.value = ""; 
    textEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    inputEl.focus();
}

export async function processHeartInput(textEl, inputEl) {
    const msg = inputEl.value.trim();
    if (!msg) {
        resetHeartInput(textEl, inputEl);
        return;
    }
    const nick = localStorage.getItem('tetris_nick') || "Anonymous";
    await saveHeartComment(nick, msg);
    resetHeartInput(textEl, inputEl);
    showToast("❤️ 감사합니다!");
}

export function resetHeartInput(textEl, inputEl) {
    inputEl.value = "";
    inputEl.classList.add('hidden');
    textEl.classList.remove('hidden');
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

export function showToast(msg) {
    const el = document.getElementById('toast-msg');
    el.innerText = msg;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    el.offsetHeight; 
    el.style.animation = 'fade-in-out 3s forwards';
    setTimeout(() => { el.classList.add('hidden'); }, 3000);
}

export function animateAttack(sender, lines, score, callback) {
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
    
    const oneBlockHeight = srcRect.height / ROWS;
    const h = lines * oneBlockHeight;
    
    div.style.width = srcRect.width + 'px';
    div.style.height = h + 'px';
    div.style.left = srcRect.left + 'px';
    div.style.top = (srcRect.bottom - h) + 'px'; 
    
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

function getAiLevelNum(diffStr) {
    switch(diffStr) {
        case 'easy': return 1;
        case 'normal': return 2;
        case 'hard': return 3;
        case 'superHard': return 4;
        default: return 2;
    }
}