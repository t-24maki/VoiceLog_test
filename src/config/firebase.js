import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Firebaseの設定
// 本番環境では環境変数を使用してください
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "voicelog-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "voicelog-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "voicelog-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
}

// Firebaseの初期化
const app = initializeApp(firebaseConfig)

// Firestoreの取得
const db = getFirestore(app)

// Firebase Authの取得
const auth = getAuth(app)

// Google認証プロバイダーの作成
const googleProvider = new GoogleAuthProvider()

// プロジェクトIDをエクスポート（環境判定に使用）
export const firebaseProjectId = firebaseConfig.projectId

export { db, auth, googleProvider }

