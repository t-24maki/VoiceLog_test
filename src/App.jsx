import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'

// トップ画面コンポーネント
function TopScreen() {
  const [input1, setInput1] = useState('')
  const [input2, setInput2] = useState('')
  const [input3, setInput3] = useState('')
  const [message, setMessage] = useState('')
  const [showMessage, setShowMessage] = useState(false)
  const [fixedText, setFixedText] = useState('')

  useEffect(() => {
    // ローカルストレージから固定テキストを読み込み
    const savedText = localStorage.getItem('fixedText')
    if (savedText) {
      setFixedText(savedText)
    } else {
      setFixedText('デフォルトの固定テキスト')
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setMessage('メッセージ受信しました')
    setShowMessage(true)
    
    // メッセージを永続的に表示（自動非表示なし）
  }

  return (
    <div className="screen">
      <div className="top-container">
        {/* 左側：入力フォームと固定テキスト */}
        <div className="left-area">
          <div className="input-section">
            <h3 className="form-title">入力フォーム</h3>
            <form onSubmit={handleSubmit} className="input-form">
              <div className="input-group">
                <label htmlFor="input1">入力欄 1</label>
                <input
                  type="text"
                  id="input1"
                  value={input1}
                  onChange={(e) => setInput1(e.target.value)}
                  placeholder="1つ目の入力内容を入力してください"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="input2">入力欄 2</label>
                <input
                  type="text"
                  id="input2"
                  value={input2}
                  onChange={(e) => setInput2(e.target.value)}
                  placeholder="2つ目の入力内容を入力してください"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="input3">入力欄 3</label>
                <input
                  type="text"
                  id="input3"
                  value={input3}
                  onChange={(e) => setInput3(e.target.value)}
                  placeholder="3つ目の入力内容を入力してください"
                  required
                />
              </div>

              <button type="submit" className="submit-btn">
                送信
              </button>
            </form>
          </div>

          <div className="fixed-text-section">
            <h3 className="section-title">固定テキスト</h3>
            <div className="fixed-text-display">
              <p>{fixedText}</p>
            </div>
          </div>
        </div>

        {/* 右側：受信メッセージエリア */}
        <div className="right-area">
          <h1 className="title">VoiceLog</h1>
          
          {showMessage ? (
            <div className="message-display">
              <h2>{message}</h2>
              <div className="input-summary">
                <p><strong>入力欄 1:</strong> {input1}</p>
                <p><strong>入力欄 2:</strong> {input2}</p>
                <p><strong>入力欄 3:</strong> {input3}</p>
              </div>
            </div>
          ) : (
            <div className="welcome-message">
              <h2>メッセージ受信待機中</h2>
              <p>左側のフォームに入力して送信ボタンを押してください</p>
            </div>
          )}
        </div>
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
            <h2 className="nav-title">VoiceLog</h2>
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
