// js/retro_sound.js
// 8-bit 레트로 효과음 생성기 (Web Audio API)

export function playRetroSFX(ctx, type, masterVolume = 0.5) {
    if (!ctx) return;
    const t = ctx.currentTime;
    
    // 오실레이터(소리)와 게인(볼륨) 노드 생성
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    // 효과음 볼륨 밸런스 (BGM보다 조금 작거나 비슷하게 조정)
    const vol = 0.3 * masterVolume; 

    switch (type) {
        case 'start': // 게임 시작: 띠로리링~ (상승 아르페지오)
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, t);       // A4
            osc.frequency.setValueAtTime(554, t + 0.1); // C#5
            osc.frequency.setValueAtTime(659, t + 0.2); // E5
            osc.frequency.setValueAtTime(880, t + 0.3); // A5
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.6);
            
            osc.start(t);
            osc.stop(t + 0.6);
            break;

        case 'drop': // 블럭 놓기: 툭! (짧고 낮은 파형)
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            
            osc.start(t);
            osc.stop(t + 0.1);
            break;

        case 'clear': // 라인 클리어: 띠링! (코인 획득 느낌)
            osc.type = 'square';
            osc.frequency.setValueAtTime(1046, t); // C6
            osc.frequency.setValueAtTime(1318, t + 0.1); // E6
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.4);
            
            osc.start(t);
            osc.stop(t + 0.4);
            break;

        case 'attack': // 공격 보낼 때: 삐유~ (레이저 느낌)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            
            osc.start(t);
            osc.stop(t + 0.3);
            break;

        case 'swoosh': // 공격 날아가는 소리: 슈욱 (화이트노이즈 대체용 빠른 슬라이드)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(800, t + 0.2);
            
            gain.gain.setValueAtTime(vol * 0.8, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            
            osc.start(t);
            osc.stop(t + 0.3);
            break;
            
        case 'count': // 카운트다운: 삑 (짧은 비프음)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(660, t);
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            
            osc.start(t);
            osc.stop(t + 0.1);
            break;

        case 'win': // 승리: 빰 빠라밤~ (팡파레)
            osc.type = 'square';
            // 간단한 멜로디 시퀀싱 (주파수 변경으로 구현)
            osc.frequency.setValueAtTime(523, t);       // C5
            osc.frequency.setValueAtTime(659, t + 0.15); // E5
            osc.frequency.setValueAtTime(783, t + 0.3);  // G5
            osc.frequency.setValueAtTime(1046, t + 0.45); // C6
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 1.5);
            
            osc.start(t);
            osc.stop(t + 1.5);
            break;

        case 'lose': // 패배: 피유우우웅... (전원 꺼지는 소리)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.exponentialRampToValueAtTime(10, t + 1.0);
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.linearRampToValueAtTime(0, t + 1.0);
            
            osc.start(t);
            osc.stop(t + 1.0);
            break;
    }
}