import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Request, Response } from "express";

admin.initializeApp();

// Dify API Keyをsecretとして定義
const difyApiKey = defineSecret("DIFY_API_KEY");

// OpenAI API Keyをsecretとして定義
const openAiApiKey = defineSecret("OPENAI_API_KEY");

// Google AI Studio (Gemini) API Keyをsecretとして定義
const geminiApiKey = defineSecret("GEMINI_API_KEY");

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

    console.log('callDify - 受信したinputs:', JSON.stringify(inputs, null, 2)); // デバッグ用
    console.log('callDify - inputs.personの値:', inputs.person, '型:', typeof inputs.person); // デバッグ用
    console.log('callDify - inputsオブジェクトの全キー:', Object.keys(inputs)); // デバッグ用

    // personが必須であることを確認
    if (inputs.person === undefined || inputs.person === null || inputs.person === '') {
      console.error('callDify - ERROR: inputs.personが未設定または空です');
      throw new functions.HttpsError("invalid-argument", "person is required");
    }

    try {
      const endpoint = process.env.DIFY_API_ENDPOINT || "https://dotsconnection.jp/v1/workflows/run";
      const apiKey = difyApiKey.value();

      // Dify ワークフローへの入力変数を作成
      const inputsForDify: any = {
        name: inputs.department,
        feeling: inputs.rating,
        what: inputs.details,
        person: inputs.person  // personは必須なので、必ず値がある
      };

      console.log('callDify - Dify APIに送信するinputsForDify:', JSON.stringify(inputsForDify, null, 2)); // デバッグ用

      const requestBody = {
        inputs: inputsForDify,
        response_mode: 'blocking',
        user: request.auth.uid
      };

      console.log('callDify - Dify APIに送信するrequestBody全体:', JSON.stringify(requestBody, null, 2)); // デバッグ用

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
        // Dify APIのエラーレスポンスをパースして、より分かりやすいエラーメッセージを返す
        try {
          const errorData = JSON.parse(text);
          if (errorData.message && errorData.message.includes('person')) {
            throw new functions.HttpsError("invalid-argument", `Dify APIエラー: ${errorData.message}. personフィールドの最大文字数制限を確認してください。`);
          }
        } catch (parseError) {
          // JSONパースに失敗した場合は、元のエラーメッセージを返す
        }
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

      console.log('apiDify - 受信したinputs:', JSON.stringify(inputs, null, 2)); // デバッグ用
      console.log('apiDify - inputs.personの値:', inputs.person, '型:', typeof inputs.person); // デバッグ用
      console.log('apiDify - inputsオブジェクトの全キー:', Object.keys(inputs)); // デバッグ用

      // personが必須であることを確認
      if (inputs.person === undefined || inputs.person === null || inputs.person === '') {
        console.error('apiDify - ERROR: inputs.personが未設定または空です');
        res.status(400).json({ error: "person is required" });
        return;
      }

      const endpoint = process.env.DIFY_API_ENDPOINT || "https://dotsconnection.jp/v1/workflows/run";
      const apiKey = difyApiKey.value();

      // Dify ワークフローへの入力変数を作成
      const inputsForDify: any = {
        name: inputs.department,
        feeling: inputs.rating,
        what: inputs.details,
        person: inputs.person  // personは必須なので、必ず値がある
      };

      console.log('apiDify - Dify APIに送信するinputsForDify:', JSON.stringify(inputsForDify, null, 2)); // デバッグ用

      const requestBody = {
        inputs: inputsForDify,
        response_mode: 'blocking',
        user: uid
      };

      console.log('apiDify - Dify APIに送信するrequestBody全体:', JSON.stringify(requestBody, null, 2)); // デバッグ用

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

// GPT APIを呼び出すFirebase Callable Function
export const callGpt = functions.onCall(
  { 
    region: "asia-northeast1",
    secrets: [openAiApiKey]
  },
  async (request: functions.CallableRequest) => {
    // 認証チェック
    if (!request.auth) {
      throw new functions.HttpsError("unauthenticated", "Missing authentication");
    }

    const { messages, model, temperature } = request.data;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new functions.HttpsError("invalid-argument", "messages is required and must be a non-empty array");
    }

    try {
      const apiKey = openAiApiKey.value();
      const gptModel = model || "gpt-4o-mini"; // デフォルトモデル
      const gptTemperature = temperature !== undefined ? temperature : 0.7; // デフォルト温度

      // OpenAI Chat Completions APIにリクエスト
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: gptModel,
          messages: messages,
          temperature: gptTemperature,
        }),
      });

      const responseText = await response.text();
      console.log('OpenAI API レスポンス:', responseText);
      
      if (!response.ok) {
        throw new functions.HttpsError("internal", `OpenAI API error: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('OpenAI API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // レスポンスからメッセージを抽出
      const assistantMessage = data?.choices?.[0]?.message?.content;
      const finishReason = data?.choices?.[0]?.finish_reason;
      const usage = data?.usage;

      if (assistantMessage) {
        return {
          text: assistantMessage,
          message: assistantMessage,
          finishReason: finishReason,
          usage: usage,
          model: data.model,
          id: data.id
        };
      } else {
        console.warn('予期しないレスポンス形式:', data);
        throw new functions.HttpsError("internal", "Unexpected response format from OpenAI API");
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

// DALL-E画像生成用のFirebase Callable Function
export const callGptImage = functions.onCall(
  { 
    region: "asia-northeast1",
    secrets: [openAiApiKey]
  },
  async (request: functions.CallableRequest) => {
    // 認証チェック
    if (!request.auth) {
      throw new functions.HttpsError("unauthenticated", "Missing authentication");
    }

    const { prompt, model, size, quality } = request.data;
    if (!prompt) {
      throw new functions.HttpsError("invalid-argument", "prompt is required");
    }

    try {
      const apiKey = openAiApiKey.value();
      // デフォルトモデルをgpt-image-1に変更（最新の画像生成モデル）
      const imageModel = model || "gpt-image-1";
      
      // モデルごとのデフォルト設定
      let imageSize = size;
      let imageQuality = quality;
      
      if (!imageSize) {
        if (imageModel === "gpt-image-1") {
          imageSize = "1024x1024"; // gpt-image-1のデフォルトサイズ
        } else if (imageModel === "dall-e-3") {
          imageSize = "1024x1024";
        } else {
          imageSize = "1024x1024"; // dall-e-2のデフォルト
        }
      }
      
      if (!imageQuality) {
        if (imageModel === "gpt-image-1") {
          imageQuality = "standard"; // gpt-image-1のデフォルト品質
        } else if (imageModel === "dall-e-3") {
          imageQuality = "standard";
        }
        // dall-e-2にはqualityパラメータなし
      }

      // OpenAI Images APIにリクエスト
      const requestBody: any = {
        model: imageModel,
        prompt: prompt,
        n: 1,
      };

      // sizeパラメータを追加（gpt-image-1とdall-e-3でサポート）
      if (imageModel === "gpt-image-1" || imageModel === "dall-e-3" || imageModel === "dall-e-2") {
        requestBody.size = imageSize;
      }

      // qualityパラメータを追加（gpt-image-1とdall-e-3のみサポート）
      if ((imageModel === "gpt-image-1" || imageModel === "dall-e-3") && imageQuality) {
        requestBody.quality = imageQuality;
      }

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('OpenAI Images API レスポンス:', responseText);
      
      if (!response.ok) {
        throw new functions.HttpsError("internal", `OpenAI Images API error: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('OpenAI Images API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // レスポンスから画像URLを抽出
      const imageUrl = data?.data?.[0]?.url;
      const revisedPrompt = data?.data?.[0]?.revised_prompt;

      if (imageUrl) {
        return {
          success: true,
          imageUrl: imageUrl,
          revisedPrompt: revisedPrompt,
          model: imageModel
        };
      } else {
        console.warn('予期しないレスポンス形式:', data);
        throw new functions.HttpsError("internal", "Unexpected response format from OpenAI Images API");
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

// HTTPエンドポイント用のHTTPS関数（GPT API用、サブパスSPA用）
export const apiGpt = functions.onRequest(
  {
    region: "asia-northeast1",
    secrets: [openAiApiKey],
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

      const { messages, model, temperature } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "messages is required and must be a non-empty array" });
        return;
      }

      const apiKey = openAiApiKey.value();
      const gptModel = model || "gpt-4o-mini"; // デフォルトモデル
      const gptTemperature = temperature !== undefined ? temperature : 0.7; // デフォルト温度

      // OpenAI Chat Completions APIにリクエスト
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: gptModel,
          messages: messages,
          temperature: gptTemperature,
        }),
      });

      const responseText = await response.text();
      console.log('OpenAI API レスポンス:', responseText);
      
      if (!response.ok) {
        res.status(response.status).json({ error: `OpenAI API error: ${responseText}` });
        return;
      }

      const data = JSON.parse(responseText);
      console.log('OpenAI API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // レスポンスからメッセージを抽出
      const assistantMessage = data?.choices?.[0]?.message?.content;
      const finishReason = data?.choices?.[0]?.finish_reason;
      const usage = data?.usage;

      if (assistantMessage) {
        res.json({
          text: assistantMessage,
          message: assistantMessage,
          finishReason: finishReason,
          usage: usage,
          model: data.model,
          id: data.id
        });
      } else {
        console.warn('予期しないレスポンス形式:', data);
        res.status(500).json({ error: "Unexpected response format from OpenAI API" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  }
);

// Gemini APIを呼び出すFirebase Callable Function
export const callGemini = functions.onCall(
  { 
    region: "asia-northeast1",
    secrets: [geminiApiKey]
  },
  async (request: functions.CallableRequest) => {
    // 認証チェック
    if (!request.auth) {
      throw new functions.HttpsError("unauthenticated", "Missing authentication");
    }

    const { messages, model, temperature } = request.data;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new functions.HttpsError("invalid-argument", "messages is required and must be a non-empty array");
    }

    try {
      const apiKey = geminiApiKey.value();
      const geminiModel = model || "gemini-2.5-flash"; // デフォルトモデル（テキスト生成用）
      const geminiTemperature = temperature !== undefined ? temperature : 0.7; // デフォルト温度

      // システムプロンプトを抽出（最初のsystemメッセージがある場合）
      const systemInstruction = messages.find((msg: any) => msg.role === "system")?.content;

      // Gemini APIのリクエスト形式に変換（システムメッセージは除外）
      const contents = messages
        .filter((msg: any) => msg.role !== "system")
        .map((msg: any) => {
          const role = msg.role === "assistant" ? "model" : "user";
          return {
            role: role,
            parts: [{ text: msg.content }]
          };
        });

      const requestBody: any = {
        contents: contents,
        generationConfig: {
          temperature: geminiTemperature,
        }
      };

      // システムプロンプトがある場合は追加
      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      // Google AI Studio (Gemini) APIにリクエスト
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Gemini API レスポンス:', responseText);
      
      if (!response.ok) {
        throw new functions.HttpsError("internal", `Gemini API error: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Gemini API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // レスポンスからメッセージを抽出
      const assistantMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const finishReason = data?.candidates?.[0]?.finishReason;
      const usage = data?.usageMetadata;

      if (assistantMessage) {
        return {
          text: assistantMessage,
          message: assistantMessage,
          finishReason: finishReason,
          usage: usage,
          model: geminiModel,
          id: data.modelVersion || data.model
        };
      } else {
        console.warn('予期しないレスポンス形式:', data);
        throw new functions.HttpsError("internal", "Unexpected response format from Gemini API");
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

// HTTPエンドポイント用のHTTPS関数（Gemini API用、サブパスSPA用）
export const apiGemini = functions.onRequest(
  {
    region: "asia-northeast1",
    secrets: [geminiApiKey],
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

      const { messages, model, temperature } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "messages is required and must be a non-empty array" });
        return;
      }

      const apiKey = geminiApiKey.value();
      const geminiModel = model || "gemini-2.5-flash"; // デフォルトモデル（テキスト生成用）
      const geminiTemperature = temperature !== undefined ? temperature : 0.7; // デフォルト温度

      // システムプロンプトを抽出（最初のsystemメッセージがある場合）
      const systemInstruction = messages.find((msg: any) => msg.role === "system")?.content;

      // Gemini APIのリクエスト形式に変換（システムメッセージは除外）
      const contents = messages
        .filter((msg: any) => msg.role !== "system")
        .map((msg: any) => {
          const role = msg.role === "assistant" ? "model" : "user";
          return {
            role: role,
            parts: [{ text: msg.content }]
          };
        });

      const requestBody: any = {
        contents: contents,
        generationConfig: {
          temperature: geminiTemperature,
        }
      };

      // システムプロンプトがある場合は追加
      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      // Google AI Studio (Gemini) APIにリクエスト
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Gemini API レスポンス:', responseText);
      
      if (!response.ok) {
        res.status(response.status).json({ error: `Gemini API error: ${responseText}` });
        return;
      }

      const data = JSON.parse(responseText);
      console.log('Gemini API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // レスポンスからメッセージを抽出
      const assistantMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const finishReason = data?.candidates?.[0]?.finishReason;
      const usage = data?.usageMetadata;

      if (assistantMessage) {
        res.json({
          text: assistantMessage,
          message: assistantMessage,
          finishReason: finishReason,
          usage: usage,
          model: geminiModel,
          id: data.modelVersion || data.model
        });
      } else {
        console.warn('予期しないレスポンス形式:', data);
        res.status(500).json({ error: "Unexpected response format from Gemini API" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  }
);

// Gemini画像生成用のFirebase Callable Function
export const callGeminiImage = functions.onCall(
  { 
    region: "asia-northeast1",
    secrets: [geminiApiKey]
  },
  async (request: functions.CallableRequest) => {
    // 認証チェック
    if (!request.auth) {
      throw new functions.HttpsError("unauthenticated", "Missing authentication");
    }

    const { prompt, aspectRatio, temperature } = request.data;
    if (!prompt) {
      throw new functions.HttpsError("invalid-argument", "prompt is required");
    }

    try {
      const apiKey = geminiApiKey.value();
      const geminiImageModel = "gemini-2.5-flash-image"; // 画像生成用モデル

      // Gemini画像生成APIのリクエスト形式
      const requestBody: any = {
        contents: [{
          role: "user",
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: temperature !== undefined ? temperature : 0.3
        }
      };

      // aspectRatioを指定する場合
      if (aspectRatio) {
        requestBody.aspectRatio = aspectRatio;
      }

      // Google AI Studio (Gemini) 画像生成APIにリクエスト
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiImageModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Gemini Image API レスポンス:', responseText);
      
      if (!response.ok) {
        throw new functions.HttpsError("internal", `Gemini Image API error: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Gemini Image API パース済みデータ:', JSON.stringify(data, null, 2));
      
      // リクエストに含まれたプロンプトをログ出力（Nano Bananaが実際に使用したプロンプト）
      console.log("=== Nano Banana が使用したプロンプト ===");
      console.log(prompt);
      console.log("=== プロンプト終了 ===");
      
      // レスポンスから画像データを抽出
      // 複数のレスポンス形式に対応
      const candidate = data?.candidates?.[0];
      if (!candidate) {
        console.warn('候補が見つかりません:', data);
        throw new functions.HttpsError("internal", "No candidate in Gemini Image API response");
      }

      const content = candidate.content;
      if (!content || !content.parts || content.parts.length === 0) {
        console.warn('コンテンツパーツが見つかりません:', content);
        throw new functions.HttpsError("internal", "No content parts in Gemini Image API response");
      }

      // 各パーツを確認
      for (const part of content.parts) {
        // パターン1: inlineDataにBase64データがある場合
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          if (imageData) {
            const imageUrl = `data:${mimeType};base64,${imageData}`;
            return {
              success: true,
              imageUrl: imageUrl,
              model: geminiImageModel,
              optimizedPrompt: prompt // 実際に使用されたプロンプトを返す
            };
          }
        }
        
        // パターン2: textに画像URLが含まれている場合
        if (part.text) {
          // URL形式かどうかをチェック
          const urlPattern = /https?:\/\/[^\s]+/;
          const urlMatch = part.text.match(urlPattern);
          if (urlMatch) {
            return {
              success: true,
              imageUrl: urlMatch[0],
              model: geminiImageModel,
              optimizedPrompt: prompt // 実際に使用されたプロンプトを返す
            };
          }
        }
      }

      // どのパターンにも該当しない場合
      console.warn('予期しないレスポンス形式:', JSON.stringify(data, null, 2));
      throw new functions.HttpsError("internal", `Unexpected response format from Gemini Image API: ${JSON.stringify(data)}`);
    } catch (e: any) {
      console.error(e);
      if (e instanceof functions.HttpsError) {
        throw e;
      }
      throw new functions.HttpsError("internal", e.message);
    }
  }
);
