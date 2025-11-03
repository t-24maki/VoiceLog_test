// Firebase Admin SDKを初期化
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin SDKを初期化
if (getApps().length === 0) {
  // Firebase CLIで認証済みの場合、Application Default Credentialsを使用
  try {
    initializeApp({
      projectId: 'voicelog-dev'
    });
  } catch (error) {
    console.error('Firebase Admin SDKの初期化に失敗しました:', error.message);
    console.error('Firebase CLIでログインしてください: firebase login');
    process.exit(1);
  }
}

const db = getFirestore();

/**
 * 指定されたドメインに許可ユーザーを追加する
 */
async function addUsers(domainId, users) {
  try {
    const domainRef = db.collection('domains').doc(domainId);
    const domainDoc = await domainRef.get();

    let allowedUsers = [];

    if (domainDoc.exists) {
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

    await domainRef.set({
      allowed_users: allowedUsers
    }, { merge: false });

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
    const domainDoc = await db.collection('domains').doc(domainId).get();

    if (!domainDoc.exists) {
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

/**
 * 指定されたドメインから許可ユーザーを削除する
 */
async function removeUsers(domainId, emails) {
  try {
    const domainRef = db.collection('domains').doc(domainId);
    const domainDoc = await domainRef.get();

    if (!domainDoc.exists) {
      console.log(`ドメイン "${domainId}" は存在しません`);
      return;
    }

    const data = domainDoc.data();
    let allowedUsers = data?.allowed_users || [];

    const emailsToRemove = new Set(emails.map(e => e.toLowerCase()));

    const originalCount = allowedUsers.length;
    allowedUsers = allowedUsers.filter(user => !emailsToRemove.has(user.email.toLowerCase()));

    const removedCount = originalCount - allowedUsers.length;

    await domainRef.set({
      allowed_users: allowedUsers
    }, { merge: false });

    console.log(`✅ ${removedCount}件のユーザーを削除しました`);
    console.log(`残りのユーザー数: ${allowedUsers.length}`);

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
    if (command === 'add') {
      const domainId = args[1];
      if (!domainId) {
        console.error('使用方法: node scripts/add-users.js add <domainId> <email1> <name1> [email2] [name2] ...');
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

    } else if (command === 'list') {
      const domainId = args[1];
      if (!domainId) {
        console.error('使用方法: node scripts/add-users.js list <domainId>');
        process.exit(1);
      }

      await getUsers(domainId);

    } else if (command === 'remove') {
      const domainId = args[1];
      if (!domainId) {
        console.error('使用方法: node scripts/add-users.js remove <domainId> <email1> [email2] ...');
        process.exit(1);
      }

      const emails = args.slice(2);
      if (emails.length === 0) {
        console.error('少なくとも1つのメールアドレスを指定してください');
        process.exit(1);
      }

      await removeUsers(domainId, emails);

    } else {
      console.error('不明なコマンド:', command);
      console.log('使用可能なコマンド: add, list, remove');
      process.exit(1);
    }

  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

// メイン処理を実行
main();

