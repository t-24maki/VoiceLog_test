// Firebase Functions用のGPTクライアント（フロントエンド用）
import { getFunctions, httpsCallable } from 'firebase/functions';

export class GptClient {
  constructor() {
    // asia-northeast1リージョンを指定
    this.functions = getFunctions(undefined, 'asia-northeast1');
    this.callGpt = httpsCallable(this.functions, 'callGpt');
    this.callGptImage = httpsCallable(this.functions, 'callGptImage');
  }

  /**
   * GPT APIにメッセージを送信
   * @param {Array} messages - メッセージ配列（OpenAI Chat Completions API形式）
   * @param {string} model - 使用するモデル（オプション、デフォルト: gpt-4o-mini）
   * @param {number} temperature - 温度パラメータ（オプション、デフォルト: 0.7）
   * @returns {Promise<Object>} レスポンスオブジェクト
   */
  async sendMessage(messages, model = 'gpt-4o-mini', temperature = 0.7) {
    try {
      // Firebase FunctionsのcallGptを呼び出し
      const result = await this.callGpt({
        messages: messages,
        model: model,
        temperature: temperature
      });

      // Firebase Functionsから返されるデータを処理
      const data = result.data;
      console.log('Firebase Functionsから返されたデータ:', data);
      
      return {
        success: true,
        message: 'GPTからの回答を受信しました',
        text: data.text || data.message,  // GPTの返却値
        finishReason: data.finishReason,
        usage: data.usage,
        model: data.model,
        id: data.id
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

  /**
   * シンプルなテキストメッセージを送信（システムプロンプト付き）
   * @param {string} userMessage - ユーザーのメッセージ
   * @param {string} systemPrompt - システムプロンプト（オプション）
   * @param {string} model - 使用するモデル（オプション）
   * @param {number} temperature - 温度パラメータ（オプション）
   * @returns {Promise<Object>} レスポンスオブジェクト
   */
  async sendSimpleMessage(userMessage, systemPrompt = null, model = 'gpt-4o-mini', temperature = 0.7) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: userMessage
    });

    return await this.sendMessage(messages, model, temperature);
  }

  /**
   * OpenAI画像生成APIで画像を生成
   * @param {string} prompt - 画像生成用のプロンプト
   * @param {string} model - 使用するモデル（オプション、デフォルト: gpt-image-1）
   *   利用可能なモデル:
   *   - gpt-image-1: 最新のマルチモーダル画像生成モデル（2025年4月公開）
   *   - dall-e-3: DALL·Eシリーズの最新バージョン
   *   - dall-e-2: 以前から提供されているモデル
   * @param {string} size - 画像サイズ（オプション、デフォルト: 1024x1024）
   * @param {string} quality - 画像品質（オプション、gpt-image-1/dall-e-3のみ: standard/hd）
   * @returns {Promise<Object>} レスポンスオブジェクト
   */
  async generateImage(prompt, model = 'gpt-image-1', size = '1024x1024', quality = 'standard') {
    try {
      // Firebase FunctionsのcallGptImageを呼び出し
      const result = await this.callGptImage({
        prompt: prompt,
        model: model,
        size: size,
        quality: quality
      });

      // Firebase Functionsから返されるデータを処理
      const data = result.data;
      console.log('Firebase Functionsから返された画像データ:', data);
      
      return {
        success: true,
        message: '画像が生成されました',
        imageUrl: data.imageUrl,
        revisedPrompt: data.revisedPrompt,
        model: data.model
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

