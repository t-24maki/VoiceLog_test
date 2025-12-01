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
# Dify API Key（顧客ごとに異なるキーを設定する想定）
firebase functions:secrets:set DIFY_API_KEY

# OpenAI API Key（4コマ漫画生成用）
firebase functions:secrets:set OPENAI_API_KEY
```

**注意**: Dify APIキーは顧客ごとに異なるキーを使用する想定です。顧客環境ごとに適切なキーを設定してください。

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

## 新たな顧客環境の作成方法

新しい顧客環境（例: `voicelog.jp/newcustomer`）を作成するには、以下の手順を実行してください：

### 1. customer-paths.jsonにパスを追加

`customer-paths.json`ファイルに新しい顧客パスを追加します：

```json
{
  "paths": ["test", "test2", "newcustomer"]
}
```

### 2. firebase.jsonにルーティング設定を追加

`firebase.json`の`hosting`セクションに、新しい顧客環境用のrewritesとheadersを追加します：

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/newcustomer/api/**",
        "function": {
          "functionId": "apiDify",
          "region": "asia-northeast1"
        }
      },
      {
        "source": "/newcustomer/**",
        "destination": "/newcustomer/index.html"
      }
    ],
    "headers": [
      {
        "source": "/newcustomer/**",
        "headers": [
          {
            "key": "Cross-Origin-Opener-Policy",
            "value": "same-origin-allow-popups"
          }
        ]
      },
      {
        "source": "/newcustomer/api/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET, POST, PUT, DELETE, OPTIONS"
          },
          {
            "key": "Access-Control-Allow-Headers",
            "value": "Content-Type, Authorization"
          }
        ]
      }
    ]
  }
}
```

### 3. Firestoreにドメイン情報を設定

Firebase Consoleで以下のコレクションにドキュメントを作成します：

- **domainsコレクション**: ドキュメントIDを`newcustomer`として作成し、許可ユーザーを設定
- **domainDepartmentsコレクション**: ドキュメントIDを`newcustomer`として作成し、部署一覧を設定

詳細は以下の「顧客ごとの許可ユーザー一覧の管理方法」「顧客ごとの部署一覧の管理方法」を参照してください。

### 4. Dify APIキーの設定（顧客ごとに異なるキーを使用）

顧客ごとに異なるDify APIキーを使用する場合、Firebase FunctionsのSecretを顧客ごとに管理する必要があります。

現在の実装では、単一の`DIFY_API_KEY` Secretを使用していますが、顧客ごとに異なるキーを使用する場合は、以下のいずれかの方法を検討してください：

- **方法1**: リクエストパスから顧客IDを取得し、Firestoreに保存された顧客ごとのAPIキーを参照する
- **方法2**: 顧客ごとに異なるSecret名を使用（例: `DIFY_API_KEY_NEWCUSTOMER`）し、Functions内で顧客IDに応じて適切なSecretを選択する

### 5. ビルドとデプロイ

```bash
# ビルド（copy-index.jsが自動的に各顧客環境用のファイルを生成）
npm run build

# Firebase Hostingにデプロイ
firebase deploy --only hosting

# Firebase Functionsにデプロイ
firebase deploy --only functions
```

ビルド時に`scripts/copy-index.js`が自動実行され、`dist/newcustomer/`ディレクトリに顧客環境用のファイルが生成されます。

## 顧客ごとの許可ユーザー一覧の管理方法

各顧客環境（ドメイン）ごとに、アクセスを許可するユーザーを管理できます。

### Firestoreでの管理

Firebase Consoleで`domains`コレクションを開き、ドキュメントIDを顧客ID（例: `test`, `newcustomer`）として設定します。

ドキュメントの構造：

```json
{
  "allowed_users": [
    {
      "email": "user1@example.com",
      "name": "ユーザー1"
    },
    {
      "email": "user2@example.com",
      "name": "ユーザー2"
    }
  ]
}
```

### CSVファイルから一括登録

大量のユーザーを一括登録する場合は、スクリプトを使用できます：

```bash
# サービスアカウントキーを取得してプロジェクトルートに配置（serviceAccountKey.json）
python scripts/add-users.py add-csv <顧客ID> users.csv

# 許可ユーザーリストを表示
python scripts/add-users.py list <顧客ID>
```

CSV形式：

```csv
email,name
user1@example.com,User 1
user2@example.com,User 2
```

詳細は`scripts/README.md`を参照してください。

### 注意事項

- 既に登録済みのメールアドレスは自動的にスキップされます
- メールアドレスは大文字小文字を区別せずに比較されます
- サービスアカウントキーは秘密情報です。Gitにコミットしないよう注意してください

## 顧客ごとの部署一覧の管理方法

各顧客環境（ドメイン）ごとに、表示する部署一覧を管理できます。

### Firestoreでの管理

Firebase Consoleで`domainDepartments`コレクションを開き、ドキュメントIDを顧客ID（例: `test`, `newcustomer`）として設定します。

ドキュメントの構造：

```json
{
  "departments": ["部署名1", "部署名2", "部署名3"]
}
```

### 設定手順

1. Firebase Consoleにログイン
2. Firestore Databaseを開く
3. `domainDepartments`コレクションを選択
4. 顧客IDをドキュメントIDとして新しいドキュメントを作成（または既存のドキュメントを編集）
5. `departments`フィールドを追加し、配列型で部署名を入力

### 注意事項

- 部署名は配列形式で保存する必要があります
- 部署一覧が空の場合、デフォルト値（`['プロップ', 'etc']`）が使用されます
- 部署名は音声ログ記録時に選択肢として表示されます

## トラブルシューティング

- **ログインできない**: Firebase設定（`.env`ファイル）が正しいか確認
- **Firestoreへの保存エラー**: Firestoreのセキュリティルールを確認
- **部署一覧が表示されない**: `domainDepartments`コレクションにデータが設定されているか確認
- **漫画生成エラー**: Firebase FunctionsのSecretが正しく設定されているか確認
