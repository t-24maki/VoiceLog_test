# VoiceLog

React + Viteを使用した音声ログアプリケーションです。Dify APIと連携してAIによる分析機能を提供します。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下の内容を設定してください：

```env
# Firebase設定
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=voicelog-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=voicelog-dev
VITE_FIREBASE_STORAGE_BUCKET=voicelog-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

Firebase設定は[Firebase Console](https://console.firebase.google.com/)のプロジェクト設定から取得できます。

### 3. アプリケーションの起動

開発モード：

```bash
npm run dev
```

本番ビルド：

```bash
npm run build
npm run preview
```

## デプロイ

### Firebase Hostingへのデプロイ

1. **ビルド**
   ```bash
   npm run build
   ```

2. **Firestoreルールとインデックスのデプロイ**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

3. **Firebase Hostingにデプロイ**
   ```bash
   firebase deploy --only hosting
   ```

4. **Firebase Functionsをデプロイ（Dify API連携用）**
   ```bash
   firebase deploy --only functions
   ```

### Firebase FunctionsのSecret設定

Dify APIを使用する場合、Firebase Functionsで必要なSecretを設定してください：

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

## 主な機能

- **Google認証**: ログイン機能
- **ドメインごとのアクセス制御**: URLパスごとに許可ユーザーを管理
- **部署一覧の管理**: ドメインごとに表示する部署を設定可能
- **音声ログ記録**: 部署、心のお天気（1-5）、理由を入力して記録
- **AI分析**: Dify APIによる「今日の気分」「チェックポイント」「次へのステップ」の生成
- **4コマ漫画生成**: 入力内容を基にDALL-E-3で4コマ漫画を生成（1日1回まで）
- **カレンダー表示**: 過去の記録をカレンダー形式で表示

## データ構造

### Firestoreコレクション

#### voicelogs
音声ログデータを保存

| フィールド名 | 型 | 説明 |
|------------|------|------|
| domain | string/null | ドメイン名 |
| user | string/null | ユーザー名 |
| user_email | string/null | ユーザーのメールアドレス |
| user_uid | string/null | Firebase認証のUID |
| datetime | timestamp | 登録日時 |
| division | string | 部署名 |
| weather_score | string | 心のお天気（"1"〜"5"） |
| weather_reason | string | お天気の理由 |
| dify_feeling | string | 今日の気分（Difyの応答） |
| dify_checkpoint | string | チェックポイント（Difyの応答） |
| dify_nextstep | string | 次へのステップ（Difyの応答） |

#### domains
URLパスごとの許可ユーザーを管理

```json
{
  "allowed_users": [
    {
      "email": "user@example.com",
      "name": "ユーザー名"
    }
  ]
}
```

#### domainDepartments
ドメインごとの部署一覧を管理

```json
{
  "departments": ["部署名1", "部署名2", "部署名3"]
}
```

#### manga_generations
ユーザーごとの漫画生成日時を記録（ユーザーUIDをドキュメントIDとして使用）

## 技術スタック

- **フロントエンド**: React + Vite
- **バックエンド**: Firebase Functions
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication (Google)
- **AI**: Dify API、OpenAI API (DALL-E-3)

## ユーザー管理

### ユーザーの一括登録

CSVファイルからユーザーを一括登録できます：

```bash
# サービスアカウントキーを取得してプロジェクトルートに配置（serviceAccountKey.json）
python scripts/add-users.py add-csv <ドメインID> users.csv

# 許可ユーザーリストを表示
python scripts/add-users.py list <ドメインID>
```

CSV形式：

```csv
email,name
user1@example.com,User 1
user2@example.com,User 2
```

## トラブルシューティング

- **ログインできない**: Firebase設定（`.env`ファイル）が正しいか確認
- **Firestoreへの保存エラー**: Firestoreのセキュリティルールを確認
- **部署一覧が表示されない**: `domainDepartments`コレクションにデータが設定されているか確認
- **漫画生成エラー**: Firebase FunctionsのSecretが正しく設定されているか確認
