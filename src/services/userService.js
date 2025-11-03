import { db } from '../config/firebase'
import { doc, getDoc } from 'firebase/firestore'

/**
 * ドメインIDに基づいて、指定されたメールアドレスのユーザーが許可されているか確認
 * @param {string} domainId - ドメインID（URLパスの一部、例: "test"）
 * @param {string} email - 確認するユーザーのメールアドレス
 * @returns {Promise<{allowed: boolean, userData?: Object, error?: string}>}
 */
export const checkUserAllowed = async (domainId, email) => {
  try {
    if (!domainId || !email) {
      return {
        allowed: false,
        error: 'ドメインIDまたはメールアドレスが指定されていません'
      }
    }

    // domainsコレクションから該当ドメインのドキュメントを取得
    const domainDocRef = doc(db, 'domains', domainId)
    const domainDoc = await getDoc(domainDocRef)

    if (!domainDoc.exists()) {
      console.log(`ドメイン "${domainId}" は存在しません`)
      return {
        allowed: false,
        error: '指定されたドメインが見つかりません'
      }
    }

    const domainData = domainDoc.data()
    let allowedUsers = domainData.allowed_users || []
    
    console.log('domainData:', domainData)
    console.log('allowedUsers:', allowedUsers, 'type:', typeof allowedUsers, 'isArray:', Array.isArray(allowedUsers))
    
    // 配列でない場合は配列に変換（Firebase Consoleでフィールドタイプを間違えた場合の対応）
    if (!Array.isArray(allowedUsers)) {
      console.warn('allowed_users is not an array, converting...')
      allowedUsers = Object.values(allowedUsers)
    }

    // メールアドレスで許可ユーザーを検索
    const userData = allowedUsers.find(
      user => user.email && user.email.toLowerCase() === email.toLowerCase()
    )

    if (userData) {
      console.log(`ユーザー "${email}" はドメイン "${domainId}" にアクセス許可されています`)
      return {
        allowed: true,
        userData: userData
      }
    } else {
      console.log(`ユーザー "${email}" はドメイン "${domainId}" にアクセス許可されていません`)
      return {
        allowed: false,
        error: 'このドメインへのアクセス権限がありません'
      }
    }
  } catch (error) {
    console.error('ユーザー許可確認エラー:', error)
    return {
      allowed: false,
      error: error.message || 'ユーザー許可確認中にエラーが発生しました'
    }
  }
}

/**
 * URLパスからドメインIDを抽出
 * @param {string} pathname - 現在のURLパス（例: "/test/", "/test/settings"）
 * @returns {string|null} - ドメインID（例: "test"）またはnull
 */
export const extractDomainIdFromPath = (pathname) => {
  if (!pathname || pathname === '/') {
    return null
  }

  // パスをスラッシュで分割し、最初の非空のセグメントを取得
  const segments = pathname.split('/').filter(seg => seg.length > 0)
  
  if (segments.length > 0) {
    return segments[0]
  }
  
  return null
}

/**
 * ドメインIDに基づいて部署一覧を取得
 * @param {string} domainId - ドメインID（URLパスの一部、例: "test", "dev-local"）
 * @returns {Promise<Array<string>>} - 部署名の配列（取得失敗時はデフォルト値を返す）
 */
export const getDomainDepartments = async (domainId) => {
  try {
    // ドメインIDがnullの場合は開発環境とみなして"dev-local"を使用
    const targetDomainId = domainId || 'dev-local'
    
    // domainDepartmentsコレクションから該当ドメインのドキュメントを取得
    const departmentDocRef = doc(db, 'domainDepartments', targetDomainId)
    const departmentDoc = await getDoc(departmentDocRef)

    if (!departmentDoc.exists()) {
      console.log(`ドメイン "${targetDomainId}" の部署一覧が見つかりません。デフォルト値を返します。`)
      // デフォルトの部署一覧を返す
      return ['プロップ', 'etc']
    }

    const departmentData = departmentDoc.data()
    let departments = departmentData.departments || []
    
    // 配列でない場合は配列に変換（Firebase Consoleでフィールドタイプを間違えた場合の対応）
    if (!Array.isArray(departments)) {
      console.warn('departments is not an array, converting...')
      departments = Object.values(departments)
    }

    // 配列が空の場合はデフォルト値を返す
    if (departments.length === 0) {
      console.log(`ドメイン "${targetDomainId}" の部署一覧が空です。デフォルト値を返します。`)
      return ['プロップ', 'etc']
    }

    console.log(`ドメイン "${targetDomainId}" の部署一覧を取得しました:`, departments)
    return departments
  } catch (error) {
    console.error('部署一覧取得エラー:', error)
    // エラー時はデフォルト値を返す
    return ['プロップ', 'etc']
  }
}

