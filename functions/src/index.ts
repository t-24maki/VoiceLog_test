import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";

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

/**
 * Originが許可されているかチェック
 * @param origin - リクエストのOriginヘッダー
 * @returns 許可されている場合はtrue
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  
  // 開発環境: localhostを許可
  if (origin.startsWith("http://localhost:") || origin.startsWith("https://localhost:")) {
    return true;
  }
  
  // 本番環境: https://voicelog.jp ドメインを許可
  // Originヘッダーはパス情報を含まないため、ドメイン全体を許可
  if (origin === "https://voicelog.jp" || origin.startsWith("https://voicelog.jp:")) {
    return true;
  }
  
  // 環境変数で追加の許可ドメインを指定可能
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (allowedOrigins) {
    const origins = allowedOrigins.split(",").map((o) => o.trim());
    return origins.includes(origin);
  }
  
  return false;
}

// HTTPエンドポイント用のHTTPS関数（サブパスSPA用）
export const apiDify = functions.onRequest(
  {
    region: "asia-northeast1",
    secrets: [difyApiKey],
    cors: true
  },
  async (req: Request, res: Response) => {
    // Originヘッダーを取得
    const origin = req.headers.origin;
    
    // CORS設定: 許可されたOriginのみ許可
    if (isAllowedOrigin(origin)) {
      res.set("Access-Control-Allow-Origin", origin!);
    }
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Credentials", "true");

    // OPTIONSリクエスト（CORS preflight）
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // POSTリクエストでもOriginをチェック
    if (req.method === "POST" && !isAllowedOrigin(origin)) {
      res.status(403).json({ error: "CORS policy: Origin not allowed" });
      return;
    }

    // POSTメソッドのみ許可
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      // 認証トークンの検証
      const authHeader = req.headers.authorization;
      let uid: string | null = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          uid = decodedToken.uid;
        } catch (error) {
          console.error("Token verification failed:", error);
        }
      }

      if (!uid) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { inputs } = req.body;
      if (!inputs) {
        res.status(400).json({ error: "inputs is required" });
        return;
      }

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
        user: uid
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
        res.status(r.status).json({ error: `Dify API error: ${text}` });
        return;
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
        res.json({
          text: workflowOutput,
          message: workflowOutput,
          conversationId: data.data.conversation_id || '',
          messageId: data.data.message_id || ''
        });
      } else {
        console.warn('予期しないレスポンス形式:', data);
        res.json({
          text: JSON.stringify(data, null, 2),
          message: JSON.stringify(data, null, 2),
          conversationId: '',
          messageId: ''
        });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  }
);
