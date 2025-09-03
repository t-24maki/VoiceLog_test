import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import jaLocale from '@fullcalendar/core/locales/ja'
import { DifyClient } from './config/dify'
import './App.css'

// トップ画面コンポーネント
function TopScreen() {
  const [input1, setInput1] = useState('')
  const [input2, setInput2] = useState('1')
  const [input3, setInput3] = useState('')
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const [fixedText, setFixedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [difyResponse, setDifyResponse] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const difyClient = new DifyClient()

  useEffect(() => {
    // ローカルストレージから固定テキストを読み込み
    const savedText = localStorage.getItem('fixedText')
    if (savedText) {
      setFixedText(savedText)
    } else {
      setFixedText('デフォルトの固定テキスト')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    setDifyResponse('')
    
    try {
      // Dify APIにメッセージを送信
      const result = await difyClient.sendMessage(input1, input2, input3)
      
      if (result.success) {
        setMessage('Difyからの回答を受信しました')
        setDifyResponse(result.message)
        setShowMessage(true)
      } else {
        setErrorMessage(result.message)
        setMessage('エラーが発生しました')
        setShowMessage(true)
      }
    } catch (error) {
      setErrorMessage('予期しないエラーが発生しました')
      setMessage('エラーが発生しました')
      setShowMessage(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className="top-container">
        {/* 左側：入力フォーム、固定テキスト、カレンダー */}
        <div className="left-area">
          <div className="input-section">
            <h3 className="form-title">入力フォーム</h3>
            <form onSubmit={handleSubmit} className="input-form">
              <div className="input-group">
                <label htmlFor="input1">部署選択</label>
                <select
                  id="input1"
                  value={input1}
                  onChange={(e) => setInput1(e.target.value)}
                  required
                >
                  <option value="">部署を選択してください</option>
                  <option value="部署A">部署A</option>
                  <option value="部署B">部署B</option>
                  <option value="部署C">部署C</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="input2">数値選択</label>
                <select
                  id="input2"
                  value={input2}
                  onChange={(e) => setInput2(e.target.value)}
                  required
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="input3">自由入力欄</label>
                <textarea
                  id="input3"
                  value={input3}
                  onChange={(e) => setInput3(e.target.value)}
                  placeholder="自由に入力してください（改行可能）"
                  rows="4"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? '送信中...' : '送信'}
              </button>
            </form>
          </div>

          <div className="fixed-text-section">
            <h3 className="section-title">固定テキスト</h3>
            <div className="fixed-text-display">
              <p>{fixedText}</p>
            </div>
          </div>

          {/* カレンダーウィジェット */}
          <CalendarWidget />
        </div>

        {/* 右側：受信メッセージエリア */}
        <div className="right-area">
          
          {showMessage ? (
            <div className="message-display">
              <h2>{message}</h2>
              
              {errorMessage && (
                <div className="error-message">
                  <p><strong>エラー:</strong> {errorMessage}</p>
                </div>
              )}
              
              {difyResponse && (
                <div className="dify-response">
                  <h3>Difyからの回答:</h3>
                  <div className="response-content">
                    {difyResponse.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="welcome-message">
              <h2>メッセージ受信待機中</h2>
              <p>左側のフォームに入力して送信ボタンを押してください</p>
              <p>入力内容はDifyに送信され、AIからの回答が表示されます</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// カレンダーコンポーネント
function CalendarWidget() {
  return (
    <div className="calendar-widget">
      <h3 className="calendar-title">カレンダー</h3>
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          height="auto"
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: 'today'
          }}
          locales={[jaLocale]}
          locale="ja"
          buttonText={{
            today: '今日',
            prev: '前月',
            next: '翌月'
          }}
          dayCellContent={(arg) => arg.dayNumberText}
        />
      </div>
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
    <div className="screen">
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
    </div>
  )
}

// メインAppコンポーネント
function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navigation">
          <div className="nav-container">
            <h2 className="nav-title">画面サンプル</h2>
            <div className="nav-links">
              <Link to="/" className="nav-link">トップ</Link>
              <Link to="/settings" className="nav-link">設定</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<TopScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
