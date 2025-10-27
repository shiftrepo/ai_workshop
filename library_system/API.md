# 図書貸出管理システム API仕様書

## 概要

RESTful API形式で実装されており、すべてのレスポンスはJSON形式です。

**ベースURL**: `http://localhost:3000/api`

## 認証

セッションベースの認証を使用しています。ログイン後、セッションCookieが発行されます。

---

## エンドポイント一覧

### 認証 (Authentication)

#### 1. ユーザー登録
**POST** `/api/register`

新規ユーザーを登録します。

**リクエストボディ**:
```json
{
  "userId": "user001",
  "password": "password123",
  "name": "山田太郎"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "message": "ユーザー登録が完了しました。"
}
```

**エラーレスポンス** (400 Bad Request):
```json
{
  "success": false,
  "message": "このユーザーIDは既に使用されています。"
}
```

---

#### 2. ログイン
**POST** `/api/login`

ユーザー認証を行い、セッションを開始します。

**リクエストボディ**:
```json
{
  "userId": "user001",
  "password": "password123"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "message": "ログインしました。",
  "user": {
    "userId": "user001",
    "name": "山田太郎",
    "isAdmin": false
  }
}
```

**エラーレスポンス** (401 Unauthorized):
```json
{
  "success": false,
  "message": "ユーザーIDまたはパスワードが間違っています。"
}
```

---

#### 3. ログアウト
**POST** `/api/logout`

セッションを終了します。

**レスポンス** (200 OK):
```json
{
  "success": true,
  "message": "ログアウトしました。"
}
```

---

#### 4. 現在のユーザー情報取得
**GET** `/api/me`

ログイン中のユーザー情報を取得します。

**レスポンス** (200 OK):
```json
{
  "success": true,
  "user": {
    "userId": "user001",
    "name": "山田太郎",
    "isAdmin": false
  }
}
```

**エラーレスポンス** (401 Unauthorized):
```json
{
  "success": false,
  "message": "ログインしていません。"
}
```

---

### 書籍管理 (Books)

#### 5. 書籍一覧取得
**GET** `/api/books`

登録されているすべての書籍を取得します。

**認証**: 必要

**レスポンス** (200 OK):
```json
{
  "success": true,
  "books": [
    {
      "id": 1,
      "book_id": "BK001",
      "title": "リーダブルコード",
      "author": "Dustin Boswell",
      "isbn": "9784873115658",
      "status": "available",
      "created_at": "2025-10-27T10:00:00.000Z"
    }
  ]
}
```

---

#### 6. 利用可能な書籍一覧
**GET** `/api/books/available`

貸出可能な書籍のみを取得します。

**認証**: 必要

**レスポンス** (200 OK):
```json
{
  "success": true,
  "books": [
    {
      "id": 1,
      "book_id": "BK001",
      "title": "リーダブルコード",
      "author": "Dustin Boswell",
      "isbn": "9784873115658",
      "status": "available",
      "created_at": "2025-10-27T10:00:00.000Z"
    }
  ]
}
```

---

#### 7. 書籍検索
**GET** `/api/books/search?keyword={keyword}`

タイトルで書籍を検索します。

**認証**: 必要

**クエリパラメータ**:
- `keyword` (string, required): 検索キーワード

**レスポンス** (200 OK):
```json
{
  "success": true,
  "books": [...]
}
```

---

#### 8. 書籍詳細取得
**GET** `/api/books/:bookId`

特定の書籍の詳細情報を取得します。

**認証**: 必要

**レスポンス** (200 OK):
```json
{
  "success": true,
  "book": {
    "id": 1,
    "book_id": "BK001",
    "title": "リーダブルコード",
    "author": "Dustin Boswell",
    "isbn": "9784873115658",
    "status": "available",
    "created_at": "2025-10-27T10:00:00.000Z"
  }
}
```

**エラーレスポンス** (404 Not Found):
```json
{
  "success": false,
  "message": "書籍が見つかりません。"
}
```

---

#### 9. 書籍登録（管理者のみ）
**POST** `/api/book/add`

新しい書籍を登録します。

**認証**: 必要（管理者のみ）

**リクエストボディ**:
```json
{
  "bookId": "BK011",
  "title": "実践ドメイン駆動設計",
  "author": "Vaughn Vernon",
  "isbn": "9784798131610"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "message": "書籍を登録しました。"
}
```

**エラーレスポンス** (400 Bad Request):
```json
{
  "success": false,
  "message": "この書籍IDは既に使用されています。"
}
```

