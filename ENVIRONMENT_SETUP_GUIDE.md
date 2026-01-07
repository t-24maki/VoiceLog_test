# 新しいドメイン環境のセットアップ手順書

このドキュメントでは、既存の「test」環境（https://voicelog.jp/test/）を参考に、新しいドメイン環境（例：test2、test3など）を作成する手順を説明します。

## 前提条件

- 既に「test」環境が正常に動作していること
- Firebase Hosting が設定されていること
- ビルド環境が整っていること

## 手順

### 1. customer-paths.json に新しい環境を追加

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

### 2. firebase.json に新しい環境の設定を追加

`firebase.json` ファイルを開き、以下の2箇所に新しい環境の設定を追加します。

#### 2-1. rewrites セクションに追加

`hosting.rewrites` 配列に、新しい環境用のリライトルールを追加します。

**test2 の例（既に追加済み）：**

```json
{
  "source": "/test2/api/**",
  "function": {
    "functionId": "apiDify",
    "region": "asia-northeast1"
  }
},
{
  "source": "/test2/**",
  "destination": "/test2/index.html"
}
```

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

#### 2-2. headers セクションに追加

`hosting.headers` 配列に、新しい環境用のヘッダー設定を追加します。

**test2 の例（既に追加済み）：**

```json
{
  "source": "/test2/**",
  "headers": [
    {
      "key": "Cross-Origin-Opener-Policy",
      "value": "same-origin-allow-popups"
    }
  ]
},
{
  "source": "/test2/api/**",
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

### 3. ビルドを実行

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

### 4. ビルド結果の確認

ビルドが完了したら、`dist/` ディレクトリを確認します。

```bash
ls -la dist/
```

新しい環境のディレクトリ（例：`dist/test2/`、`dist/test3/`）が作成され、以下のファイルが含まれていることを確認してください：

- `index.html`
- `assets/` ディレクトリ（CSS、JSファイル）
- 画像ファイル（`.png`、`.svg`、`.jpg` など）

### 5. Firebase にデプロイ

新しい環境の設定を Firebase Hosting にデプロイします。

```bash
firebase deploy --only hosting
```

### 6. 動作確認

デプロイが完了したら、新しい環境のURLにアクセスして動作を確認します。

**例：**
- test2 環境: `https://voicelog.jp/test2/`
- test3 環境: `https://voicelog.jp/test3/`

## 注意事項

### vite.config.js について

現在、`vite.config.js` の `base` 設定は `/test/` にハードコードされていますが、これは問題ありません。`copy-index.js` スクリプトが自動的に各環境のパスに置換するため、新しい環境を追加する際に `vite.config.js` を変更する必要はありません。

```javascript
base: process.env.NODE_ENV === 'production' ? '/test/' : '/',
```

### アプリケーションの動的パス検出

アプリケーション（`src/App.jsx`）は、URLから動的に basename を検出するため、新しい環境を追加してもコードの変更は不要です。

```javascript
const basename = (() => {
  if (import.meta.env.DEV) return '';
  const path = window.location.pathname;
  const match = path.match(/^\/([^\/]+)/);
  return match ? `/${match[1]}` : '';
})();
```

## トラブルシューティング

### ビルド後に新しい環境のディレクトリが作成されない

- `customer-paths.json` の構文が正しいか確認してください（JSON形式）
- `customer-paths.json` の `paths` 配列に新しい環境名が正しく追加されているか確認してください

### デプロイ後に404エラーが発生する

- `firebase.json` の `rewrites` セクションに新しい環境の設定が正しく追加されているか確認してください
- Firebase Hosting にデプロイが正常に完了したか確認してください

### アセットファイルが読み込まれない

- `dist/{環境名}/assets/` ディレクトリにファイルが存在するか確認してください
- ブラウザの開発者ツールでネットワークタブを確認し、リソースの読み込みエラーがないか確認してください

## まとめ

新しい環境を追加する際の主な作業は以下の3つです：

1. ✅ `customer-paths.json` に新しい環境名を追加
2. ✅ `firebase.json` に新しい環境の設定（rewrites と headers）を追加
3. ✅ ビルドとデプロイを実行

これだけで、新しい環境が利用可能になります。

