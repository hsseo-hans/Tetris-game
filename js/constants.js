// js/constants.js
export const COLS = 10;
export const ROWS = 20;
export const BLK = 32;
export const COLORS = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF', '#999'];
export const DEFAULT_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' style='background:%23333'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='30'%3EUSER%3C/text%3E%3C/svg%3E";

export const STRINGS = {
    ko: {
        title: "Tetris: 닝겐, Ai를 이겨라!",
        autoModeTitle: "🤖 AI 대전 (관전 모드)", 
        nickPH: "닉네임 입력",
        lobbyRankBtn: "🏆 랭킹 보드 확인",
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
        autoMode: "🤖 관전 모드 (Auto)",
        winMsg: "축하합니다!\nAI를 이겼습니다!",
        loseMsg: "닝겐, Ai 에게도 못이기는데,\n일이나 해!",
        rankSuccessMsg: "🎉 랭킹 진입을 축하합니다! 🎉",
        saveRankBtn: "💾 랭킹 저장",
        commentPH: "한마디 (30자)",
        toastSaved: "저장되었습니다!",
        autoOverlay: "게임을 시작하려면\n아무 키나 누르거나 클릭하세요",
        challengeMsg: "닝겐, 지금 초고수에 도전해 봐! 너의 이름을 알려!",
        heartMsg: "응원의 메세지를 남겨주세요. 하트도 클릭 부탁!",
        // [추가] 결과창 랭킹 버튼 및 순위 축하 메시지
        resultRankBtn: "🏆 랭킹 보드 확인",
        rankedMsg: "축하합니다. {0}위에 랭크되어 있습니다.",
        credits: {
            pdLabel: "게임 기획 및 PD", pdName: "서형수",
            devLabel: "게임 개발", devName: "제미나이 프로",
            timeLabel: "만든시간", timeVal: "6시간 공들임"
        }
    },
    ja: {
        title: "テトリス: 人間よ、AIを打ち負かせ！",
        autoModeTitle: "🤖 AI対戦 (観戦モード)",
        nickPH: "ニックネーム入力",
        lobbyRankBtn: "🏆 ランキング確認",
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
        autoMode: "🤖 観戦モード (Auto)",
        winMsg: "おめでとう！\nAIに勝ちました！",
        loseMsg: "ニンゲン、AIにも勝てないのか？\n仕事しろ！",
        rankSuccessMsg: "🎉 ランクインおめでとう！ 🎉",
        saveRankBtn: "💾 記録保存",
        commentPH: "一言 (30文字)",
        toastSaved: "保存しました！",
        autoOverlay: "ゲームを始めるには\nキーを押すかクリックしてください",
        challengeMsg: "人間よ、今すぐ超上級に挑め！その名を轟かせろ！",
        heartMsg: "応援メッセージを残してください。ハートもクリック！",
        // [추가]
        resultRankBtn: "🏆 ランキング確認",
        rankedMsg: "おめでとうございます。{0}位にランクインしています。",
        credits: {
            pdLabel: "企画 & PD", pdName: "ソ·ヒョンス",
            devLabel: "開発", devName: "Gemini Pro",
            timeLabel: "所要時間", timeVal: "6時間かけた"
        }
    },
    en: {
        title: "Tetris: Human, Defeat the AI!",
        autoModeTitle: "🤖 AI vs AI (Watch Mode)",
        nickPH: "Enter Nickname",
        lobbyRankBtn: "🏆 View Ranking",
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
        autoMode: "🤖 Watch Mode (Auto)",
        winMsg: "Congratulations!\nYou beat the AI!",
        loseMsg: "Human, can't even beat AI?\nGo back to work!",
        rankSuccessMsg: "🎉 You made the ranking! 🎉",
        saveRankBtn: "💾 Save Rank",
        commentPH: "Comment (30 chars)",
        toastSaved: "Saved successfully!",
        autoOverlay: "Press any key or click\nto start game",
        challengeMsg: "Human! Challenge Super Hard now! Make your name known!",
        heartMsg: "Leave a support message. Click the heart too!",
        // [추가]
        resultRankBtn: "🏆 View Ranking",
        rankedMsg: "Congratulations. You are ranked #{0}.",
        credits: {
            pdLabel: "Planner & PD", pdName: "Hyungsu, Seo(Hans)",
            devLabel: "Developer", devName: "Gemini Pro",
            timeLabel: "Time Spent", timeVal: "6 Hours"
        }
    }
};