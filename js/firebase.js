// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, 
    query, orderBy, limit, serverTimestamp, where, writeBatch, doc, increment, updateDoc, setDoc, getDoc
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

// 5. 하트 카운트 증가 (Return: 최신 카운트)
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

// 6. [추가] 하트 카운트 단순 조회 (증가 X)
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

// 7. 관리자용 응원 메시지 전체 조회
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