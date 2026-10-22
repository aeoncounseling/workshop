// 워크숍 백엔드 (Firebase Firestore + Authentication)
// - 참가자: 익명 로그인, CBI 세 점수만 제출 (욕구·강점 검사는 서버를 쓰지 않음)
// - 강사: 이메일/비밀번호 로그인, 회차 관리와 CBI 집계 읽기·삭제
import { firebaseConfig } from './firebase-config.js';

// Firebase JS SDK 13.1.0 (assets/vendor에 자체 호스팅)

let _fb = null;
async function fb() {
  if (_fb) return _fb;
  if (!isConfigured()) throw new Error('not-configured');
  const [app, auth, fs] = await Promise.all([
    import('./vendor/firebase-app.js'),
    import('./vendor/firebase-auth.js'),
    import('./vendor/firebase-firestore.js')
  ]);
  const a = app.initializeApp(firebaseConfig);
  const au = auth.getAuth(a);
  // 익명 UID를 같은 브라우저 탭 안에서만 유지 (탭을 닫으면 사라짐)
  await auth.setPersistence(au, auth.browserSessionPersistence);
  _fb = { auth, fs, au, db: fs.getFirestore(a) };
  return _fb;
}

export function isConfigured() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
}

export const SESSION_RE = /^[A-Za-z0-9-]{3,40}$/;

/* ───────── 참가자 ───────── */

// 회차 상태 조회. 문서가 없으면 exists:false
export async function getSessionStatus(sessionId) {
  const { fs, db } = await fb();
  const snap = await fs.getDoc(fs.doc(db, 'sessions', sessionId));
  if (!snap.exists()) return { exists: false };
  const d = snap.data();
  return { exists: true, cbiOpen: d.cbiOpen === true, needsOpen: d.needsOpen === true, strengthsOpen: d.strengthsOpen === true };
}

// CBI 세 하위척도 점수만 제출. 문서 ID = 익명 UID → 같은 탭에서 다시 제출해도 1명으로 갱신
export async function submitCbi(sessionId, scores) {
  const { auth, au, fs, db } = await fb();
  if (!au.currentUser) await auth.signInAnonymously(au);
  const uid = au.currentUser.uid;
  await fs.setDoc(fs.doc(db, 'sessions', sessionId, 'cbiResults', uid), {
    personalBurnout: scores.personalBurnout,
    workBurnout: scores.workBurnout,
    patientBurnout: scores.patientBurnout,
    submittedAt: fs.serverTimestamp()
  });
}

/* ───────── 강사 ───────── */

export async function onAdminState(cb) {
  const { auth, au } = await fb();
  return auth.onAuthStateChanged(au, u => cb(u && !u.isAnonymous ? { email: u.email } : null));
}
export async function adminSignIn(email, password) {
  const { auth, au } = await fb();
  await auth.signInWithEmailAndPassword(au, email, password);
}
export async function adminSignOut() {
  const { auth, au } = await fb();
  await auth.signOut(au);
}

export async function watchSessions(cb, onError) {
  const { fs, db } = await fb();
  const q = fs.query(fs.collection(db, 'sessions'), fs.orderBy('createdAt', 'desc'));
  return fs.onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...plain(d.data()) }))), onError);
}
function plain(d) {
  return { cbiOpen: !!d.cbiOpen, needsOpen: !!d.needsOpen, strengthsOpen: !!d.strengthsOpen, ended: !!d.ended };
}

export async function createSession(sessionId) {
  if (!SESSION_RE.test(sessionId)) throw new Error('invalid-id');
  const { fs, db } = await fb();
  const ref = fs.doc(db, 'sessions', sessionId);
  const ex = await fs.getDoc(ref);
  if (ex.exists()) throw new Error('exists');
  await fs.setDoc(ref, { cbiOpen: false, needsOpen: false, strengthsOpen: false, ended: false, createdAt: fs.serverTimestamp() });
}

export async function updateSession(sessionId, patch) {
  const { fs, db } = await fb();
  await fs.updateDoc(fs.doc(db, 'sessions', sessionId), patch);
}

// CBI 집계 실시간 구독: 제출된 세 점수 목록만 전달 (문서 ID·시간은 넘기지 않음)
export async function watchCbi(sessionId, cb, onError) {
  const { fs, db } = await fb();
  return fs.onSnapshot(fs.collection(db, 'sessions', sessionId, 'cbiResults'),
    s => cb(s.docs.map(d => {
      const x = d.data();
      return { personalBurnout: x.personalBurnout, workBurnout: x.workBurnout, patientBurnout: x.patientBurnout };
    })), onError);
}

export async function clearCbi(sessionId) {
  const { fs, db } = await fb();
  const col = fs.collection(db, 'sessions', sessionId, 'cbiResults');
  const s = await fs.getDocs(col);
  let batch = fs.writeBatch(db), n = 0;
  for (const d of s.docs) {
    batch.delete(d.ref);
    if (++n % 400 === 0) { await batch.commit(); batch = fs.writeBatch(db); }
  }
  await batch.commit();
  return s.size;
}

export async function deleteSession(sessionId) {
  const { fs, db } = await fb();
  await clearCbi(sessionId);
  await fs.deleteDoc(fs.doc(db, 'sessions', sessionId));
}
