// Vercel Serverless Function for Dify API
// api/dify-send.js

/**
 * Originが許可されているかチェック
 * @param {string} origin - リクエストのOriginヘッダー
 * @returns {boolean} 許可されている場合はtrue
 */
function isAllowedOrigin(origin) {
  if (!origin) return false;
  
  // 開発環境: localhostを許可
  if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
    return true;
  }
  
  // 本番環境: https://voicelog.jp ドメインを許可
  // Originヘッダーはパス情報を含まないため、ドメイン全体を許可
  // これにより https://voicelog.jp/customer1/, https://voicelog.jp/customer2/ など
  // すべてのサブパスからのリクエストが許可されます
  if (origin === 'https://voicelog.jp' || origin.startsWith('https://voicelog.jp:')) {
    return true;
  }
  
  // 環境変数で追加の許可ドメインを指定可能
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (allowedOrigins) {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    return origins.includes(origin);
  }
  
  return false;
}

export default async function handler(req, res) {
  // Originヘッダーを取得（CORSにはOriginヘッダーが必要）
  const origin = req.headers.origin;
  
  // CORS設定: 許可されたOriginのみ許可
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  // OPTIONSリクエストの処理（CORS preflight）
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // POSTリクエストでもOriginをチェック
  if (req.method === 'POST' && !isAllowedOrigin(origin)) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Origin not allowed'
    });
  }

  // POSTメソッドのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { department, rating, details } = req.body;

    // 入力値の検証
    if (!department || !rating || !details) {
      return res.status(400).json({
        success: false,
        message: '必要なパラメータが不足しています'
      });
    }

    // 環境変数からDify設定を取得
    const DIFY_API_KEY = process.env.DIFY_API_KEY;
    const DIFY_API_ENDPOINT = process.env.DIFY_API_ENDPOINT || 'https://api.dify.ai/v1/workflows/run';
    const DIFY_WORKSPACE_ID = process.env.DIFY_WORKSPACE_ID;

    // APIキーの確認
    if (!DIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'APIキーが設定されていません'
      });
    }

    // Dify APIにリクエスト（name/feeling/what を渡す）
    const response = await fetch(DIFY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          name: department,
          feeling: rating,
          what: details
        },
        response_mode: 'blocking',
        user: 'web_user'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API error:', response.status, errorText);
      throw new Error(`Dify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    const workflowOutput = data?.data?.outputs?.output
      || data?.data?.outputs?.response
      || data?.output
      || data?.answer;

    res.status(200).json({
      success: true,
      message: workflowOutput,
      text: workflowOutput,
      conversationId: data.conversation_id,
      messageId: data.message_id
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error.message
    });
  }
}
