# Gemini API (Google AI Studio) セットアップガイド

## 概要

このドキュメントでは、漫画作成機能で使用するAIモデルをGPTからGemini（Google AI Studio）に切り替える方法と、Firebase SecretsにAPIキーを登録する方法を説明します。

## 1. Google AI StudioでAPIキーを取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Googleアカウントでログイン
3. 「Get API key」をクリック
4. 新しいAPIキーを作成するか、既存のAPIキーを選択
5. APIキーをコピー（後で使用します）

## 2. Firebase SecretsにAPIキーを登録

Firebase CLIを使用して、Gemini APIキーをFirebase Secretsに登録します。

### 前提条件

- Firebase CLIがインストールされていること
- Firebaseプロジェクトにログインしていること

### 登録手順

1. プロジェクトのルートディレクトリで以下のコマンドを実行：

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

2. プロンプトが表示されたら、Google AI Studioで取得したAPIキーを貼り付けます

3. 確認メッセージが表示されれば登録完了です

### 既存のシークレットを確認

登録されたシークレットを確認するには：

```bash
firebase functions:secrets:access GEMINI_API_KEY
```

### シークレットの一覧を確認

すべてのシークレットを確認するには：

```bash
firebase functions:secrets:list
```

## 3. コードでの切り替え方法

### プロンプト生成のAIモデルを切り替え

`src/App.jsx`ファイルの以下の行を編集して、使用するAIプロバイダーを切り替えます：

```javascript
// 漫画作成で使用するAIモデルを切り替えるフラグ
// "gpt" または "gemini" を指定（デフォルト: "gpt"）
const MANGA_AI_PROVIDER = "gpt"; // "gpt" または "gemini"
```

- `"gpt"` を指定すると、OpenAI GPTを使用します
- `"gemini"` を指定すると、Google AI Studio (Gemini) を使用します

### 注意事項

- **画像生成**: 画像生成（DALL-E）は引き続きOpenAIを使用します。Geminiは画像生成APIを持たないため、プロンプト生成のみが切り替わります。
- **モデル名**: 
  - GPT使用時: `gpt-4`（デフォルト）
  - Gemini使用時: `gemini-2.5-flash`（デフォルト）

## 4. Firebase Functionsのデプロイ

シークレットを登録した後、Firebase Functionsを再デプロイする必要があります：

```bash
cd functions
npm install  # 依存関係が更新されている場合
cd ..
firebase deploy --only functions
```

## 5. 動作確認

1. `src/App.jsx`で`MANGA_AI_PROVIDER`を`"gemini"`に設定
2. アプリケーションを起動
3. 漫画作成機能をテスト
4. コンソールログでGemini APIが呼び出されていることを確認

## トラブルシューティング

### エラー: "Missing authentication"

- Firebase Authenticationが正しく設定されているか確認
- ユーザーがログインしているか確認

### エラー: "Gemini API error"

- APIキーが正しく登録されているか確認
- Google AI StudioでAPIキーが有効か確認
- APIの使用制限に達していないか確認

### シークレットが読み込めない

- Firebase Functionsが再デプロイされているか確認
- シークレット名が`GEMINI_API_KEY`と正確に一致しているか確認

## 参考リンク

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API ドキュメント](https://ai.google.dev/docs)
- [Firebase Functions Secrets ドキュメント](https://firebase.google.com/docs/functions/config-env?hl=ja)


