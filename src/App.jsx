import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import jaLocale from '@fullcalendar/core/locales/ja'
import { DifyClient } from './config/dify'
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
function TopScreen() {
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

  useEffect(() => {
    // ローカルストレージから固定テキストを読み込み
    const savedText = localStorage.getItem('fixedText')
    if (savedText) {
      setFixedText(savedText)
    } else {
      setFixedText('デフォルトの固定テキスト')
    }

    // ローカルストレージからカレンダーイベントを読み込み
    const savedEvents = localStorage.getItem('calendarEvents')
    if (savedEvents) {
      setCalendarEvents(JSON.parse(savedEvents))
    }
  }, [])


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
        setDifyResponse(result.message)
        setParsedResponse(parseDifyResponse(result.message))
        setShowMessage(true)
        
        // カレンダーに結果を保存
        const today = new Date()
        const dateString = today.toISOString().split('T')[0]
        const symbol = convertNumberToSymbol(input2)
        
        const newEvent = {
          id: dateString,
          title: symbol,
          date: dateString,
          weatherNumber: input2, // 画像番号を保存
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: '#000000'
        }
        
        // 既存のイベントを更新または新規追加
        const updatedEvents = calendarEvents.filter(event => event.id !== dateString)
        updatedEvents.push(newEvent)
        
        setCalendarEvents(updatedEvents)
        localStorage.setItem('calendarEvents', JSON.stringify(updatedEvents))
        
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
            <div className="greeting-message">お仕事お疲れ様でした！</div>
            <div className="weather-image-container">
              <img src="/weather-placeholder.png" alt="お天気プレースホルダー" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </div>
            <div className="input-count">2025.0000現在_◯◯さん入力0回</div>
            
            <form onSubmit={handleSubmit} className="input-form">
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
                <div className="reason-textarea-bg"></div>
                <textarea
                  id="input3"
                  value={input3}
                  onChange={(e) => setInput3(e.target.value)}
                  placeholder="今日あったこと、できたこと、困ったこと、相談したいこと、嬉しかったこと、腹が立ったこと、なんでもいいので教えて！今日あったこと、できたこと、困ったこと、相談したいこと、嬉しかったこと、腹が立ったこと、なんでもいいので教えて！"
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
function LoginScreen({ onLogin }) {
  const handleGoogleLogin = () => {
    // ログイン機能は後で実装するため、現在はメイン画面に遷移
    onLogin()
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
                <button className="google-login-btn" onClick={handleGoogleLogin}>
                  Googleアカウントでログイン
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

// メインAppコンポーネント
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = () => {
    setIsLoggedIn(true)
  }

  // ログインしていない場合はログイン画面を表示
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <Router>
      <div className="app">
        <nav className="navigation">
          <div className="nav-container">
            <img src="/voicelog_header.png" alt="VoiceLog" className="nav-title-image" />
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<TopScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="footer-container">
            <p className="footer-text">© {new Date().getFullYear()} VoiceLog</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
