#!/bin/bash

echo "======================================"
echo "図書貸出システム API総合テスト"
echo "======================================"
echo ""

# クッキーファイル
COOKIE_FILE="/tmp/test-cookies.txt"
rm -f $COOKIE_FILE

# ベースURL
BASE_URL="http://localhost:3000/api"

echo "【1】ヘルスチェック"
curl -s "$BASE_URL/health" | jq .
echo ""

echo "【2】ログインテスト (管理者)"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","password":"admin123"}' \
  -c $COOKIE_FILE)
echo "$LOGIN_RESPONSE" | jq .
echo ""

echo "【3】現在のユーザー情報取得"
curl -s "$BASE_URL/me" -b $COOKIE_FILE | jq .
echo ""

echo "【4】書籍一覧取得"
curl -s "$BASE_URL/books" -b $COOKIE_FILE | jq '.books | length'
echo "書籍数: $(curl -s "$BASE_URL/books" -b $COOKIE_FILE | jq '.books | length')"
echo ""

echo "【5】利用可能な書籍一覧"
AVAILABLE_BOOKS=$(curl -s "$BASE_URL/books/available" -b $COOKIE_FILE)
echo "$AVAILABLE_BOOKS" | jq '.books | length'
echo "利用可能な書籍数: $(echo "$AVAILABLE_BOOKS" | jq '.books | length')"
echo ""

echo "【6】書籍検索"
curl -s "$BASE_URL/books/search?keyword=Code" -b $COOKIE_FILE | jq .
echo ""

echo "【7】自分の貸出状況確認"
curl -s "$BASE_URL/status/my" -b $COOKIE_FILE | jq .
echo ""

echo "【8】書籍の貸出状況確認 (BK004)"
curl -s "$BASE_URL/status/book/BK004" -b $COOKIE_FILE | jq .
echo ""

echo "【9】書籍登録テスト (管理者)"
curl -s -X POST "$BASE_URL/book/add" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"BK999","title":"APIテスト書籍","author":"テスト太郎","isbn":"9999999999"}' \
  -b $COOKIE_FILE | jq .
echo ""

echo "【10】貸出テスト"
BORROW_RESPONSE=$(curl -s -X POST "$BASE_URL/borrow" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"BK001"}' \
  -b $COOKIE_FILE)
echo "$BORROW_RESPONSE" | jq .
echo ""

echo "【11】貸出後の状況確認"
curl -s "$BASE_URL/status/my" -b $COOKIE_FILE | jq .
echo ""

echo "【12】返却テスト"
curl -s -X POST "$BASE_URL/return" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"BK001"}' \
  -b $COOKIE_FILE | jq .
echo ""

echo "【13】全貸出記録 (管理者)"
curl -s "$BASE_URL/loans" -b $COOKIE_FILE | jq '.loans | length'
echo "貸出記録数: $(curl -s "$BASE_URL/loans" -b $COOKIE_FILE | jq '.loans | length')"
echo ""

echo "【14】期限切れ一覧 (管理者)"
curl -s "$BASE_URL/loans/overdue" -b $COOKIE_FILE | jq .
echo ""

echo "【15】ログアウト"
curl -s -X POST "$BASE_URL/logout" -b $COOKIE_FILE | jq .
echo ""

echo "【16】ログアウト後のアクセステスト (401エラーになるはず)"
curl -s "$BASE_URL/books" -b $COOKIE_FILE | jq .
echo ""

echo "【17】一般ユーザーでログイン"
curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"tanaka","password":"user123"}' \
  -c $COOKIE_FILE | jq .
echo ""

echo "【18】一般ユーザーの貸出状況"
curl -s "$BASE_URL/status/my" -b $COOKIE_FILE | jq .
echo ""

echo "======================================"
echo "APIテスト完了"
echo "======================================"

# クッキーファイル削除
rm -f $COOKIE_FILE
