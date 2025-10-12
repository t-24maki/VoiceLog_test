# Firebase Firestore 実装ガイド

## 実装内容

VoiceLogアプリケーションにFirebase Firestoreを統合し、ユーザーの送信内容と受信内容を保存する機能を実装しました。

## 保存されるデータ

`voicelogs`コレクションに以下のフィールドが保存されます：

| フィールド名 | 型 | 説明 | 現在の値 |
|------------|------|------|---------|
| domain | string/null | ドメイン名 | null |
| user | string/null | ユーザー名 | null |
| datetime | timestamp | データ登録日時 | サーバータイムスタンプ |
| division | string | 部署名 | フォームの選択値（例: "プロップ"） |
| weather_score | string | 心のお天気 | "1"〜"5" |
| weather_reason | string | お天気の理由 | ユーザー入力テキスト |
| dify_feeling | string | 今日の気分 | Difyからの応答 |
| dify_checkpoint | string | チェックポイント | Difyからの応答 |
| dify_nextstep | string | 次へのステップ | Difyからの応答 |

## 実装したファイル

### 1. `/src/config/firebase.js`
Firebase SDKの初期化とFirestoreインスタンスの設定

### 2. `/src/services/voiceLogService.js`
Firestoreへのデータ保存を行うヘルパー関数
- `saveVoiceLog(data)` - VoiceLogデータをFirestoreに保存

### 3. `/src/App.jsx`（更新）
- `saveVoiceLog`サービスのインポート
- フォーム送信後、Dify応答受信時にFirestoreへ自動保存
- 保存結果をコンソールに出力

### 4. `/firestore.rules`（更新）
- `voicelogs`コレクションへの読み取り・作成権限を追加
- 開発用に認証なしでのアクセスを許可（本番では要変更）

## セットアップ手順

### 1. Firebase SDKのインストール
```bash
npm install firebase
```

### 2. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下を追加：

```env
# Firebase設定（Viteフロントエンド用）
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=voicelog-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=voicelog-dev
VITE_FIREBASE_STORAGE_BUCKET=voicelog-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### 3. Firebase設定値の取得方法

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト「voicelog-dev」を選択
3. 左側メニューから「プロジェクトの設定」（歯車アイコン）をクリック
4. 「全般」タブで下にスクロール
5. 「マイアプリ」セクションで、Webアプリを追加（まだない場合）
6. 「Firebase SDK snippet」から「構成」を選択
7. 表示される`firebaseConfig`オブジェクトの値を`.env`ファイルにコピー

### 4. Firestoreルールのデプロイ（完了済み）

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## 動作確認方法

1. アプリケーションを起動
   ```bash
   npm run dev
   ```

2. フォームに入力して送信

3. ブラウザのコンソールで以下のメッセージを確認：
   - 成功時: `Firestoreへの保存に成功しました。ID: [ドキュメントID]`
   - 失敗時: `Firestoreへの保存に失敗しました: [エラーメッセージ]`

4. Firebase Consoleでデータを確認：
   - [Firebase Console](https://console.firebase.google.com/project/voicelog-dev/firestore)
   - 「Firestore Database」を開く
   - `voicelogs`コレクションを確認

## トラブルシューティング

### エラー: "Missing or insufficient permissions"
- Firestoreのセキュリティルールがデプロイされているか確認
- Firebase Consoleで`firestore.rules`の内容を確認

### エラー: "Firebase: Error (auth/...)"
- `.env`ファイルのFirebase設定値が正しいか確認
- プロジェクトIDが`voicelog-dev`になっているか確認

### データが保存されない
- ブラウザのコンソールでエラーメッセージを確認
- ネットワークタブでFirebaseへのリクエストを確認
- Firebase Consoleの使用量ダッシュボードを確認

## セキュリティに関する注意事項

⚠️ **重要**: 現在のFirestoreルールは開発用です。

```javascript
match /voicelogs/{docId} {
  allow read, create: if true;  // ← 誰でもアクセス可能
}
```

本番環境では、以下のような適切な認証・認可を実装してください：

```javascript
match /voicelogs/{docId} {
  // 認証済みユーザーのみアクセス可能
  allow read, create: if request.auth != null;
  // 自分のデータのみアクセス可能（user フィールドが自分のUID）
  allow read, create: if request.auth != null 
    && request.resource.data.user == request.auth.uid;
}
```

## 今後の拡張案

1. **ユーザー認証の実装**
   - Firebase Authenticationを使用
   - `user`フィールドに認証済みユーザーのUIDを保存

2. **ドメイン管理機能**
   - 組織/会社ごとにデータを分離
   - `domain`フィールドに組織IDを保存

3. **データ閲覧機能**
   - 過去の記録を閲覧する画面
   - カレンダーから日付を選択して詳細表示

4. **統計・分析機能**
   - 期間ごとのweather_scoreの推移グラフ
   - 部署ごとの集計

5. **データエクスポート機能**
   - CSV/Excel形式でのデータダウンロード

