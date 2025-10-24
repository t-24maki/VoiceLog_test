import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();

// Dify API Keyをsecretとして定義
const difyApiKey = defineSecret("DIFY_API_KEY");

export const callDify = functions.onCall(
  { 
    region: "asia-northeast1",
    secrets: [difyApiKey]
  },
  async (request: functions.CallableRequest) => {
    // 認証チェック
    if (!request.auth) {
      throw new functions.HttpsError("unauthenticated", "Missing authentication");
    }

    const { inputs } = request.data;
    if (!inputs) {
      throw new functions.HttpsError("invalid-argument", "inputs is required");
    }

    try {
      const endpoint = process.env.DIFY_API_ENDPOINT || "https://dotsconnection.jp/v1/workflows/run";
      const apiKey = difyApiKey.value();

      // Dify ワークフローへの入力変数を作成
      const inputsForDify = {
        name: inputs.department,
        feeling: inputs.rating,
        what: inputs.details
      };

      const requestBody = {
        inputs: inputsForDify,
        response_mode: 'blocking',
        user: request.auth.uid
      };

      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const text = await r.text();
      console.log('Dify API レスポンス:', text);
      
      if (!r.ok) {
        throw new functions.HttpsError("internal", `Dify API error: ${text}`);
      }

      const data = JSON.parse(text);
      console.log('Dify API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // ワークフローアプリのレスポンス形式に合わせて処理
      const workflowOutput = data?.data?.outputs?.output
        || data?.data?.outputs?.response
        || data?.output
        || data?.answer;

      console.log('抽出されたワークフロー出力:', workflowOutput);

      if (workflowOutput) {
        return {
          text: workflowOutput,
          message: workflowOutput,
          conversationId: data.data.conversation_id || '',
          messageId: data.data.message_id || ''
        };
      } else {
        console.warn('予期しないレスポンス形式:', data);
        return {
          text: JSON.stringify(data, null, 2),
          message: JSON.stringify(data, null, 2),
          conversationId: '',
          messageId: ''
        };
      }
    } catch (e: any) {
      console.error(e);
      if (e instanceof functions.HttpsError) {
        throw e;
      }
      throw new functions.HttpsError("internal", e.message);
    }
  }
);
