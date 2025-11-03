# ユーザー管理スクリプト

大量のユーザーを一括登録するためのスクリプトです。

## セットアップ

### Pythonスクリプトを使用する場合（推奨）

1. firebase-adminをインストール：
```bash
pip install firebase-admin
```

2. Firebase Consoleからサービスアカウントキーをダウンロード：
   - [Firebase Console](https://console.firebase.google.com/project/voicelog-dev/settings/serviceaccounts/adminsdk)
   - 「新しい秘密鍵の生成」をクリック
   - ダウンロードしたJSONファイルを `serviceAccountKey.json` としてプロジェクトルートに配置

## 使用方法

### 1. CSVファイルから一括登録（推奨）

CSVファイルを準備します：
```csv
email,name
user1@example.com,User 1
user2@example.com,User 2
user3@example.com,User 3
```

実行コマンド：
```bash
python scripts/add-users.py add-csv test users.csv
```

### 2. コマンドライン引数から直接追加

```bash
python scripts/add-users.py add test user1@example.com "User 1" user2@example.com "User 2"
```

### 3. 許可ユーザーリストを表示

```bash
python scripts/add-users.py list test
```

## 注意事項

- 既に登録済みのメールアドレスは自動的にスキップされます
- サービスアカウントキーは秘密情報です。Gitにコミットしないよう注意してください
- 大量のユーザーを登録する場合は、CSVファイル方式が推奨されます

## 例

### 100人のユーザーを登録する場合

1. `users.csv`ファイルを作成：
```csv
email,name
user001@example.com,User 001
user002@example.com,User 002
...
user100@example.com,User 100
```

2. 実行：
```bash
python scripts/add-users.py add-csv test users.csv
```

### Google SheetsからエクスポートしたCSVを使用する場合

Google Sheetsでメールアドレスと名前を並べて、CSV形式でエクスポートして使用できます。

```csv
email,name
John Doe,john.doe@example.com
Jane Smith,jane.smith@example.com
```

**注意**: Google Sheetsからエクスポートする場合、列の順序が逆になることがあります。その場合は手動で並び替えるか、スクリプトを修正してください。

