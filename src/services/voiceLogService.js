import { db } from '../config/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore'

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

/**
 * ユーザーの過去の入力日数を取得
 * @param {string} userUid - ユーザーのUID
 * @returns {Promise<number>} - 過去の入力日数
 */
export const getUserInputDaysCount = async (userUid) => {
  try {
    const voiceLogs = await getUserVoiceLogs(userUid)
    
    // 日付ごとにグループ化（日付文字列をキーとして使用）
    const uniqueDates = new Set()
    
    voiceLogs.forEach((log) => {
      if (log.datetime) {
        const dateString = log.datetime.toISOString().split('T')[0]
        uniqueDates.add(dateString)
      }
    })
    
    const daysCount = uniqueDates.size
    console.log(`ユーザー ${userUid} の入力日数:`, daysCount)
    
    return daysCount
  } catch (error) {
    console.error('入力日数取得エラー:', error)
    return 0
  }
}

/**
 * ユーザーが今日すでに漫画を生成したかチェック
 * @param {string} userUid - ユーザーのUID
 * @returns {Promise<boolean>} - 今日すでに生成している場合はtrue
 */
export const checkMangaGeneratedToday = async (userUid) => {
  try {
    if (!userUid) {
      return false
    }

    // manga_generationsコレクションからユーザーのドキュメントを取得
    const docRef = doc(db, 'manga_generations', userUid)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      // ドキュメントが存在しない場合は、まだ生成していない
      return false
    }

    const data = docSnap.data()
    const lastGeneratedDate = data.last_generated_date

    if (!lastGeneratedDate) {
      return false
    }

    // FirestoreのタイムスタンプをDate型に変換
    const lastDate = lastGeneratedDate.toDate ? lastGeneratedDate.toDate() : new Date(lastGeneratedDate)
    
    // 今日の日付を取得（時刻を0:00:00に設定）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 最後に生成した日付（時刻を0:00:00に設定）
    const lastDateOnly = new Date(lastDate)
    lastDateOnly.setHours(0, 0, 0, 0)

    // 今日と同じ日付かチェック
    const isToday = today.getTime() === lastDateOnly.getTime()
    
    console.log(`ユーザー ${userUid} の漫画生成チェック:`, {
      lastDate: lastDateOnly.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0],
      isToday
    })

    return isToday
  } catch (error) {
    console.error('漫画生成チェックエラー:', error)
    // エラーが発生した場合は、エラーを再スローして呼び出し元で処理させる
    throw error
  }
}

/**
 * ユーザーの漫画生成日時を保存
 * @param {string} userUid - ユーザーのUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveMangaGenerationDate = async (userUid) => {
  try {
    if (!userUid) {
      return {
        success: false,
        error: 'userUid is required'
      }
    }

    // manga_generationsコレクションにユーザーのUIDをドキュメントIDとして保存
    const docRef = doc(db, 'manga_generations', userUid)
    await setDoc(docRef, {
      user_uid: userUid,
      last_generated_date: serverTimestamp()
    }, { merge: true }) // merge: trueで既存のドキュメントを更新

    console.log(`ユーザー ${userUid} の漫画生成日時を保存しました`)
    
    return {
      success: true
    }
  } catch (error) {
    console.error('漫画生成日時保存エラー:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 特定日付のユーザーのVoiceLogを取得（その日の最後の入力内容）
 * @param {string} userUid - ユーザーのUID
 * @param {string} dateString - 日付文字列（YYYY-MM-DD形式）
 * @returns {Promise<Object|null>} - VoiceLogのオブジェクト、見つからない場合はnull
 */
export const getUserVoiceLogByDate = async (userUid, dateString) => {
  try {
    const voiceLogs = await getUserVoiceLogs(userUid)
    
    // 指定された日付のログをフィルタリング
    const logsOnDate = voiceLogs.filter((log) => {
      if (!log.datetime) return false
      const logDateString = log.datetime.toISOString().split('T')[0]
      return logDateString === dateString
    })
    
    if (logsOnDate.length === 0) {
      console.log(`ユーザー ${userUid} の ${dateString} のVoiceLogが見つかりませんでした`)
      return null
    }
    
    // その日の最後の入力内容を取得（datetimeでソート）
    const sortedLogs = logsOnDate.sort((a, b) => {
      return b.datetime.getTime() - a.datetime.getTime()
    })
    
    const lastLog = sortedLogs[0]
    console.log(`ユーザー ${userUid} の ${dateString} の最後のVoiceLogを取得しました`)
    
    return lastLog
  } catch (error) {
    console.error('日付別VoiceLog取得エラー:', error)
    return null
  }
}

