// Vercel Serverless Function for Dify API
// api/dify-send.js

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

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
    const DIFY_API_ENDPOINT = process.env.DIFY_API_ENDPOINT || 'https://dotsconnection.jp/v1/workflows/run';
    const DIFY_WORKSPACE_ID = process.env.DIFY_WORKSPACE_ID;

    // APIキーの確認
    if (!DIFY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'APIキーが設定されていません'
      });
    }

    // Dify APIにリクエスト（Name/Feering/What を渡す）
    const response = await fetch(DIFY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          name: department,
          Feering: rating,
          What: details
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
