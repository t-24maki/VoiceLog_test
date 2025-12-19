import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import jaLocale from '@fullcalendar/core/locales/ja'
import { DifyClient } from './config/dify'
import { GptClient, GeminiClient } from './config/gpt'
import { saveVoiceLog, getUserInputCount, getUserVoiceLogs, getUserInputDaysCount, getUserInputDaysCountThisMonth, checkMangaGeneratedToday, saveMangaGenerationDate, getUserVoiceLogByDate, getUserLastDepartment } from './services/voiceLogService'
import { checkUserAllowed, extractDomainIdFromPath, getDomainDepartments } from './services/userService'
import { auth, googleProvider, firebaseProjectId } from './config/firebase'

// 開発環境かどうかを判定
// 優先順位: 1. URLベースの判定（最も確実） 2. 環境変数で明示的に指定 3. FirebaseプロジェクトIDで判定
const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
const explicitEnv = import.meta.env.VITE_APP_ENV // 'development' または 'production'

// 本番環境のURLかどうかをチェック（voicelog.jpドメインの場合は本番環境）
const isProductionUrl = hostname === 'voicelog.jp' || hostname.endsWith('.voicelog.jp')

// 開発環境の判定
// URLベースの判定が最優先: voicelog.jpの場合は本番環境（開発環境ではない）
// localhostやその他の場合は開発環境と判定
const isDevelopment = !isProductionUrl && (
  explicitEnv === 'development' || 
  (explicitEnv !== 'production' && 
   (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('localhost') ||
    firebaseProjectId === 'voicelog-dev' || 
    (firebaseProjectId && firebaseProjectId.includes('dev')))
  )
)

// デバッグ用: 実際に使用されているプロジェクトIDと環境判定結果をログ出力
console.log('[環境判定] ホスト名:', hostname || '未取得')
console.log('[環境判定] 本番URL:', isProductionUrl)
console.log('[環境判定] 明示的な環境指定:', explicitEnv || '未設定')
console.log('[環境判定] FirebaseプロジェクトID:', firebaseProjectId)
console.log('[環境判定] 開発環境:', isDevelopment)
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import './App.css'


// 漫画作成機能の有効/無効を切り替えるフラグ
const ENABLE_MANGA_GENERATION = false; // trueにすると漫画作成機能が有効になります

// 漫画作成で使用するAIモデルを切り替えるフラグ
// "gpt" または "gemini" を指定（デフォルト: "gpt"）
const MANGA_AI_PROVIDER = "gemini"; // "gpt" または "gemini"

// 数値を記号に変換する関数
const convertNumberToSymbol = (number) => {
  switch (number) {
    case '5': return '◎'
    case '4': return '○'
    case '3': return '△'
    case '2': return 'ー'
    case '1': return '×'
    default: return ''
  }
}

