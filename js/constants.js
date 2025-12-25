export const COLS = 10;
export const ROWS = 20;
export const BLK = 32;
export const COLORS = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF', '#999'];
export const DEFAULT_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' style='background:%23333'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='30'%3EUSER%3C/text%3E%3C/svg%3E";

// 다국어 데이터
export const STRINGS = {
    ko: {
        title: "Tetris: 닝겐 Ai를 이겨봐라!",
        nickPH: "닉네임 입력",
        startBtn: "🤖 AI와 대결 시작",
        quit: "🏳️ 포기",
        me: "나",
        ai: "AI Bot",
        totalRec: "전적",
        easy: "초보",
        normal: "중수",
        hard: "고수",
        superHard: "초고수",
        superHardMsg: "테트리스 고수시군요.\n멋지게 한판 해 볼까요?",
        myScore: "내 점수",
        oppScore: "상대 점수",
        atk: "공격함",
        rec: "받음",
        restart: "다시 한판",
        winMsg: "축하합니다!\nAI를 이겼습니다!",
        loseMsg: "닝겐, Ai 에게도 못이기는데, 일이나 해!",
        credits: {
            pdLabel: "게임 기획 및 PD", pdName: "서형수",
            devLabel: "게임 개발", devName: "제미나이 프로",
            timeLabel: "만든시간", timeVal: "6시간 공들임"
        }
    },
    ja: {
        title: "テトリス: 人間よ！ AIに勝ってみろ！",
        nickPH: "ニックネーム入力",
        startBtn: "🤖 AIと対決開始",
        quit: "🏳️ 降参",
        me: "私",
        ai: "AIボット",
        totalRec: "戦績",
        easy: "初級",
        normal: "中級",
        hard: "上級",
        superHard: "超上級",
        superHardMsg: "テトリスの達人ですね。\n熱い勝負をしましょう！",
        myScore: "自分",
        oppScore: "相手",
        atk: "攻撃",
        rec: "受け",
        restart: "もう一度",
        winMsg: "おめでとう！\nAIに勝ちました！",
        loseMsg: "ニンゲン、AIにも勝てないのか？仕事しろ！",
        credits: {
            pdLabel: "企画 & PD", pdName: "ソ·ヒョンス",
            devLabel: "開発", devName: "Gemini Pro",
            timeLabel: "所要時間", timeVal: "6時間かけた"
        }
    },
    en: {
        title: "Tetris: Human! Try beating AI!",
        nickPH: "Enter Nickname",
        startBtn: "🤖 Start vs AI",
        quit: "🏳️ Give Up",
        me: "Me",
        ai: "AI Bot",
        totalRec: "Records",
        easy: "Easy",
        normal: "Normal",
        hard: "Hard",
        superHard: "Super Hard",
        superHardMsg: "You're a Tetris master!\nLet's have an epic match!",
        myScore: "My Score",
        oppScore: "Opp Score",
        atk: "Attack",
        rec: "Receive",
        restart: "Play Again",
        winMsg: "Congratulations!\nYou beat the AI!",
        loseMsg: "Human, can't even beat AI? Go back to work!",
        credits: {
            pdLabel: "Planner & PD", pdName: "Hyungsu, Seo(Hans)",
            devLabel: "Developer", devName: "Gemini Pro",
            timeLabel: "Time Spent", timeVal: "6 Hours"
        }
    }
};

// 음악 데이터
const N = { e5:659, b4:494, c5:523, d5:587, a4:440, g4:392, f4:349, e4:330, c4:261, d4:293, g3:196, a3:220, f3:174, b3:246, e3:164, d3:146, c3:130 };
export const TETRIS_MELODY = [ N.e5, N.b4, N.c5, N.d5, N.c5, N.b4, N.a4, N.a4, N.c5, N.e5, N.d5, N.c5, N.b4, N.b4, N.c5, N.d5, N.e5, N.c5, N.a4, N.a4, 0, 0, N.d5, N.d5, N.f5, N.a5, N.g5, N.f5, N.e5, N.e5, N.c5, N.e5, N.d5, N.c5, N.b4, N.b4, N.c5, N.d5, N.e5, N.c5, N.a4, N.a4, 0, 0, N.e4, 0, N.c4, 0, N.d4, 0, N.b3, 0, N.c4, 0, N.a3, 0, N.g3, 0, N.b3, 0, N.e4, 0, N.c4, 0, N.d4, 0, N.b3, 0, N.c4, N.e4, N.a4, N.a4, 0, 0, 0, 0 ];
export const THEME_B_MELODY = [ N.e5, 0, N.c5, 0, N.a4, 0, N.c5, N.e5, N.d5, 0, N.b4, 0, N.g4, 0, N.b4, N.d5, N.c5, 0, N.a4, 0, N.f4, 0, N.a4, N.c5, N.b4, N.b4, N.g4, N.g4, N.e4, 0, 0, 0 ];
export const TETRIS_BASS = [ N.e3, N.e3, N.a3, N.a3, N.g3, N.g3, N.e3, N.e3, N.e3, N.e3, N.a3, N.a3, N.g3, N.g3, N.e3, N.e3, N.d3, N.d3, N.d3, N.d3, N.c3, N.c3, N.c3, N.c3, N.g3, N.g3, N.e3, N.e3, N.a3, N.a3, N.a3, N.a3, N.e3, N.e3, N.a3, N.a3, N.g3, N.g3, N.e3, N.e3, N.e3, N.e3, N.a3, N.a3, N.g3, N.g3, N.e3, N.e3 ];

export const BGM_DATA = {
    guitar:    { melody: TETRIS_MELODY, bass: TETRIS_BASS, tempo: 110, style: 'pluck' },
    bradinsky: { melody: TETRIS_MELODY, bass: TETRIS_BASS, tempo: 130, style: 'synth' },
    classicA:  { melody: TETRIS_MELODY, bass: TETRIS_BASS, tempo: 180, style: 'classic' },
    themeB:    { melody: THEME_B_MELODY,bass: TETRIS_BASS, tempo: 140, style: 'synth' },
};