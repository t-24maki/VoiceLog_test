// バックエンドAPI用のサーバーコード例（server.js）
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 開発環境でのログ出力
if (NODE_ENV === 'development') {
  console.log('開発環境で起動中...');
  console.log(`フロントエンドURL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
}

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      hasApiKey: !!DIFY_CONFIG.API_KEY,
      hasWorkspaceId: !!DIFY_CONFIG.WORKSPACE_ID,
      endpoint: DIFY_CONFIG.API_ENDPOINT,
      apiKeyPrefix: DIFY_CONFIG.API_KEY ? DIFY_CONFIG.API_KEY.substring(0, 10) + '...' : '未設定'
    }
  });
});

// Dify API設定（環境変数から読み込み）
const DIFY_CONFIG = {
  API_KEY: process.env.DIFY_API_KEY,
  WORKSPACE_ID: process.env.DIFY_WORKSPACE_ID,
  // ワークフローアプリの正しいエンドポイント
  get API_ENDPOINT() {
    return process.env.DIFY_API_ENDPOINT || 
           `https://api.dify.ai/v1/workflows/run`;
  }
};

// 環境変数の検証
if (!DIFY_CONFIG.API_KEY) {
  console.error('エラー: DIFY_API_KEYが設定されていません。.envファイルを確認してください。');
  process.exit(1);
}

if (!DIFY_CONFIG.WORKSPACE_ID) {
  console.error('エラー: DIFY_WORKSPACE_IDが設定されていません。.envファイルを確認してください。');
  process.exit(1);
}

// Dify APIにメッセージを送信するエンドポイント
app.post('/api/dify/send', async (req, res) => {
  try {
    const { department, rating, details } = req.body;
    
    // 入力値の検証
    if (!department || !rating || !details) {
      return res.status(400).json({
        success: false,
        message: '必要なパラメータが不足しています'
      });
    }

    // Dify ワークフローへの入力変数を作成
    const inputsForDify = {
      name: department,
      feeling: rating,
      what: details
    };

    console.log('送信データ:', {
      department,
      rating,
      details,
      inputsForDify
    });

    console.log('Dify API設定:', {
      endpoint: DIFY_CONFIG.API_ENDPOINT,
      hasApiKey: !!DIFY_CONFIG.API_KEY,
      hasWorkspaceId: !!DIFY_CONFIG.WORKSPACE_ID,
      apiKeyPrefix: DIFY_CONFIG.API_KEY ? DIFY_CONFIG.API_KEY.substring(0, 10) + '...' : '未設定',
      workspaceId: DIFY_CONFIG.WORKSPACE_ID || '未設定'
    });

    // Dify APIにリクエスト
    const requestBody = {
      inputs: inputsForDify,
      response_mode: 'blocking',
      user: 'web_user'
    };

    console.log('Dify API リクエストボディ:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(DIFY_CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Dify API レスポンス:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API エラーレスポンス:', errorText);
      throw new Error(`Dify API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Dify API 成功レスポンス:', data);
    
    // ワークフローアプリのレスポンス形式に合わせて処理
    const workflowOutput = data?.data?.outputs?.output
      || data?.data?.outputs?.response
      || data?.output
      || data?.answer;

    if (workflowOutput) {
      res.json({
        success: true,
        message: workflowOutput,
        text: workflowOutput,
        conversationId: data.data.conversation_id || '',
        messageId: data.data.message_id || ''
      });
    } else {
      console.warn('予期しないレスポンス形式:', data);
      res.json({
        success: true,
        message: JSON.stringify(data, null, 2),
        text: JSON.stringify(data, null, 2),
        conversationId: '',
        messageId: ''
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
