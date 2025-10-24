// Firebase Functions用のクライアント（フロントエンド用）
import { getFunctions, httpsCallable } from 'firebase/functions';

export class DifyClient {
  constructor() {
    // asia-northeast1リージョンを指定
    this.functions = getFunctions(undefined, 'asia-northeast1');
    this.callDify = httpsCallable(this.functions, 'callDify');
  }

  async sendMessage(department, rating, details) {
    try {
      // Firebase FunctionsのcallDifyを呼び出し
      const result = await this.callDify({
        inputs: {
          department,
          rating,
          details
        }
      });

      // Firebase Functionsから返されるデータを処理
      const data = result.data;
      console.log('Firebase Functionsから返されたデータ:', data);
      
      return {
        success: true,
        message: 'Difyからの回答を受信しました',
        text: data.text || data.message,  // Difyの返却値
        conversationId: data.conversationId,
        messageId: data.messageId
      };
    } catch (error) {
      console.error('Firebase Functions error:', error);
      
      // Firebase Functionsのエラーを処理
      let errorMessage = 'サーバーとの通信中にエラーが発生しました。';
      
      if (error.code === 'functions/unauthenticated') {
        errorMessage = '認証が必要です。ログインしてください。';
      } else if (error.code === 'functions/invalid-argument') {
        errorMessage = '入力データが正しくありません。';
      } else if (error.code === 'functions/internal') {
        errorMessage = 'サーバー内部エラーが発生しました。';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    }
  }
}
