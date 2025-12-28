// js/state.js
export const state = {
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