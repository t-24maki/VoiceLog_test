// Vercel Serverless Function用のクライアント（フロントエンド用）
export class DifyClient {
  constructor() {
    // 環境に応じてバックエンドURLを自動判定
    this.backendEndpoint = this.getBackendEndpoint();
  }

  getBackendEndpoint() {
    // 開発環境の場合
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // 本番環境の場合（Vercelデプロイ）
    return window.location.origin;
  }

  async sendMessage(department, rating, details) {
    try {
      const response = await fetch(`${this.backendEndpoint}/api/dify/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department,
          rating,
          details
        })
      });

      if (!response.ok) {
        let errorMessage = `Backend API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // JSON解析に失敗した場合はデフォルトメッセージを使用
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message,
        text: data.text,  // Difyの返却値textを取得
        conversationId: data.conversationId,
        messageId: data.messageId
      };
    } catch (error) {
      console.error('Backend API error:', error);
      return {
        success: false,
        error: error.message,
        message: 'サーバーとの通信中にエラーが発生しました。'
      };
    }
  }
}
