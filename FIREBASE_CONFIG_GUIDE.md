# Firebase設定の正しい取得方法

## 1. Firebase Consoleにアクセス

https://console.firebase.google.com/project/voicelog-dev/settings/general

## 2. Webアプリの追加（初回のみ）

「マイアプリ」セクションで：
- まだWebアプリがない場合は「アプリを追加」をクリック
- プラットフォームで「Web」を選択
- ニックネーム（例: VoiceLog Web）を入力
- 「Firebase Hostingも設定する」はチェック不要
- 「アプリを登録」をクリック

## 3. 設定値の取得

「Firebase SDK snippet」から「構成」を選択すると、以下のような設定が表示されます：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // ← これをコピー
  authDomain: "voicelog-dev.firebaseapp.com",
  projectId: "voicelog-dev",
  storageBucket: "voicelog-dev.appspot.com",
  messagingSenderId: "123456789",  // ← これをコピー
  appId: "1:123456789:web:..."  // ← これをコピー
};
```

## 4. .envファイルに追加

プロジェクトルートの`.env`ファイルに以下を**追加**してください：

```env
# Firebase設定（Viteフロントエンド用）
VITE_FIREBASE_API_KEY=AIzaSy...（取得した値）
VITE_FIREBASE_AUTH_DOMAIN=voicelog-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=voicelog-dev
VITE_FIREBASE_STORAGE_BUCKET=voicelog-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789（取得した値）
VITE_FIREBASE_APP_ID=1:123456789:web:...（取得した値）
```

⚠️ **注意**: 
- 既存のDify設定は削除しないでください
- Viteでは環境変数に`VITE_`プレフィックスが必要です
- apiKey、messagingSenderId、appIdは必ず正しい値を設定してください

## 5. 開発サーバーの再起動

環境変数の変更を反映するため、開発サーバーを再起動してください：

```bash
# 開発サーバーを停止（Ctrl+C）
# 再度起動
npm run dev
```

## 6. 動作確認

1. ブラウザの開発者ツール（F12）のConsoleタブを開く
2. フォームに入力して送信
3. 以下のメッセージが表示されることを確認：
   ```
   Firestoreへの保存に成功しました。ID: xxxxx
   ```
4. エラーがないことを確認

## トラブルシューティング

### "Firebase: Error (auth/invalid-api-key)" が表示される
→ `VITE_FIREBASE_API_KEY`の値が間違っています。Firebase Consoleで再確認してください。

### "Missing or insufficient permissions" が表示される  
→ Firestoreのセキュリティルールが正しくデプロイされていません。
```bash
firebase deploy --only firestore:rules
```

### 環境変数が反映されない
→ 開発サーバーを再起動してください。環境変数の変更は再起動が必要です。

