# VoiceLog

React + Viteを使用した音声ログアプリケーションです。Dify APIと連携してAIによる分析機能を提供します。

## ツールの改修手順

### 1. 開発環境のセットアップ

#### 依存関係のインストール

```bash
npm install
```

#### 環境変数の設定

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

Firebase設定の詳細な取得方法は`FIREBASE_CONFIG_GUIDE.md`を参照してください。

### 2. 開発モードでの起動

```bash
npm run dev
```

開発サーバーが起動し、`http://localhost:5173`でアプリケーションにアクセスできます。

### 3. ビルドとデプロイ

#### ビルド

```bash
npm run build
```

このコマンドは以下を実行します：
- Viteによるビルド
- `scripts/copy-index.js`による各顧客環境用のファイル生成

#### Firebase Hostingへのデプロイ

1. **Firestoreルールとインデックスのデプロイ**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

2. **Firebase Hostingにデプロイ**
   ```bash
   firebase deploy --only hosting
   ```

3. **Firebase Functionsをデプロイ（Dify API連携用）**
   ```bash
   firebase deploy --only functions
   ```

### 4. Firebase FunctionsのSecret設定

Dify APIやOpenAI APIを使用する場合、Firebase Functionsで必要なSecretを設定してください：

```bash
# Dify API Key（顧客ごとに異なるキーを設定する想定）
firebase functions:secrets:set DIFY_API_KEY

# OpenAI API Key（4コマ漫画生成用）
firebase functions:secrets:set OPENAI_API_KEY

# Gemini API Key（Gemini使用時）
firebase functions:secrets:set GEMINI_API_KEY
```

**注意**: Dify APIキーは顧客ごとに異なるキーを使用する想定です。顧客環境ごとに適切なキーを設定してください。

詳細は`GEMINI_SETUP.md`を参照してください。

## 新たな顧客環境の追加手順

新しいドメイン環境（例：test2、test3など）を作成する手順を説明します。

### 前提条件

- 既に「test」環境が正常に動作していること
- Firebase Hosting が設定されていること
- ビルド環境が整っていること

### 手順

#### 1. customer-paths.json に新しい環境を追加

`customer-paths.json` ファイルを開き、`paths` 配列に新しい環境名を追加します。

**例：test2 環境を追加する場合**

```json
{
  "paths": ["test", "test2"]
}
```

**例：test3 環境を追加する場合**

```json
{
  "paths": ["test", "test2", "test3"]
}
```

#### 2. firebase.json に新しい環境の設定を追加

`firebase.json` ファイルを開き、以下の2箇所に新しい環境の設定を追加します。

##### 2-1. rewrites セクションに追加

`hosting.rewrites` 配列に、新しい環境用のリライトルールを追加します。

**新しい環境（例：test3）を追加する場合：**

```json
{
  "source": "/test3/api/**",
  "function": {
    "functionId": "apiDify",
    "region": "asia-northeast1"
  }
},
{
  "source": "/test3/**",
  "destination": "/test3/index.html"
}
```

##### 2-2. headers セクションに追加

`hosting.headers` 配列に、新しい環境用のヘッダー設定を追加します。

**新しい環境（例：test3）を追加する場合：**

```json
{
  "source": "/test3/**",
  "headers": [
    {
      "key": "Cross-Origin-Opener-Policy",
      "value": "same-origin-allow-popups"
    }
  ]
},
{
  "source": "/test3/api/**",
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
```

#### 3. ビルドを実行

新しい環境の設定を反映するために、プロジェクトをビルドします。

```bash
npm run build
```

このコマンドを実行すると、以下の処理が自動的に行われます：

1. Vite によるビルド（`vite build`）
2. `scripts/copy-index.js` の実行により：
   - `customer-paths.json` に記載された各環境用のディレクトリが `dist/` 配下に作成される
   - 各環境用の `index.html` が生成され、パスが適切に書き換えられる
   - アセットファイル（CSS、JS、画像など）が各環境ディレクトリにコピーされる

#### 4. ビルド結果の確認

ビルドが完了したら、`dist/` ディレクトリを確認します。

```bash
ls -la dist/
```

新しい環境のディレクトリ（例：`dist/test2/`、`dist/test3/`）が作成され、以下のファイルが含まれていることを確認してください：

