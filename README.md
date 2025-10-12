# VoiceLog_test

React + Viteを使用した音声ログアプリケーションです。Dify APIと連携してAIによる分析機能を提供します。

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下の内容を設定してください：

```env
# Dify API設定
DIFY_API_KEY=your_dify_api_key_here
DIFY_API_ENDPOINT=https://api.dify.ai/v1/chat-messages
DIFY_WORKSPACE_ID=your_workspace_id_here

# フロントエンドURL
FRONTEND_URL=http://localhost:5173

# サーバーポート
PORT=3001

# Firebase設定（Viteフロントエンド用）
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=voicelog-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=voicelog-dev
VITE_FIREBASE_STORAGE_BUCKET=voicelog-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

#### Dify API設定の取得方法

1. [Dify](https://dify.ai)にログイン
2. ワークスペースを作成または選択
3. API設定から以下を取得：
   - API Key
   - Workspace ID

#### Firebase設定の取得方法

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト（voicelog-dev）を選択
3. プロジェクト設定（歯車アイコン）→「全般」タブをクリック
4. 「マイアプリ」セクションでWebアプリを追加（未追加の場合）
5. 「Firebase SDK snippet」から「構成」を選択
6. 表示される設定値を`.env`ファイルに設定

### 3. アプリケーションの起動

#### 開発モード（推奨）
2つのターミナルで以下のコマンドを実行：

**ターミナル1（フロントエンド）:**
```bash
npm run dev
```

**ターミナル2（バックエンド）:**
```bash
npm run server
```

#### 本番ビルド
```bash
npm run build
npm run preview
```

## 使用方法

1. フロントエンド（http://localhost:5173）にアクセス
2. 部署、評価、詳細情報を入力
3. 送信ボタンをクリック
4. Dify APIからの分析結果を確認

## 技術スタック

- **フロントエンド**: React + Vite
- **バックエンド**: Express.js
- **データベース**: Firebase Firestore
- **AI**: Dify API
- **開発ツール**: ESLint, nodemon

## データ構造

Firestoreの`voicelogs`コレクションには以下のフィールドが保存されます：

| フィールド名 | 型 | 説明 |
|------------|------|------|
| domain | string/null | ドメイン名（現状はnull） |
| user | string/null | ユーザー名（現状はnull） |
| datetime | timestamp | データ登録日時（サーバータイムスタンプ） |
| division | string | 部署名（例: "プロップ"） |
| weather_score | string | 心のお天気スコア（"1"〜"5"） |
| weather_reason | string | お天気の理由（ユーザーが入力したテキスト） |
| dify_feeling | string | 今日の気分（Difyからの応答） |
| dify_checkpoint | string | チェックポイント（Difyからの応答） |
| dify_nextstep | string | 次へのステップ（Difyからの応答） |

## トラブルシューティング

### サーバーエラーが発生する場合
- `.env`ファイルが正しく設定されているか確認
- Dify APIキーとワークスペースIDが正しいか確認
- サーバーがポート3001で起動しているか確認

### 接続エラーが発生する場合
- フロントエンドとバックエンドが両方起動しているか確認
- ファイアウォールの設定を確認

### Firestoreへの保存エラーが発生する場合
- Firebase設定（`.env`ファイル）が正しいか確認
- Firebaseプロジェクトが有効化されているか確認
- Firestoreのセキュリティルール（`firestore.rules`）が適切に設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認
