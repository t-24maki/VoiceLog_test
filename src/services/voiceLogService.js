import { db } from '../config/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'

/**
 * VoiceLogのデータをFirestoreに保存
 * @param {Object} data - 保存するデータ
 * @param {string|null} data.domain - ドメイン名（現状はnull）
 * @param {string|null} data.user - ユーザー名
 * @param {string|null} data.user_email - ユーザーのメールアドレス
 * @param {string|null} data.user_uid - ユーザーのUID
 * @param {string} data.division - 部署名
 * @param {string} data.weather_score - 心のお天気（1-5）
 * @param {string} data.weather_reason - お天気の理由
 * @param {string} data.dify_feeling - 今日の気分（Difyの応答）
 * @param {string} data.dify_checkpoint - チェックポイント（Difyの応答）
 * @param {string} data.dify_nextstep - 次へのステップ（Difyの応答）
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const saveVoiceLog = async (data) => {
  try {
    // Firestoreに保存するデータを準備
    const voiceLogData = {
      domain: data.domain || null,
      user: data.user || null,
      user_email: data.user_email || null,
      user_uid: data.user_uid || null,
      datetime: serverTimestamp(), // サーバータイムスタンプを使用
      division: data.division,
      weather_score: data.weather_score,
      weather_reason: data.weather_reason,
      dify_feeling: data.dify_feeling || '',
      dify_checkpoint: data.dify_checkpoint || '',
      dify_nextstep: data.dify_nextstep || ''
    }

    // voicelogsコレクションに追加
    const docRef = await addDoc(collection(db, 'voicelogs'), voiceLogData)
    
    console.log('VoiceLogが保存されました。ID:', docRef.id)
    
    return {
      success: true,
      id: docRef.id
    }
  } catch (error) {
    console.error('VoiceLog保存エラー:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * ユーザーの入力回数を取得
 * @param {string} userUid - ユーザーのUID
 * @returns {Promise<number>} - 入力回数
 */
export const getUserInputCount = async (userUid) => {
  try {
    // voicelogsコレクションから該当ユーザーのドキュメント数を取得
    const q = query(collection(db, 'voicelogs'), where('user_uid', '==', userUid))
    const querySnapshot = await getDocs(q)
    
    const count = querySnapshot.size
    console.log(`ユーザー ${userUid} の入力回数:`, count)
    
    return count
  } catch (error) {
    console.error('入力回数取得エラー:', error)
    return 0
  }
}

/**
 * ユーザーの過去のVoiceLogを取得
 * @param {string} userUid - ユーザーのUID
 * @returns {Promise<Array>} - VoiceLogの配列
 */
export const getUserVoiceLogs = async (userUid) => {
  try {
    // voicelogsコレクションから該当ユーザーのドキュメントを取得
    const q = query(
      collection(db, 'voicelogs'), 
      where('user_uid', '==', userUid)
    )
    const querySnapshot = await getDocs(q)
    
    const voiceLogs = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      voiceLogs.push({
        id: doc.id,
        ...data,
        // FirestoreのタイムスタンプをDate型に変換
        datetime: data.datetime?.toDate ? data.datetime.toDate() : new Date(data.datetime)
      })
    })
    
    console.log(`ユーザー ${userUid} のVoiceLog:`, voiceLogs.length, '件')
    
    return voiceLogs
  } catch (error) {
    console.error('VoiceLog取得エラー:', error)
    return []
  }
}

