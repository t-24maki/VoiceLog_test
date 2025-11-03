// CSVファイルからユーザーを一括登録するスクリプト
// Firebase Admin SDKではなく、通常のFirebase SDKを使用

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

// Firebase設定（環境変数から取得）
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'voicelog-dev.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'voicelog-dev',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'voicelog-dev.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * CSVファイルを読み込んでユーザーリストを取得
 * CSV形式: email,name (1行目はヘッダー)
 */
function readUsersFromCSV(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const users = [];
  for (let i = 1; i < lines.length; i++) { // 1行目（ヘッダー）をスキップ
    const line = lines[i].trim();
    if (!line) continue;
    
    const [email, name] = line.split(',').map(s => s.trim());
    if (email) {
      users.push({ email, name: name || email });
    }
  }
  
  return users;
}

/**
 * 指定されたドメインに許可ユーザーを追加する
 */
async function addUsers(domainId, users) {
  try {
    const domainRef = doc(db, 'domains', domainId);
    const domainDoc = await getDoc(domainRef);

    let allowedUsers = [];

    if (domainDoc.exists()) {
      const data = domainDoc.data();
      allowedUsers = data?.allowed_users || [];
      console.log(`既存のユーザー数: ${allowedUsers.length}`);
    } else {
      console.log('ドメインが存在しないため、新規作成します');
    }

    const existingEmails = new Set(allowedUsers.map(u => u.email.toLowerCase()));

    let addedCount = 0;
    for (const user of users) {
      if (!existingEmails.has(user.email.toLowerCase())) {
        allowedUsers.push(user);
        existingEmails.add(user.email.toLowerCase());
        addedCount++;
      } else {
        console.log(`スキップ: ${user.email} は既に登録されています`);
      }
    }

    await setDoc(domainRef, {
      allowed_users: allowedUsers
    });

    console.log(`✅ ${addedCount}件のユーザーを追加しました`);
    console.log(`合計ユーザー数: ${allowedUsers.length}`);

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  }
}

/**
 * 指定されたドメインの許可ユーザーリストを取得する
 */
async function getUsers(domainId) {
  try {
    const domainDoc = await getDoc(doc(db, 'domains', domainId));

    if (!domainDoc.exists()) {
      console.log(`ドメイン "${domainId}" は存在しません`);
      return;
    }

    const data = domainDoc.data();
    const allowedUsers = data?.allowed_users || [];

    console.log(`\nドメイン "${domainId}" の許可ユーザー (${allowedUsers.length}件):`);
    allowedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name})`);
    });

    return allowedUsers;

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  }
}

// コマンドライン引数を処理
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    if (command === 'add-csv') {
      const domainId = args[1];
      const csvPath = args[2];
      
      if (!domainId || !csvPath) {
        console.error('使用方法: node scripts/add-users-from-csv.js add-csv <domainId> <CSVファイルパス>');
        console.error('CSV形式: email,name');
        process.exit(1);
      }

      if (!fs.existsSync(csvPath)) {
        console.error(`エラー: CSVファイルが見つかりません: ${csvPath}`);
        process.exit(1);
      }

      const users = readUsersFromCSV(csvPath);
      console.log(`CSVファイルから ${users.length}件のユーザーを読み込みました`);
      
      await addUsers(domainId, users);

    } else if (command === 'list') {
      const domainId = args[1];
      if (!domainId) {
        console.error('使用方法: node scripts/add-users-from-csv.js list <domainId>');
        process.exit(1);
      }

      await getUsers(domainId);

    } else if (command === 'add') {
      const domainId = args[1];
      if (!domainId) {
        console.error('使用方法: node scripts/add-users-from-csv.js add <domainId> <email1> <name1> [email2] [name2] ...');
        process.exit(1);
      }

      const users = [];
      for (let i = 2; i < args.length; i += 2) {
        users.push({
          email: args[i],
          name: args[i + 1] || args[i]
        });
      }

      if (users.length === 0) {
        console.error('少なくとも1人のユーザーを指定してください');
        process.exit(1);
      }

      await addUsers(domainId, users);

    } else {
      console.error('不明なコマンド:', command);
      console.log('使用可能なコマンド: add, add-csv, list');
      console.log('例: node scripts/add-users-from-csv.js add-csv test users.csv');
      process.exit(1);
    }

  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

// メイン処理を実行
main();