---

#### 10. 書籍削除（管理者のみ）
**DELETE** `/api/books/:bookId`

書籍を削除します。貸出中の書籍は削除できません。

**認証**: 必要（管理者のみ）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "message": "書籍を削除しました。"
}
```

**エラーレスポンス** (400 Bad Request):
```json
{
  "success": false,
  "message": "貸出中の書籍は削除できません。"
}
```

---

### 貸出・返却 (Loans)

#### 11. 貸出
**POST** `/api/borrow`

書籍を借ります。

**認証**: 必要

**リクエストボディ**:
```json
{
  "bookId": "BK001"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "message": "貸出処理が完了しました。",
  "dueDate": "2025-11-10T10:00:00.000Z"
}
```

**エラーレスポンス** (400 Bad Request):
```json
{
  "success": false,
  "message": "貸出上限（3冊）に達しています。"
}
```

---

#### 12. 返却
**POST** `/api/return`

書籍を返却します。

**認証**: 必要

**リクエストボディ**:
```json
{
  "bookId": "BK001"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "message": "返却処理が完了しました。"
}
```

**エラーレスポンス** (404 Not Found):
```json
{
  "success": false,
  "message": "この書籍の貸出記録が見つかりません。"
}
```

---

#### 13. 全貸出記録取得（管理者のみ）
**GET** `/api/loans`

すべての貸出記録を取得します。

**認証**: 必要（管理者のみ）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "loans": [
    {
      "id": 1,
      "user_id": "tanaka",
      "user_name": "田中太郎",
      "book_id": "BK004",
      "title": "デザインパターン",
      "author": "Erich Gamma",
      "borrowed_at": "2025-10-22T10:00:00.000Z",
      "due_date": "2025-11-05T10:00:00.000Z",
      "returned_at": null,
      "status": "active"
    }
  ]
}
```

---

#### 14. 期限切れ一覧取得（管理者のみ）
**GET** `/api/loans/overdue`

返却期限を過ぎている貸出記録を取得します。

**認証**: 必要（管理者のみ）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "overdueLoans": [...]
}
```

---

### 状況確認 (Status)

#### 15. 自分の貸出状況
**GET** `/api/status/my`

ログインユーザーの貸出状況を取得します。

**認証**: 必要

**レスポンス** (200 OK):
```json
{
  "success": true,
  "userId": "tanaka",
  "activeLoans": 2,
  "maxLoans": 3,
  "remainingSlots": 1,
  "loans": [
    {
      "id": 1,
      "user_id": "tanaka",
      "book_id": "BK004",
      "title": "デザインパターン",
      "author": "Erich Gamma",
      "borrowed_at": "2025-10-22T10:00:00.000Z",
      "due_date": "2025-11-05T10:00:00.000Z",
      "status": "active",
      "isOverdue": false,
      "daysUntilDue": 9
    }
  ]
}
```

---

#### 16. ユーザーの貸出状況
**GET** `/api/status/user/:userId`

特定のユーザーの貸出状況を取得します。

**認証**: 必要（本人または管理者のみ）

**レスポンス**: 上記と同様

---

#### 17. 書籍の貸出状況
**GET** `/api/status/book/:bookId`

特定の書籍の貸出状況を取得します。

**認証**: 必要

**レスポンス** (200 OK):
```json
{
  "success": true,
  "book": {
    "bookId": "BK004",
    "title": "デザインパターン",
    "author": "Erich Gamma",
    "isbn": "9784797311129",
    "status": "borrowed"
  },
  "loanInfo": {
    "borrowedBy": "田中太郎",
    "borrowedAt": "2025-10-22T10:00:00.000Z",
    "dueDate": "2025-11-05T10:00:00.000Z",
    "isOverdue": false,
    "daysUntilDue": 9
  }
}
```

---

## エラーレスポンス

すべてのエラーレスポンスは以下の形式です：

```json
{
  "success": false,
  "message": "エラーメッセージ"
}
```

### HTTPステータスコード
- `200` - 成功
- `201` - 作成成功
- `400` - 不正なリクエスト
- `401` - 認証エラー
- `403` - 権限エラー
- `404` - リソースが見つからない
- `500` - サーバーエラー

---

## セキュリティ

- パスワードはbcryptでハッシュ化されて保存されます
- セッションはHTTP Onlyクッキーで管理されます
- CORS設定により、許可されたオリジンからのみアクセス可能です

---

## レート制限

現在、レート制限は実装されていませんが、本番環境では実装を推奨します。
