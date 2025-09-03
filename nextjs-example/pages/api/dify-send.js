// Next.js API Routes版
// pages/api/dify-send.js

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストの処理（CORS preflight）
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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
    const DIFY_API_ENDPOINT = process.env.DIFY_API_ENDPOINT || 'https://api.dify.ai/v1/chat-messages';
    const DIFY_WORKSPACE_ID = process.env.DIFY_WORKSPACE_ID;

    // APIキーの確認
    if (!DIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'APIキーが設定されていません'
      });
    }

    // プロンプトテンプレート
    const prompt = `以下の情報を基に回答してください：

部署: ${department}
数値評価: ${rating}
詳細情報: ${details}

上記の情報を分析して、適切なアドバイスや提案を提供してください。`;

    // Dify APIにリクエスト
    const response = await fetch(DIFY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: prompt,
        response_mode: 'blocking',
        user: 'web_user',
        conversation_id: '',
        files: []
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dify API error:', response.status, errorText);
      throw new Error(`Dify API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    res.status(200).json({
      success: true,
      message: data.answer,
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
