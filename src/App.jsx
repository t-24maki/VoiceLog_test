import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import jaLocale from '@fullcalendar/core/locales/ja'
import { DifyClient } from './config/dify'
import { saveVoiceLog, getUserInputCount, getUserVoiceLogs } from './services/voiceLogService'
import { checkUserAllowed, extractDomainIdFromPath, getDomainDepartments } from './services/userService'
import { auth, googleProvider } from './config/firebase'
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import './App.css'


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

// トップ画面コンポーネント
function TopScreen({ user }) {
  const [input1, setInput1] = useState('プロップ') // デフォルト値を設定
  const [input2, setInput2] = useState('1')
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
  const [inputCount, setInputCount] = useState(0)
  const [isReasonFocused, setIsReasonFocused] = useState(false)
  const [departments, setDepartments] = useState(['プロップ', 'etc']) // 部署一覧のstate

  const difyClient = new DifyClient()

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
      
      // 日付ごとにグループ化し、各日付の最初の記録のみを取得
      const eventsByDate = {}
      voiceLogs.forEach((log) => {
        if (log.datetime && log.weather_score) {
          const dateString = log.datetime.toISOString().split('T')[0]
          
          // その日付の記録がまだない、または既存の記録より古い場合に更新
          if (!eventsByDate[dateString] || log.datetime < eventsByDate[dateString].datetime) {
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

  useEffect(() => {
    // ローカルストレージから固定テキストを読み込み
    const savedText = localStorage.getItem('fixedText')
    if (savedText) {
      setFixedText(savedText)
    } else {
      setFixedText('デフォルトの固定テキスト')
    }

    // ユーザーの入力回数を取得
    const fetchInputCount = async () => {
      if (user && user.uid) {
        const count = await getUserInputCount(user.uid)
        setInputCount(count)
      }
    }
    fetchInputCount()
    
    // Firestoreからカレンダーイベントを読み込み
    loadCalendarEvents()

    // ドメインに基づいて部署一覧を取得
    const fetchDepartments = async () => {
      const domainId = extractDomainIdFromPath(window.location.pathname)
      const departmentList = await getDomainDepartments(domainId)
      setDepartments(departmentList)
      
      // 現在の選択値が新しい一覧に含まれていない場合、最初の部署を選択
      if (departmentList.length > 0 && !departmentList.includes(input1)) {
        setInput1(departmentList[0])
      }
    }
    fetchDepartments()
  }, [user, loadCalendarEvents])


  // フェードアウト完了後にstateをリセット
  useEffect(() => {
    if (isFadingOut) {
      const timer = setTimeout(() => {
        setIsFadingOut(false)
      }, 450) // フェードアウトアニメーション完了後にリセット
      
      return () => clearTimeout(timer)
    }
  }, [isFadingOut])

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

      console.log('送信データ:', { input1, input2, input3 }) // デバッグ用
      
      // Dify APIにメッセージを送信
      const result = await difyClient.sendMessage(input1, input2, input3)
      
      if (result.success) {
        setMessage('Difyからの回答を受信しました')
        setDifyResponse(result.text)  // result.textを使用（実際のDify APIレスポンス）
        const parsed = parseDifyResponse(result.text)  // result.textを使用
        setParsedResponse(parsed)
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
            // 保存成功後、入力回数を更新
            if (user && user.uid) {
              getUserInputCount(user.uid).then(count => {
                setInputCount(count)
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
            <p className="loading-text">分析中...</p>
          </div>
        </div>
      )}
        {/* 入力フォーム */}
        <div className="left-area">
          <div className="input-section">
            <div className="greeting-message">{user ? (user.displayName || user.email.split('@')[0]) : '◯◯'}さん、お仕事お疲れ様でした！</div>
            <div className="weather-image-container">
              <img src="/weather-placeholder.png" alt="お天気プレースホルダー" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </div>
            <div className="input-count">
              {inputCount}回目の入力ありがとうございます
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
                <div className="reason-label">お天気の理由を教えて！</div>
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
                <button type="submit" className="submit-btn" disabled={isLoading}>
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
          {showMessage && <CalendarWidget events={calendarEvents} />}
          
          {showMessage ? (
            <div className="message-display">
              {errorMessage && (
                <div className="error-message">
                  <p><strong>エラー:</strong> {errorMessage}</p>
                </div>
              )}
              
              {parsedResponse.feeling && (
                <div className="simple-message-section">
                  <div className="simple-message-label">今日の気分</div>
                  <div className="simple-message-content">
                    {parsedResponse.feeling}
                  </div>
                </div>
              )}
              
              {parsedResponse.genzyo && (
                <div className="simple-message-section">
                  <div className="simple-message-label">チェックポイント</div>
                  <div className="simple-message-content">
                    {parsedResponse.genzyo}
                  </div>
                </div>
              )}
              
              {parsedResponse.kadai && (
                <div className="simple-message-section">
                  <div className="simple-message-label">次へのステップ</div>
                  <div className="simple-message-content">
                    {parsedResponse.kadai}
                  </div>
                </div>
              )}
              
              {/* デバッグ用：解析結果が空の場合の表示 */}
              {!parsedResponse.feeling && !parsedResponse.genzyo && !parsedResponse.kadai && difyResponse && (
                <div className="debug-info">
                  <h3>デバッグ情報</h3>
                  <p><strong>受信したレスポンス:</strong></p>
                  <pre style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px'}}>
                    {difyResponse}
                  </pre>
                  <p><strong>解析結果:</strong></p>
                  <pre style={{background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px'}}>
                    {JSON.stringify(parsedResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
    </div>
  )
}

// カレンダーコンポーネント
function CalendarWidget({ events = [] }) {
  return (
    <div className="calendar-widget compact">
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin]}
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