- `index.html`
- `assets/` ディレクトリ（CSS、JSファイル）
- 画像ファイル（`.png`、`.svg`、`.jpg` など）

#### 5. Firebase にデプロイ

新しい環境の設定を Firebase Hosting にデプロイします。

```bash
firebase deploy --only hosting
```

#### 6. Firestoreにドメイン情報を設定

Firebase Consoleで以下のコレクションにドキュメントを作成します：

- **domainsコレクション**: ドキュメントIDを新しい環境名（例：`test2`、`test3`）として作成し、許可ユーザーを設定
- **domainDepartmentsコレクション**: ドキュメントIDを新しい環境名として作成し、部署一覧を設定

詳細は以下の「顧客ごとの許可ユーザー一覧の管理手順」「顧客ごとの部署一覧の管理方法」を参照してください。

#### 7. 動作確認

デプロイが完了したら、新しい環境のURLにアクセスして動作を確認します。

**例：**
- test2 環境: `https://voicelog.jp/test2/`
- test3 環境: `https://voicelog.jp/test3/`

### 注意事項

#### vite.config.js について

現在、`vite.config.js` の `base` 設定は `/test/` にハードコードされていますが、これは問題ありません。`copy-index.js` スクリプトが自動的に各環境のパスに置換するため、新しい環境を追加する際に `vite.config.js` を変更する必要はありません。

#### アプリケーションの動的パス検出

アプリケーション（`src/App.jsx`）は、URLから動的に basename を検出するため、新しい環境を追加してもコードの変更は不要です。

### トラブルシューティング

#### ビルド後に新しい環境のディレクトリが作成されない

- `customer-paths.json` の構文が正しいか確認してください（JSON形式）
- `customer-paths.json` の `paths` 配列に新しい環境名が正しく追加されているか確認してください

#### デプロイ後に404エラーが発生する

- `firebase.json` の `rewrites` セクションに新しい環境の設定が正しく追加されているか確認してください
- Firebase Hosting にデプロイが正常に完了したか確認してください

#### アセットファイルが読み込まれない

- `dist/{環境名}/assets/` ディレクトリにファイルが存在するか確認してください
- ブラウザの開発者ツールでネットワークタブを確認し、リソースの読み込みエラーがないか確認してください

## 顧客ごとの許可ユーザー一覧の管理手順

各顧客環境（ドメイン）ごとに、アクセスを許可するユーザーを管理できます。

### Firestoreでの管理

Firebase Consoleで`domains`コレクションを開き、ドキュメントIDを顧客ID（例: `test`, `test2`, `newcustomer`）として設定します。

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

Firebase Consoleで`domainDepartments`コレクションを開き、ドキュメントIDを顧客ID（例: `test`, `test2`, `newcustomer`）として設定します。

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

## その他

### 主な機能

- **Google認証**: ログイン機能
- **ドメインごとのアクセス制御**: URLパスごとに許可ユーザーを管理
- **部署一覧の管理**: ドメインごとに表示する部署を設定可能
- **音声ログ記録**: 部署、心のお天気（1-5）、理由を入力して記録
- **AI分析**: Dify APIによる「今日の気分」「チェックポイント」「次へのステップ」の生成
- **4コマ漫画生成**: 入力内容を基にDALL-E-3で4コマ漫画を生成（1日1回まで）
- **カレンダー表示**: 過去の記録をカレンダー形式で表示

### データ構造

#### Firestoreコレクション

##### voicelogs
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

##### domains
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

##### domainDepartments
ドメインごとの部署一覧を管理

```json
{
  "departments": ["部署名1", "部署名2", "部署名3"]
}
```

##### manga_generations
ユーザーごとの漫画生成日時を記録（ユーザーUIDをドキュメントIDとして使用）

### 技術スタック

- **フロントエンド**: React + Vite
- **バックエンド**: Firebase Functions
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication (Google)
- **AI**: Dify API、OpenAI API (DALL-E-3)、Gemini API

### トラブルシューティング

- **ログインできない**: Firebase設定（`.env`ファイル）が正しいか確認
- **Firestoreへの保存エラー**: Firestoreのセキュリティルールを確認
- **部署一覧が表示されない**: `domainDepartments`コレクションにデータが設定されているか確認
- **漫画生成エラー**: Firebase FunctionsのSecretが正しく設定されているか確認
