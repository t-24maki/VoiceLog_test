#!/bin/bash

# 環境変数設定スクリプト
echo "VoiceLog_test 環境変数設定スクリプト"
echo "======================================"
echo ""

# .envファイルが存在するかチェック
if [ -f ".env" ]; then
    echo "警告: .envファイルが既に存在します。"
    read -p "上書きしますか？ (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "設定をキャンセルしました。"
        exit 0
    fi
fi

echo ""
echo "Dify API設定を入力してください："
echo ""

# Dify API Key
read -p "Dify API Key: " dify_api_key
if [ -z "$dify_api_key" ]; then
    echo "エラー: Dify API Keyは必須です。"
    exit 1
fi

# Dify Workspace ID
read -p "Dify Workspace ID: " dify_workspace_id
if [ -z "$dify_workspace_id" ]; then
    echo "エラー: Dify Workspace IDは必須です。"
    exit 1
fi

# フロントエンドURL（デフォルト値）
read -p "フロントエンドURL (デフォルト: http://localhost:5173): " frontend_url
frontend_url=${frontend_url:-"http://localhost:5173"}

# サーバーポート（デフォルト値）
read -p "サーバーポート (デフォルト: 3001): " server_port
server_port=${server_port:-"3001"}

# .envファイルを作成
cat > .env << EOF
# Dify API設定
DIFY_API_KEY=$dify_api_key
DIFY_API_ENDPOINT=https://api.dify.ai/v1/chat-messages
DIFY_WORKSPACE_ID=$dify_workspace_id

# フロントエンドURL
FRONTEND_URL=$frontend_url

# サーバーポート
PORT=$server_port
EOF

echo ""
echo "✅ .envファイルが作成されました！"
echo ""
echo "次のステップ："
echo "1. npm run dev でフロントエンドを起動"
echo "2. npm run server でバックエンドを起動"
echo ""
echo "注意: .envファイルには機密情報が含まれているため、"
echo "Gitにコミットしないでください。"

