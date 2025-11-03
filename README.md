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

## 本番環境へのデプロイ

### 前提条件

1. Firebase CLIがインストールされていること
   ```bash
   npm install -g firebase-tools
   ```

2. Firebaseにログインしていること
   ```bash
   firebase login
   ```

3. プロジェクトが正しく設定されていること
   - `.firebaserc`でプロジェクトIDが設定されている

### デプロイ手順

1. **コードをビルド**
   ```bash
   npm run build
   ```
   これにより`dist`ディレクトリにビルド済みファイルが生成されます。

2. **Firestoreセキュリティルールをデプロイ**
   ```bash
   firebase deploy --only firestore:rules
   ```
   新しく追加した`domainDepartments`コレクションのルールが反映されます。

3. **Firestoreインデックスをデプロイ（必要に応じて）**
   ```bash
   firebase deploy --only firestore:indexes
   ```

4. **Firebase Hostingにデプロイ**
   ```bash
   firebase deploy --only hosting
   ```
   または、全てまとめてデプロイする場合：
   ```bash
   firebase deploy
   ```

5. **Firebase Functionsをデプロイ（API機能が必要な場合）**
   ```bash
   firebase deploy --only functions
   ```

### デプロイ後の確認事項

1. **Firestoreデータの設定**
   - [Firestore Database](https://console.firebase.google.com/project/voicelog-dev/firestore)にアクセス
   - `domainDepartments`コレクションが存在し、各ドメインの部署一覧が設定されているか確認
   - 例: `domainDepartments/test`に`departments: ["test-dep1", "test-dep2", ...]`が設定されているか

2. **本番環境での動作確認**
   - `https://voicelog.jp/test/` にアクセス
   - ログインが正常に動作するか確認
   - 部署一覧が正しく表示されるか確認

3. **エラーの確認**
   - ブラウザの開発者ツール（F12）でConsoleタブを確認
   - NetworkタブでAPIリクエストが正常に完了しているか確認

### 注意事項

- **環境変数の設定**: 本番環境でもFirebaseの設定が必要です（`.env`ファイルの設定は開発環境用で、本番環境ではFirebase Consoleで設定されます）
- **Firestoreルールの更新**: `domainDepartments`コレクションのルールを追加したため、必ずFirestoreルールをデプロイしてください
- **データの事前準備**: デプロイ前にFirebase Consoleで`domainDepartments`コレクションを作成し、各ドメインの部署一覧を設定しておくことを推奨します

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

### voicelogsコレクション

Firestoreの`voicelogs`コレクションには以下のフィールドが保存されます：

| フィールド名 | 型 | 説明 |
|------------|------|------|
| domain | string/null | ドメイン名（現状はnull） |
| user | string/null | ユーザー名（Googleアカウント名） |
| user_email | string/null | ユーザーのメールアドレス |
| user_uid | string/null | Firebase認証のUID |
| datetime | timestamp | データ登録日時（サーバータイムスタンプ） |
| division | string | 部署名（例: "プロップ"） |
| weather_score | string | 心のお天気スコア（"1"〜"5"） |
| weather_reason | string | お天気の理由（ユーザーが入力したテキスト） |
| dify_feeling | string | 今日の気分（Difyからの応答） |
| dify_checkpoint | string | チェックポイント（Difyからの応答） |
| dify_nextstep | string | 次へのステップ（Difyからの応答） |

### domainsコレクション（会員管理）

URLパスごとの許可ユーザーを管理するコレクションです。

**コレクション構造**: `domains/{domainId}`

**フィールド構造**:
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

**例**: `domains/test` ドキュメントに以下のデータを追加：
```json
{
  "allowed_users": [
    {
      "email": "tanaka@example.com",
      "name": "田中太郎"
    },
    {
      "email": "suzuki@example.com",
      "name": "鈴木花子"
    }
  ]
}
```

これにより、`https://voicelog.jp/test/` にアクセスできるユーザーを管理できます。

### domainDepartmentsコレクション（部署一覧管理）

ドメインごとに表示する部署一覧を管理するコレクションです。

**コレクション構造**: `domainDepartments/{domainId}`

**フィールド構造**:
```json
{
  "departments": [
    "部署名1",
    "部署名2",
    "部署名3"
  ]
}
```

**例**: `domainDepartments/test` ドキュメントに以下のデータを追加：
```json
{
  "departments": [
    "test-dep1",
    "test-dep2",
    "test-dep3"
  ]
}
```

これにより、`https://voicelog.jp/test/` で表示される部署一覧が管理できます。

**開発環境の場合**:
開発環境（ドメインIDが`null`の場合は`dev-local`として扱われます）の部署一覧を設定する場合は、`domainDepartments/dev-local` ドキュメントを作成します。

#### Firebase Consoleでの手動設定手順

1. Firebase Consoleにアクセス
   - [Firestore Database](https://console.firebase.google.com/project/voicelog-dev/firestore)を開く

2. domainDepartmentsコレクションを作成
   - 「コレクションを開始」をクリック
   - コレクションID: `domainDepartments` を入力

3. 各ドメインのドキュメントを作成
   - ドキュメントID: ドメインIDを入力（例: `test`、`dev-local`）
   - フィールド名: `departments`
   - タイプ: `配列`
   - 値: `文字列` の配列
     - 各部署名を文字列として追加（例: `"test-dep1"`, `"test-dep2"`）

4. セキュリティルールをデプロイ（既に更新済みの場合、再デプロイは不要）
   ```bash
   firebase deploy --only firestore:rules
   ```

**注意事項**:
- 部署一覧が見つからない場合やエラーが発生した場合は、デフォルト値（`["プロップ", "etc"]`）が使用されます
- ドメインIDが`null`（ルートパス）の場合は、自動的に`dev-local`として扱われます

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

### 会員管理機能のセットアップ

1. Firebase Consoleにアクセス
   - [Firestore Database](https://console.firebase.google.com/project/voicelog-dev/firestore)を開く

2. domainsコレクションを作成
   - 「コレクションを開始」をクリック
   - コレクションID: `domains` を入力

3. 各ドメインのドキュメントを作成
   - ドキュメントID: URLパスのIDを入力（例: `test`）
   - フィールド名: `allowed_users`
   - タイプ: `配列`
   - 値: `map` オブジェクトの配列
     - `email`: ユーザーのメールアドレス
     - `name`: ユーザー名（Googleアカウント名）

4. セキュリティルールをデプロイ
   ```bash
   firebase deploy --only firestore:rules
   ```

これで、指定したメールアドレスのユーザーのみがログインできるようになります。

#### 大量のユーザーを一括登録する場合

Firebase ConsoleのUIでは大変なので、Pythonスクリプトを使用して一括登録できます：

##### Pythonスクリプトを使用する方法（推奨）

1. 必要パッケージをインストール：
```bash
pip install firebase-admin
```

2. サービスアカウントキーを取得：
   - [Firebase Console](https://console.firebase.google.com/project/voicelog-dev/settings/serviceaccounts/adminsdk)にアクセス
   - 「新しい秘密鍵の生成」をクリック
   - ダウンロードしたJSONファイルをプロジェクトルートに配置（例: `serviceAccountKey.json`）

3. CSVファイルを作成（`users.csv`）：
```csv
email,name
user1@example.com,User 1
user2@example.com,User 2
user3@example.com,User 3
```

4. ユーザーを追加：
```bash
python scripts/add-users.py add-csv test users.csv
```

5. 許可ユーザーリストを表示：
```bash
python scripts/add-users.py list test
```

**注意**: サービスアカウントキーは秘密情報です。Gitにコミットしないよう注意してください。