// 特定の文言をオレンジ色の太文字で表示する関数
const highlightKeywords = (text) => {
  if (!text) return ''
  
  // HTML特殊文字をエスケープ
  const escapeHtml = (str) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  
  const keywords = [
    '★これからチャレンジすべきこと',
    '★チャレンジのために解決すべきこと',
    '★懸念されること',
    '★アドバイス',
    '★今日の貴方の気分は',
    '★ちょっと雑談'
  ]
  
  // まずHTML特殊文字をエスケープ
  let result = escapeHtml(text)
  
  // 改行を<br>タグに変換
  result = result.replace(/\n/g, '<br>')
  
  // キーワードをハイライト
  keywords.forEach(keyword => {
    const escapedKeyword = escapeHtml(keyword)
    const regex = new RegExp(escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    // 表示時は「★」を除去
    const displayKeyword = escapedKeyword.replace(/★/g, '')
    result = result.replace(regex, `<span class="highlight-keyword">${displayKeyword}</span>`)
  })
  
  return result
}

// トップ画面コンポーネント
function TopScreen({ user }) {
  const [input1, setInput1] = useState('') // 部署の初期値は空
  const [input2, setInput2] = useState('') // お天気の初期値は空
  const [input3, setInput3] = useState('')
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const [fixedText, setFixedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [difyResponse, setDifyResponse] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [calendarEvents, setCalendarEvents] = useState([])
  const [parsedResponse, setParsedResponse] = useState({})
  const [inputCount, setInputCount] = useState(0) // 過去の合計入力日数（下部の表示用）
  const [inputDaysCountThisMonth, setInputDaysCountThisMonth] = useState(0) // 今月の入力日数（画像表示用）
  const [isReasonFocused, setIsReasonFocused] = useState(false)
  const [departments, setDepartments] = useState(['プロップ', 'etc']) // 部署一覧のstate
  const [isMangaGenerating, setIsMangaGenerating] = useState(false)
  const [mangaImageUrl, setMangaImageUrl] = useState('')
  const [mangaLimitMessage, setMangaLimitMessage] = useState('') // 漫画作成制限メッセージ
  const [isMangaModalOpen, setIsMangaModalOpen] = useState(false) // 漫画拡大表示モーダル
  const [selectedDate, setSelectedDate] = useState(null) // 選択された日付（YYYY-MM-DD形式）
  const [selectedDateHistory, setSelectedDateHistory] = useState(null) // 選択された日付の履歴データ
  const [lastSubmittedInput3, setLastSubmittedInput3] = useState('') // 最後に送信されたユーザー入力内容

  const difyClient = new DifyClient()
  const gptClient = new GptClient()
  const geminiClient = new GeminiClient()
  
  // 漫画作成で使用するAIクライアントを選択
  const mangaAiClient = MANGA_AI_PROVIDER === "gemini" ? geminiClient : gptClient

  // THANK YOU!メッセージまでスクロールする関数
  const scrollToThankYou = () => {
    const thankYouMessage = document.querySelector('.thank-you-message')
    if (thankYouMessage) {
      // 要素の位置を取得
      const elementRect = thankYouMessage.getBoundingClientRect()
      const elementTop = elementRect.top + window.pageYOffset
      
      // ナビゲーションバーの高さを考慮してスクロール位置を調整
      const navHeight = 48 // ナビゲーションバーの高さ
      const offset = 20 // 追加の余白
      const targetPosition = elementTop - navHeight - offset
      
      // スムーズスクロール
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      })
    }
  }

  // difyレスポンスを解析する関数
  const parseDifyResponse = (response) => {
    console.log('解析対象のレスポンス:', response); // デバッグ用
    
    let feeling = '';
    let genzyo = '';
    let kadai = '';
    
    // 【今日の気分】の抽出
    const feelingMatch = response.match(/【今日の気分】\s*\n([\s\S]*?)(?=【|$)/);
    if (feelingMatch) {
      feeling = feelingMatch[1].trim();
    }
    
    // 【チェックポイント】の抽出
    const genzyoMatch = response.match(/【チェックポイント】\s*\n([\s\S]*?)(?=【|$)/);
    if (genzyoMatch) {
      genzyo = genzyoMatch[1].trim();
    }
    
    // 【次へのステップ】の抽出
    const kadaiMatch = response.match(/【次へのステップ】\s*\n([\s\S]*?)(?=【|$)/);
    if (kadaiMatch) {
      kadai = kadaiMatch[1].trim();
    }
    
    const result = {
      feeling,
      genzyo,
      kadai
    };
    
    console.log('解析結果:', result); // デバッグ用
    return result;
  };

  // Firestoreからカレンダーイベントを読み込む関数
  const loadCalendarEvents = useCallback(async () => {
    if (user && user.uid) {
      const voiceLogs = await getUserVoiceLogs(user.uid)
      
      // 日付ごとにグループ化し、各日付の最後の記録のみを取得
      const eventsByDate = {}
      voiceLogs.forEach((log) => {
        if (log.datetime && log.weather_score) {
          const dateString = log.datetime.toISOString().split('T')[0]
          
          // その日付の記録がまだない、または既存の記録より新しい場合に更新
          if (!eventsByDate[dateString] || log.datetime > eventsByDate[dateString].datetime) {
            eventsByDate[dateString] = {
              datetime: log.datetime,
              weatherNumber: log.weather_score
            }
          }
        }
      })
      
      // カレンダーイベントに変換
      const events = Object.keys(eventsByDate).map((dateString) => {
        const symbol = convertNumberToSymbol(eventsByDate[dateString].weatherNumber)
        return {
          id: dateString,
          title: symbol,
          date: dateString,
          weatherNumber: eventsByDate[dateString].weatherNumber,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: '#000000'
        }
      })
      
      setCalendarEvents(events)
    }
  }, [user])

  // カレンダーの日付クリックイベントを処理する関数
  const handleDateClick = useCallback(async (dateString) => {
    if (!user || !user.uid) return
    
    // その日付にデータがあるかチェック
    const event = calendarEvents.find(e => e.date === dateString)
    if (!event) {
      return
    }
    
    setSelectedDate(dateString)
    
    // 今日の日付かどうかをチェック
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    if (dateString === todayString) {
      // 今日の日付をクリックした場合は、履歴データをクリア（今日の表示にする）
      setSelectedDateHistory(null)
    } else {
      // 過去の日付をクリックした場合は、履歴データを取得
      const historyData = await getUserVoiceLogByDate(user.uid, dateString)
      setSelectedDateHistory(historyData)
    }
  }, [user, calendarEvents])

  useEffect(() => {
    // ローカルストレージから固定テキストを読み込み
    const savedText = localStorage.getItem('fixedText')
    if (savedText) {
      setFixedText(savedText)
    } else {
      setFixedText('デフォルトの固定テキスト')
    }

    // ユーザーの過去の入力日数を取得（下部の表示用）
    const fetchInputDaysCount = async () => {
      if (user && user.uid) {
        const daysCount = await getUserInputDaysCount(user.uid)
        setInputCount(daysCount)
      }
    }
    fetchInputDaysCount()
    
    // ユーザーの今月の入力日数を取得（画像表示用）
    const fetchInputDaysCountThisMonth = async () => {
      if (user && user.uid) {
        const daysCount = await getUserInputDaysCountThisMonth(user.uid)
        setInputDaysCountThisMonth(daysCount)
      }
    }
    fetchInputDaysCountThisMonth()
    
    // Firestoreからカレンダーイベントを読み込み
    loadCalendarEvents()

    // ドメインに基づいて部署一覧を取得
    const fetchDepartments = async () => {
      const domainId = extractDomainIdFromPath(window.location.pathname)
      const departmentList = await getDomainDepartments(domainId)
      setDepartments(departmentList)
    }
    fetchDepartments()
  }, [user, loadCalendarEvents])

  // 部署一覧の更新に合わせて初期選択値を設定（最後に選択した部署を優先）
  useEffect(() => {
    if (!departments.length) {
      setInput1('')
      return
    }

    // 最後に選択した部署を取得して設定
    const fetchLastDepartment = async () => {
      if (user && user.uid) {
        const lastDepartment = await getUserLastDepartment(user.uid)
        
        // 最後に選択した部署が存在し、現在の部署一覧に含まれている場合
        if (lastDepartment && departments.includes(lastDepartment)) {
          setInput1(lastDepartment)
          return
        }
      }
      
      // 最後の部署が取得できない、または部署一覧に含まれていない場合は
      // 現在の値が有効ならそのまま、そうでなければ最初の部署を選択
      setInput1((current) => {
        if (current && departments.includes(current)) {
          return current
        }
        return departments[0]
      })
    }
    
    fetchLastDepartment()
  }, [departments, user])


  // フェードアウト完了後にstateをリセット
  useEffect(() => {
    if (isFadingOut) {
      const timer = setTimeout(() => {
        setIsFadingOut(false)
      }, 450) // フェードアウトアニメーション完了後にリセット
      
      return () => clearTimeout(timer)
    }
  }, [isFadingOut])

/**
 * 漫画生成処理（非同期で実行） - dall-e-3固定・再試行なし（JS版）
 * @param {string} inputText
 * @param {object} user - ユーザー情報
 */
const generateManga = async (inputText, user) => {
  setIsMangaGenerating(true);
  setMangaImageUrl("");
  setMangaLimitMessage("");

  try {
    if (!inputText || !String(inputText).trim()) {
      console.warn("空の入力です");
      setIsMangaGenerating(false);
      return;
    }

    // ユーザーが今日すでに漫画を生成したかチェック（本番環境のみ）
    if (!isDevelopment && user && user.uid) {
      try {
        const alreadyGenerated = await checkMangaGeneratedToday(user.uid);
        if (alreadyGenerated) {
          console.log("今日すでに漫画を生成しています");
          setMangaLimitMessage("漫画作成は1日1回までです");
          setIsMangaGenerating(false);
          return;
        }
      } catch (checkError) {
        // チェックでエラーが発生した場合（権限エラーなど）、API呼び出しを停止
        console.error("漫画生成チェックでエラーが発生しました:", checkError);
        setMangaLimitMessage("漫画作成の確認中にエラーが発生しました。しばらく時間をおいてから再度お試しください。");
        setIsMangaGenerating(false);
        return;
      }
    } else if (isDevelopment) {
      console.log("開発環境のため、漫画作成の制限チェックをスキップします");
    }

    console.log("漫画生成 - 送信データ:", inputText);

    // 共通のsystemPrompt（日本語）
    const systemPrompt =
      `貴方はユーザーの報告を４コマ漫画にする一流のクリエイターです。
内容を分かりやすく４コマ漫画にしてください`;

    // 共通のuserPrompt（日本語）
    const userPromptBase = `【内容】
${String(inputText).trim()}

【条件】
- 必ず「4コマ漫画、2x2のグリッド構成」と明記
- 可愛いトイプードルが主人公でシンプルな白黒の漫画風イラスト
- 言葉は大きく読みやすいゴシック体の完璧な日本語で１０文字以内
- 必ず日本語と中国語の文字を間違えないよう、文字を崩さないようにする
- 各コマに日本語の吹き出しを入れて、会話形式にする
- 画像のアスペクト比は1:1（正方形）で作成すること`;

    let imageResult;
    if (MANGA_AI_PROVIDER === "gemini") {
      // ── Step 1: gemini-2.5-flashでNano Banana用のプロンプトを生成 ─────────────────
      const userPrompt = `${userPromptBase}

上記の内容と条件に基づいて、Nano Banana（gemini-2.5-flash-image）で画像生成するための最適なプロンプトを作成してください。`;

      console.log("ステップ1: Nano Banana用プロンプト生成中...");
      const promptResult = await mangaAiClient.sendSimpleMessage(
        userPrompt,
        systemPrompt,
        "gemini-2.5-flash",
        0.3
      );

      if (!promptResult || !promptResult.success || !promptResult.text) {
        console.error("プロンプト生成エラー:", (promptResult && (promptResult.error || promptResult.message)) || "unknown");
        setIsMangaGenerating(false);
        return;
      }

      const finalPrompt = promptResult.text.trim();
      console.log("=== Nano Banana が使用するプロンプト ===");
      console.log(finalPrompt);
      console.log("=== プロンプト終了 ===");

      // ── Step 2: 生成されたプロンプトでNano Bananaを呼び出して画像生成 ────────────────────
      // 注意: aspectRatioは現在のAPIではサポートされていないため、プロンプトに含める必要があります
      console.log(`ステップ2: 画像生成中... model=gemini-2.5-flash-image`);
      imageResult = await mangaAiClient.generateImage(
        finalPrompt,
        "gemini-2.5-flash-image"
      );
    } else {
      // ── Step 1: GPTでDALL-E用のプロンプトを生成 ─────────────────
      const userPrompt = `${userPromptBase}

上記の内容と条件に基づいて、DALL-E（dall-e-3）で画像生成するための最適なプロンプトを作成してください。`;

      console.log("ステップ1: DALL-E用プロンプト生成中...");
      const promptResult = await mangaAiClient.sendSimpleMessage(
        userPrompt,
        systemPrompt,
        "gpt-4",
        0.3
      );

      if (!promptResult || !promptResult.success || !promptResult.text) {
        console.error("プロンプト生成エラー:", (promptResult && (promptResult.error || promptResult.message)) || "unknown");
        setIsMangaGenerating(false);
        return;
      }

      const finalPrompt = promptResult.text.trim();
      console.log("=== DALL-E が使用するプロンプト ===");
      console.log(finalPrompt);
      console.log("=== プロンプト終了 ===");

      // ── Step 2: 生成されたプロンプトでDALL-Eを呼び出して画像生成 ────────────────────
      const SIZE = "1792x1024"; // 縦長にしたい場合は "1024x1792"
      console.log(`ステップ2: 画像生成中... model=dall-e-3, size=${SIZE}, quality=hd`);
      imageResult = await mangaAiClient.generateImage(
        finalPrompt,
        "dall-e-3",
        SIZE,
        "hd"
      );
    }

    if (imageResult && imageResult.revisedPrompt) {
      console.log("revised_prompt:", imageResult.revisedPrompt);
    }

    if (imageResult && imageResult.success && imageResult.imageUrl) {
      setMangaImageUrl(imageResult.imageUrl);
      console.log("画像URL:", imageResult.imageUrl);
      
      // 漫画生成成功後、日時を保存（本番環境のみ）
      if (!isDevelopment && user && user.uid) {
        await saveMangaGenerationDate(user.uid);
      } else if (isDevelopment) {
        console.log("開発環境のため、漫画生成日時の保存をスキップします");
      }
    } else {
      console.error("画像生成エラー:", (imageResult && (imageResult.error || imageResult.message)) || "unknown");
    }
  } catch (err) {
    console.error("漫画生成エラー:", (err && err.message) || err);
  } finally {
    setIsMangaGenerating(false);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    setDifyResponse('')
    
    try {
      // 入力値の検証
      if (!input3.trim()) {
        setErrorMessage('理由を入力してください')
        setMessage('入力エラー')
        setShowMessage(true)
        setIsLoading(false)
        return
      }

      // userの値を取得（person変数に使用：挨拶メッセージのxxxと同じ値）
      const personValue = user ? (user.displayName || user.email.split('@')[0]) : null
      
      // personValueがnullの場合はエラー
      if (!personValue) {
        setErrorMessage('ユーザー情報が取得できませんでした。ログインし直してください。')
        setMessage('エラーが発生しました')
        setShowMessage(true)
        setIsLoading(false)
        return
      }
      
      console.log('送信データ:', { input1, input2, input3, person: personValue }) // デバッグ用
      console.log('userオブジェクト:', user) // デバッグ用
      
      // 漫画生成処理を非同期で開始（Dify処理と並行実行）
      if (ENABLE_MANGA_GENERATION) {
        generateManga(input3, user)
      }
      
      // Dify APIにメッセージを送信
      const result = await difyClient.sendMessage(input1, input2, input3, personValue)
      
      if (result.success) {
        setMessage('Difyからの回答を受信しました')
        setDifyResponse(result.text)  // result.textを使用（実際のDify APIレスポンス）
        const parsed = parseDifyResponse(result.text)  // result.textを使用
        setParsedResponse(parsed)
        setLastSubmittedInput3(input3) // 送信されたユーザー入力内容を保存
        setShowMessage(true)
        
        // Firestoreにデータを保存
        const voiceLogData = {
          domain: null, // 現状はnull
          user: user ? user.displayName || user.email : null, // ユーザー名を保存
          user_email: user ? user.email : null, // メールアドレスを保存
          user_uid: user ? user.uid : null, // UIDを保存
          division: input1,
          weather_score: input2,
          weather_reason: input3,
          dify_feeling: parsed.feeling || '',
          dify_checkpoint: parsed.genzyo || '',
          dify_nextstep: parsed.kadai || ''
        }
        
        // Firestoreに保存（非同期処理だが、エラーハンドリングのみ実施）
        saveVoiceLog(voiceLogData).then(saveResult => {
          if (saveResult.success) {
            console.log('Firestoreへの保存に成功しました。ID:', saveResult.id)
            // 保存成功後、入力日数を更新
            if (user && user.uid) {
              getUserInputDaysCount(user.uid).then(daysCount => {
                setInputCount(daysCount)
              })
              // 今月の入力日数も更新
              getUserInputDaysCountThisMonth(user.uid).then(daysCount => {
                setInputDaysCountThisMonth(daysCount)
              })
            }
            // カレンダーイベントを再読み込み
            loadCalendarEvents()
          } else {
            console.error('Firestoreへの保存に失敗しました:', saveResult.error)
          }
        })
        
        // 分析完了後、フェードアウトアニメーションを開始
        setTimeout(() => {
          setIsFadingOut(true)
          
          // フェードアウト完了後にTHANK YOU!メッセージの上部まで自動スクロール
          setTimeout(() => {
            scrollToThankYou()
          }, 350) // フェードアウトアニメーション完了後にスクロール
        }, 500) // 少し遅延を設けて結果表示を確認できるようにする
      } else {
        setErrorMessage(result.error || result.message || 'APIエラーが発生しました')
        setMessage('エラーが発生しました')
        setShowMessage(true)
        
        // エラー時もフェードアウトアニメーションを開始
        setTimeout(() => {
          setIsFadingOut(true)
          
          // エラー時もフェードアウト完了後にTHANK YOU!メッセージの上部まで自動スクロール
          setTimeout(() => {
            scrollToThankYou()
          }, 350)
        }, 500)
      }
    } catch (error) {
      console.error('送信エラー:', error) // デバッグ用
      setErrorMessage(error.message || '予期しないエラーが発生しました')
      setMessage('エラーが発生しました')
      setShowMessage(true)
      
      // エラー時もフェードアウトアニメーションを開始
      setTimeout(() => {
        setIsFadingOut(true)
        
        // エラー時もフェードアウト完了後にTHANK YOU!メッセージの上部まで自動スクロール
        setTimeout(() => {
          scrollToThankYou()
        }, 350)
      }, 500)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="top-container">
      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className={`loading-overlay ${isFadingOut ? 'fade-out' : ''}`}>
          <div className="loading-content">
            <img src="/voice.png" alt="分析中" className="loading-icon" />
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
            <p className="loading-text">20〜40秒お待ちください...</p>
          </div>
        </div>
      )}
      
        {/* 入力フォーム */}
        <div className="left-area">
          <div className="input-section">
            <div className="greeting-message">{user ? (user.displayName || user.email.split('@')[0]) : '◯◯'}さん、お仕事お疲れ様でした！</div>
            <div className="weather-image-container">
              <img src={`/mona/${Math.min(inputDaysCountThisMonth + 1, 32)}.jpg`} alt="お天気プレースホルダー" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            </div>
            <div className="input-count">
              今月{inputDaysCountThisMonth + 1}日目の入力ありがとうございます<br />（通算{inputCount + 1}日目）
            </div>
            
            <form onSubmit={handleSubmit} className="input-form">
              <div className="department-group">
                <div className="department-label">部署</div>
                <select
                  id="department"
                  value={input1}
                  onChange={(e) => setInput1(e.target.value)}
                  className="department-select"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="weather-group">
                <div className="weather-label">今日の心のお天気は？</div>
                <div className="weather-image-container"></div>
                <div className="weather-image-group" role="radiogroup" aria-label="今日の心のお天気は？">
                  {[5, 4, 3, 2, 1].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`weather-image-button${input2 === String(num) ? ' active' : ''}`}
                      onClick={() => setInput2(String(num))}
                      aria-pressed={input2 === String(num)}
                      aria-label={`お天気 ${num}`}
                    >
                      <img src={`/${num}.png`} alt={`お天気 ${num}`} className="weather-image" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="reason-group">
                <div className="reason-label">
                  今日あったことを教えてください
                  <span className="tooltip-icon">?
                    <span className="tooltip-text">今日あったこと、できたこと、困ったこと、相談したいこと、嬉しかったこと、腹が立ったことなどをメモ感覚で入力してください。箇条書きや話し言葉でも大丈夫。AIが自然な文章に整えます。</span>
                  </span>
                </div>
                <div className={`reason-textarea-bg ${input3.trim() || isReasonFocused ? 'has-input' : ''}`}></div>
                <textarea
                  id="input3"
                  value={input3}
                  onChange={(e) => setInput3(e.target.value)}
                  onFocus={() => setIsReasonFocused(true)}
                  onBlur={() => setIsReasonFocused(false)}
                  placeholder="今日あったこと、できたこと、困ったこと、相談したいこと、嬉しかったこと、腹が立ったこと、なんでもいいので教えて！"
                  className="reason-textarea"
                  required
                />
              </div>

              <div className="submit-button-container">
                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={isLoading || !input1 || !input2 || !input3.trim()}
                >
                  {isLoading ? '送信中...' : '送信'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 固定テキスト - 一時的にコメントアウト */}
        {/* <div className="left-area">
          <div className="fixed-text-section">
            <h3 className="section-title">固定テキスト</h3>
            <div className="fixed-text-display">
              <p>{fixedText}</p>
            </div>
          </div>
        </div> */}

        {/* メッセージ表示エリア */}
        <div className="right-area">
          {/* THANK YOU! メッセージ - 送信後に表示 */}
          {showMessage && (
            <div className="thank-you-message">
              THANK YOU!
            </div>
          )}
          
          {/* カレンダーウィジェット - 送信後に表示 */}
          {showMessage && (
            <CalendarWidget 
              events={calendarEvents} 
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          )}
          
          {showMessage ? (
            <div className="message-display">
              {errorMessage && (
                <div className="error-message">
                  <p><strong>エラー:</strong> {errorMessage}</p>
                </div>
              )}
              
              {/* 昨日以前の履歴データを表示 */}
              {selectedDateHistory ? (
                <>
                  {/* 日付を大きく表示 */}
                  <div style={{
                    fontFamily: "'Noto Sans JP', sans-serif",
                    fontStyle: 'normal',
                    fontWeight: 900,
                    fontSize: '32px',
                    lineHeight: '38px',
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    color: '#EAAA60',
                    marginBottom: '20px'
                  }}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ja-JP', {
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  
                  {/* ユーザーの入力内容 */}
                  {selectedDateHistory.weather_reason && (
                    <div className="simple-message-section">
                      <div className="simple-message-label">ユーザーの入力内容</div>
                      <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedDateHistory.weather_reason) }} />
                    </div>
                  )}
                  
                  {/* チェックポイント */}
                  {selectedDateHistory.dify_checkpoint && (
                    <div className="simple-message-section">
                      <div className="simple-message-label">チェックポイント</div>
                      <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedDateHistory.dify_checkpoint) }} />
                    </div>
                  )}
                  
                  {/* 次へのステップ */}
                  {selectedDateHistory.dify_nextstep && (
                    <div className="simple-message-section">
                      <div className="simple-message-label">次へのステップ</div>
                      <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(selectedDateHistory.dify_nextstep) }} />
                    </div>
                  )}
                </>
              ) : (
                /* 今日の情報を表示 */
                <>
                  {parsedResponse.feeling && (
                    <div className="simple-message-section">
                      <div className="simple-message-label">今日の気分</div>
                      <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(parsedResponse.feeling) }} />
                    </div>
                  )}
                  
                  {parsedResponse.genzyo && (
                    <div className="simple-message-section">
                      <div className="simple-message-label">チェックポイント</div>
                      <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(parsedResponse.genzyo) }} />
                    </div>
                  )}
                  
                  {parsedResponse.kadai && (
                    <div className="simple-message-section">
                      <div className="simple-message-label">次へのステップ</div>
                      <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(parsedResponse.kadai) }} />
                    </div>
                  )}
                </>
              )}
              
              {/* デバッグ用：解析結果が空の場合の表示 */}
              {!parsedResponse.feeling && !parsedResponse.genzyo && !parsedResponse.kadai && difyResponse && (
                <div className="debug-info">
                  <h3>デバッグ情報</h3>
                  <p><strong>受信したレスポンス:</strong></p>
                  <div className="simple-message-content" dangerouslySetInnerHTML={{ __html: highlightKeywords(difyResponse) }} />
                  <p><strong>解析結果:</strong></p>
                  <pre style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px'}}>
                    {JSON.stringify(parsedResponse, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* 漫画画像表示エリア - 当日の情報を見ている時だけ表示 */}
              {ENABLE_MANGA_GENERATION && !selectedDateHistory && (
                <div className="manga-section" style={{ marginTop: '30px', paddingTop: '30px' }}>
                  <div className="simple-message-label" style={{ marginBottom: '15px' }}>4コマ漫画</div>
                  <div style={{ 
                    minHeight: '400px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '20px'
                  }}>
                    {mangaLimitMessage ? (
                      <div style={{ 
                        color: '#666',
                        fontSize: '16px',
                        textAlign: 'center',
                        padding: '20px'
                      }}>
                        {mangaLimitMessage}
                      </div>
                    ) : isMangaGenerating ? (
                      <div style={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '15px'
                      }}>
                        <div className="loading-dots" style={{ display: 'flex', gap: '12px' }}>
                          <div className="loading-dot" style={{ backgroundColor: '#e99c5b' }}></div>
                          <div className="loading-dot" style={{ backgroundColor: '#e8b870' }}></div>
                          <div className="loading-dot" style={{ backgroundColor: '#e8d889' }}></div>
                          <div className="loading-dot" style={{ backgroundColor: '#b8d8a3' }}></div>
                          <div className="loading-dot" style={{ backgroundColor: '#a3d0a3' }}></div>
                        </div>
                        <div style={{ 
                          color: '#666',
                          fontSize: '16px',
                          marginTop: '10px'
                        }}>
                          漫画作成中・・・
                        </div>
                      </div>
                    ) : mangaImageUrl ? (
                      <img 
                        src={mangaImageUrl} 
                        alt="4コマ漫画" 
                        onClick={() => setIsMangaModalOpen(true)}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      />
                    ) : (
                      <div style={{ 
                        color: '#999',
                        fontSize: '14px',
                        textAlign: 'center'
                      }}>
                        漫画は生成されていません
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 漫画拡大表示モーダル */}
        {isMangaModalOpen && mangaImageUrl && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000,
              cursor: 'pointer',
            }}
            onClick={() => setIsMangaModalOpen(false)}
          >
            <img 
              src={mangaImageUrl} 
              alt="4コマ漫画（拡大表示）" 
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
    </div>
  )
}

// カレンダーコンポーネント
function CalendarWidget({ events = [], onDateClick, selectedDate }) {
  const calendarRef = useRef(null)

  useEffect(() => {
    // 選択された日付のハイライトを更新
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      // すべてのセルからselected-dateクラスを削除
      const allCells = calendarApi.el.querySelectorAll('.fc-daygrid-day')
      allCells.forEach(cell => {
        cell.classList.remove('selected-date')
        // 画像が入っている日付のセルにカーソルをポインターに設定
        const dateStr = cell.getAttribute('data-date')
        if (dateStr) {
          const event = events.find(e => e.date === dateStr)
          if (event) {
            cell.style.cursor = 'pointer'
          } else {
            cell.style.cursor = 'default'
          }
        }
      })
      // 選択された日付にクラスを追加
      if (selectedDate) {
        const selectedCell = calendarApi.el.querySelector(`[data-date="${selectedDate}"]`)
        if (selectedCell) {
          selectedCell.classList.add('selected-date')
        }
      }
    }
  }, [selectedDate, events])

  return (
    <div className="calendar-widget compact">
      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next'
          }}
          locales={[jaLocale]}
          locale="ja"
          buttonText={{
            prev: '◀',
            next: '▶'
          }}
          events={events}
          fixedWeekCount={true}
          dayMaxEvents={false}
          dayCellContent={(arg) => arg.dayNumberText.replace('日', '')}
          eventContent={(eventInfo) => {
            if (eventInfo.event.extendedProps.weatherNumber) {
              return {
                html: `<img src="/${eventInfo.event.extendedProps.weatherNumber}.png" alt="お天気 ${eventInfo.event.extendedProps.weatherNumber}" class="weather-calendar-image" />`
              }
            }
            return { html: eventInfo.event.title }
          }}
          dateClick={(info) => {
            // 画像が入っている日付のみクリック可能
            const dateString = info.dateStr
            const event = events.find(e => e.date === dateString)
            if (event && onDateClick) {
              onDateClick(dateString)
            }
          }}
        />
      </div>
    </div>
  )
}

