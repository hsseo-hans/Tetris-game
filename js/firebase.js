// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, 
    query, orderBy, limit, serverTimestamp, where, writeBatch, doc, increment, updateDoc, setDoc, getDoc, getCountFromServer, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvlDXCp3kru3BJHUpbTNEFVLWERjkrDTw",
    authDomain: "tetris-hans.firebaseapp.com",
    databaseURL: "https://tetris-hans-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tetris-hans",
    storageBucket: "tetris-hans.firebasestorage.app",
    messagingSenderId: "820997133612",
    appId: "1:820997133612:web:0751bfc1195d501ecf4889"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. 랭킹 저장
export async function saveRankData(data) {
    try {
        const payload = {
            ailevel: Number(data.ailevel),
            ailevelscore: Number(data.score),
            country: data.country || "KR",
            nickname: data.nickname || "Anonymous",
            usercomment: data.comment || "GG",
            wincount: Number(data.wincount) || 0,
            losecount: Number(data.losecount) || 0,
            gamedate: serverTimestamp()
        };

        const q = query(
            collection(db, "game_rankings"),
            where("nickname", "==", payload.nickname),
            where("ailevel", "==", payload.ailevel)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);

        if (!snapshot.empty) {
            snapshot.forEach((d) => {
                batch.delete(d.ref);
            });
        }

        const newDocRef = doc(collection(db, "game_rankings")); 
        batch.set(newDocRef, payload);

        await batch.commit();
        return true;
    } catch (e) {
        console.error("Save Error:", e);
        return false;
    }
}

// 2. 랭킹 조회
export async function getRankingsByLevel(levelNum, limitCount = 50) {
    try {
        const numLevel = Number(levelNum);
        const q = query(
            collection(db, "game_rankings"),
            where("ailevel", "==", numLevel),
            orderBy("ailevelscore", "desc"),
            limit(limitCount)
        );
        const querySnapshot = await getDocs(q);
        const rankings = [];
        querySnapshot.forEach((doc) => rankings.push(doc.data()));
        return rankings;
    } catch (e) {
        console.error("Fetch Error:", e);
        return [];
    }
}

// 3. 랭커 확인
export async function checkIfRanker(levelNum, myScore) {
    try {
        const rankings = await getRankingsByLevel(levelNum, 10);
        if (rankings.length < 10) return true;
        const lastRankerScore = rankings[rankings.length - 1].ailevelscore;
        return myScore > lastRankerScore;
    } catch (e) {
        console.error("Check Rank Error:", e);
        return false;
    }
}

// 4. 응원 메시지 저장
export async function saveHeartComment(nickname, comment) {
    try {
        await addDoc(collection(db, "hart_comment"), {
            hartnickname: nickname,
            hartcomment: comment,
            timestamp: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Heart Comment Error:", e);
        return false;
    }
}

// 5. 하트 카운트 증가
export async function incrementHeartCount() {
    try {
        const countRef = doc(db, "hart_count", "total");
        const docSnap = await getDoc(countRef);
        
        if (docSnap.exists()) {
            await updateDoc(countRef, { hartcount: increment(1) });
        } else {
            await setDoc(countRef, { hartcount: 1 });
        }

        const updatedSnap = await getDoc(countRef);
        return updatedSnap.exists() ? updatedSnap.data().hartcount : 1;
    } catch (e) {
        console.error("Heart Increment Error:", e);
        return 0;
    }
}

// 6. 하트 카운트 조회
export async function getHeartCount() {
    try {
        const countRef = doc(db, "hart_count", "total");
        const docSnap = await getDoc(countRef);
        return docSnap.exists() ? docSnap.data().hartcount : 0;
    } catch (e) {
        console.error("Get Heart Count Error:", e);
        return 0;
    }
}

// 7. 관리자 메시지 조회
export async function getHeartMessages() {
    try {
        const q = query(
            collection(db, "hart_comment"),
            orderBy("timestamp", "desc"),
            limit(100)
        );
        const querySnapshot = await getDocs(q);
        const messages = [];
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            let dateStr = "-";
            if (d.timestamp) {
                const date = d.timestamp.toDate();
                dateStr = date.toLocaleString();
            }
            messages.push({ ...d, dateStr });
        });
        return messages;
    } catch (e) {
        console.error("Fetch Messages Error:", e);
        return [];
    }
}

// 8. Fight Log 업데이트 (gametime 추가)
export async function updateFightLog(nickname, level, isWin) {
    try {
        const q = query(collection(db, "fight_log"), where("nickname", "==", nickname));
        const snapshot = await getDocs(q);
        
        let docRef;
        const updateData = {
            totalgamecount: increment(1),
            totalwincount: isWin ? increment(1) : increment(0),
            totallosecount: isWin ? increment(0) : increment(1),
            gametime: serverTimestamp() // [추가]
        };

        const winField = `ai${level}win`;
        const loseField = `ai${level}lose`;

        if (isWin) {
            updateData[winField] = increment(1);
        } else {
            updateData[loseField] = increment(1);
        }

        if (snapshot.empty) {
            const newDoc = {
                nickname: nickname,
                totalgamecount: 1,
                totalwincount: isWin ? 1 : 0,
                totallosecount: isWin ? 0 : 1,
                [`ai1win`]: 0, [`ai1lose`]: 0,
                [`ai2win`]: 0, [`ai2lose`]: 0,
                [`ai3win`]: 0, [`ai3lose`]: 0,
                [`ai4win`]: 0, [`ai4lose`]: 0,
                gametime: serverTimestamp() // [추가]
            };
            if (isWin) newDoc[winField] = 1; 
            else newDoc[loseField] = 1;

            docRef = await addDoc(collection(db, "fight_log"), newDoc);
        } else {
            docRef = snapshot.docs[0].ref;
            await updateDoc(docRef, updateData);
        }
        
        const updatedSnap = await getDoc(docRef);
        const data = updatedSnap.data();
        
        return {
            win: data[winField] || 0,
            lose: data[loseField] || 0
        };

    } catch (e) {
        console.error("Fight Log Update Error:", e);
        return { win: 0, lose: 0 };
    }
}

// 9. [신규] 게임 통계 조회 (오늘 유저, 전체 유저)
export async function getGameStats() {
    try {
        const fightLogRef = collection(db, "fight_log");
        
        const snapshotTotal = await getCountFromServer(fightLogRef);
        const totalUsers = snapshotTotal.data().count;

        const today = new Date();
        today.setHours(0,0,0,0);
        const todayTs = Timestamp.fromDate(today);
        
        const qToday = query(fightLogRef, where("gametime", ">=", todayTs));
        const snapshotToday = await getCountFromServer(qToday);
        const todayUsers = snapshotToday.data().count;

        return {
            totalUsers: totalUsers, 
            todayUsers: todayUsers 
        };
    } catch (e) {
        console.error("Stats Error:", e);
        return { totalUsers: 0, todayUsers: 0 };
    }
}

// 10. [신규] 최근 게임 로그 조회
export async function getRecentGameLogs() {
    try {
        const q = query(
            collection(db, "fight_log"),
            orderBy("gametime", "desc"),
            limit(50)
        );
        const snapshot = await getDocs(q);
        const logs = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            let timeStr = "방금 전";
            if(d.gametime) {
                timeStr = d.gametime.toDate().toLocaleString();
            }
            logs.push({
                nickname: d.nickname || "Unknown",
                total: d.totalgamecount || 0,
                win: d.totalwincount || 0,
                lose: d.totallosecount || 0,
                time: timeStr
            });
        });
        return logs;
    } catch (e) {
        console.error("Fetch Logs Error:", e);
        return [];
    }
}