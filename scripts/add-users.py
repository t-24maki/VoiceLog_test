#!/usr/bin/env python3
"""
Firestoreに許可ユーザーを追加するPythonスクリプト

使用方法:
    python scripts/add-users.py add-csv test users.csv
    python scripts/add-users.py list test
    python scripts/add-users.py add test user@example.com "User Name"
"""

import sys
import csv
import os
from firebase_admin import credentials, initialize_app, firestore

# Firebase認証情報のパス
SERVICE_ACCOUNT_KEY = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'serviceAccountKey.json')

def init_firebase():
    """Firebase Admin SDKを初期化"""
    if not os.path.exists(SERVICE_ACCOUNT_KEY):
        print(f"エラー: サービスアカウントキーが見つかりません: {SERVICE_ACCOUNT_KEY}")
        print("Firebase Consoleからサービスアカウントキーをダウンロードして配置してください")
        print("https://console.firebase.google.com/project/voicelog-dev/settings/serviceaccounts/adminsdk")
        sys.exit(1)
    
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
        initialize_app(cred)
        print("Firebase Admin SDKの初期化に成功しました")
    except Exception as e:
        print(f"Firebase Admin SDKの初期化に失敗しました: {e}")
        sys.exit(1)

def read_users_from_csv(csv_path):
    """CSVファイルからユーザーリストを読み込む"""
    users = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                email = row.get('email', '').strip()
                name = row.get('name', '').strip() or email
                if email:
                    users.append({'email': email, 'name': name})
    except FileNotFoundError:
        print(f"エラー: CSVファイルが見つかりません: {csv_path}")
        sys.exit(1)
    except Exception as e:
        print(f"CSVファイルの読み込みに失敗しました: {e}")
        sys.exit(1)
    
    return users

def add_users(domain_id, users):
    """指定されたドメインに許可ユーザーを追加する"""
    db = firestore.client()
    domain_ref = db.collection('domains').document(domain_id)
    
    try:
        domain_doc = domain_ref.get()
        
        if domain_doc.exists:
            data = domain_doc.to_dict()
            allowed_users = data.get('allowed_users', [])
            print(f"既存のユーザー数: {len(allowed_users)}")
        else:
            allowed_users = []
            print("ドメインが存在しないため、新規作成します")
        
        existing_emails = {user['email'].lower() for user in allowed_users}
        
        added_count = 0
        for user in users:
            if user['email'].lower() not in existing_emails:
                allowed_users.append(user)
                existing_emails.add(user['email'].lower())
                added_count += 1
            else:
                print(f"スキップ: {user['email']} は既に登録されています")
        
        domain_ref.set({'allowed_users': allowed_users})
        
        print(f"✅ {added_count}件のユーザーを追加しました")
        print(f"合計ユーザー数: {len(allowed_users)}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)

def get_users(domain_id):
    """指定されたドメインの許可ユーザーリストを取得する"""
    db = firestore.client()
    
    try:
        domain_doc = db.collection('domains').document(domain_id).get()
        
        if not domain_doc.exists:
            print(f"ドメイン \"{domain_id}\" は存在しません")
            return
        
        data = domain_doc.to_dict()
        allowed_users = data.get('allowed_users', [])
        
        print(f"\nドメイン \"{domain_id}\" の許可ユーザー ({len(allowed_users)}件):")
        for index, user in enumerate(allowed_users, 1):
            print(f"{index}. {user.get('email', 'N/A')} ({user.get('name', 'N/A')})")
        
        return allowed_users
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        sys.exit(1)

def main():
    """メイン処理"""
    if len(sys.argv) < 2:
        print("使用方法:")
        print("  python scripts/add-users.py add-csv <domainId> <CSVファイルパス>")
        print("  python scripts/add-users.py list <domainId>")
        print("  python scripts/add-users.py add <domainId> <email1> <name1> [email2] [name2] ...")
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Firebase初期化
    init_firebase()
    
    if command == 'add-csv':
        if len(sys.argv) < 4:
            print("使用方法: python scripts/add-users.py add-csv <domainId> <CSVファイルパス>")
            sys.exit(1)
        
        domain_id = sys.argv[2]
        csv_path = sys.argv[3]
        
        users = read_users_from_csv(csv_path)
        print(f"CSVファイルから {len(users)}件のユーザーを読み込みました")
        
        add_users(domain_id, users)
        
    elif command == 'list':
        if len(sys.argv) < 3:
            print("使用方法: python scripts/add-users.py list <domainId>")
            sys.exit(1)
        
        domain_id = sys.argv[2]
        get_users(domain_id)
        
    elif command == 'add':
        if len(sys.argv) < 5:
            print("使用方法: python scripts/add-users.py add <domainId> <email1> <name1> [email2] [name2] ...")
            sys.exit(1)
        
        domain_id = sys.argv[2]
        users = []
        for i in range(3, len(sys.argv), 2):
            email = sys.argv[i]
            name = sys.argv[i + 1] if i + 1 < len(sys.argv) else email
            users.append({'email': email, 'name': name})
        
        if not users:
            print("少なくとも1人のユーザーを指定してください")
            sys.exit(1)
        
        add_users(domain_id, users)
        
    else:
        print(f"不明なコマンド: {command}")
        print("使用可能なコマンド: add, add-csv, list")
        sys.exit(1)

if __name__ == '__main__':
    main()