// ログイン画面コンポーネント
function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // Google認証のポップアップを表示
      // 認証チェックはonAuthStateChangedで実行されるため、ここでは不要
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('ログインエラー:', error)
      
      // エラーメッセージを設定
      if (error.code === 'auth/popup-closed-by-user') {
        setError('ログインがキャンセルされました')
      } else if (error.code === 'auth/popup-blocked') {
        setError('ポップアップがブロックされました。ブラウザの設定を確認してください。')
      } else {
        setError('ログインに失敗しました: ' + error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <nav className="navigation">
        <div className="nav-container">
          <img src="/voicelog_header.png" alt="VoiceLog" className="nav-title-image" />
          <div className="nav-links">
            {/* ログイン画面ではナビゲーションリンクは非表示 */}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div className="login-screen">
          <div className="login-background">
            <div className="login-background-image"></div>
            <div className="login-overlay"></div>
          </div>
          
          <div className="login-content">
            <div className="login-card">
              <div className="login-title">LOGIN</div>
              <div className="login-form">
                <div className="login-form-background"></div>
              </div>
              
              <div className="login-footer">
                <div className="login-text">新規登録（ログイン）</div>
                {error && (
                  <div style={{
                    color: '#dc3545',
                    marginBottom: '15px',
                    padding: '10px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    {error}
                  </div>
                )}
                <button 
                  className="google-login-btn" 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? 'ログイン中...' : 'Googleアカウントでログイン'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <p className="footer-text">© {new Date().getFullYear()} VoiceLog</p>
        </div>
      </footer>
    </div>
  )
}

// 設定画面コンポーネント
function SettingsScreen() {
  const [fixedText, setFixedText] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    // ローカルストレージから固定テキストを読み込み
    const savedText = localStorage.getItem('fixedText')
    if (savedText) {
      setFixedText(savedText)
    } else {
      setFixedText('デフォルトの固定テキスト')
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('fixedText', fixedText)
    setIsSaved(true)
    
    // 2秒後に保存完了メッセージを非表示
    setTimeout(() => {
      setIsSaved(false)
    }, 2000)
  }

  return (
    <div className="container">
        <h1 className="title">設定</h1>
        
        <div className="settings-form">
          <div className="input-group">
            <label htmlFor="fixedText">固定テキスト表示欄の内容</label>
            <textarea
              id="fixedText"
              value={fixedText}
              onChange={(e) => setFixedText(e.target.value)}
              placeholder="固定テキスト表示欄に表示したい内容を入力してください"
              rows="6"
            />
          </div>

          <button onClick={handleSave} className="save-btn">
            保存
          </button>

          {isSaved && (
            <div className="save-message">
              <p>設定が保存されました！</p>
            </div>
          )}
        </div>
    </div>
  )
}

// 認証済みユーザーのメインコンテンツ
function AuthenticatedApp({ user, onLogout }) {
  return (
    <div className="app">
      <nav className="navigation">
        <div className="nav-container">
          <img src="/voicelog_header.png" alt="VoiceLog" className="nav-title-image" />
          <button className="logout-btn" onClick={onLogout}>ログアウト</button>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<TopScreen user={user} />} />
          <Route path="/:domainId" element={<TopScreen user={user} />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/:domainId/settings" element={<SettingsScreen />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <p className="footer-text">© {new Date().getFullYear()} VoiceLog</p>
        </div>
      </footer>
    </div>
  )
}

// メインAppコンポーネント
function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 認証状態の変更を監視
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(false)
      
      if (currentUser) {
        console.log('ログイン中のユーザー:', currentUser)
        
        // ドメインIDが存在する場合、許可ユーザーかチェック
        const domainId = extractDomainIdFromPath(window.location.pathname)
        if (domainId) {
          const checkResult = await checkUserAllowed(domainId, currentUser.email)
          
          if (!checkResult.allowed) {
            // 許可されていない場合はログアウト
            console.log('許可されていないユーザーです')
            await signOut(auth)
            alert(checkResult.error || 'このドメインへのアクセス権限がありません')
            return
          }
          
          console.log('ユーザー許可確認成功')
        }
        
        setUser(currentUser)
      } else {
        console.log('ログインしていません')
        setUser(null)
      }
    })

    // クリーンアップ関数
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？')) {
      try {
        await signOut(auth)
        console.log('ログアウトしました')
      } catch (error) {
        console.error('ログアウトエラー:', error)
        alert('ログアウトに失敗しました')
      }
    }
  }

  // ローディング中
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        読み込み中...
      </div>
    )
  }

  // サブパス対応: URLから動的にbasenameを検出
  // 例: /test/ または /test2/ から basename を取得
  const basename = (() => {
    if (import.meta.env.DEV) return '';
    const path = window.location.pathname;
    // /test/ または /test2/ のようなパターンを検出
    const match = path.match(/^\/([^\/]+)/);
    return match ? `/${match[1]}` : '';
  })();

  return (
    <Router basename={basename}>
      {!user ? (
        <LoginScreen />
      ) : (
        <AuthenticatedApp user={user} onLogout={handleLogout} />
      )}
    </Router>
  )
}

export default App
