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
```

#### Dify API設定の取得方法

1. [Dify](https://dify.ai)にログイン
2. ワークスペースを作成または選択
3. API設定から以下を取得：
   - API Key
   - Workspace ID

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
- **AI**: Dify API
- **開発ツール**: ESLint, nodemon

## トラブルシューティング

### サーバーエラーが発生する場合
- `.env`ファイルが正しく設定されているか確認
- Dify APIキーとワークスペースIDが正しいか確認
- サーバーがポート3001で起動しているか確認

### 接続エラーが発生する場合
- フロントエンドとバックエンドが両方起動しているか確認
- ファイアウォールの設定を確認
