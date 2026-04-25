#!/bin/bash

# 図書貸出システム起動スクリプト

echo "======================================"
echo "図書貸出管理システム"
echo "======================================"
echo ""

# バックエンドの依存関係確認
if [ ! -d "backend/node_modules" ]; then
    echo "バックエンドの依存関係をインストール中..."
    cd backend
    npm install
    cd ..
    echo "✓ バックエンドの依存関係をインストールしました"
    echo ""
fi

# フロントエンドの依存関係確認
if [ ! -d "frontend/node_modules" ]; then
    echo "フロントエンドの依存関係をインストール中..."
    cd frontend
    npm install
    cd ..
    echo "✓ フロントエンドの依存関係をインストールしました"
    echo ""
fi

# データベースの確認と初期化
if [ ! -f "backend/database/library.db" ]; then
    echo "データベースを初期化中..."
    cd backend
    npm run init-db
    cd ..
    echo ""
fi

echo "======================================"
echo "サーバーを起動します..."
echo "======================================"
echo ""
echo "バックエンド: http://localhost:3000"
echo "フロントエンド: http://localhost:5173"
echo ""
echo "【デモアカウント】"
echo "管理者: ID=admin / パスワード=admin123"
echo "一般ユーザー: ID=tanaka / パスワード=user123"
echo ""
echo "終了する場合は Ctrl+C を押してください"
echo ""

# バックエンドとフロントエンドを同時起動
cd backend && npm run dev &
BACKEND_PID=$!

cd frontend && npm run dev &
FRONTEND_PID=$!

# シグナルハンドリング
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# プロセスを待機
wait
