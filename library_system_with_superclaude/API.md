# REST API 仕様書

## 1. API概要

### 1.1 基本情報
- **Base URL**: `http://localhost:3000/api`
- **プロトコル**: HTTP/1.1
- **データ形式**: JSON
- **文字コード**: UTF-8
- **認証方式**: Cookie-based Session

### 1.2 共通仕様

#### レスポンス形式（成功時）
```json
{
  "success": true,
  "data": { /* レスポンスデータ */ },
  "message": "操作が成功しました"
}
```

#### レスポンス形式（エラー時）
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": { /* 詳細情報（任意） */ }
  }
}
```

#### HTTPステータスコード
- **200 OK**: 成功（GET, PUT）
- **201 Created**: 作成成功（POST）
- **204 No Content**: 成功（削除など、レスポンスボディなし）
- **400 Bad Request**: リクエスト不正
- **401 Unauthorized**: 認証失敗
- **403 Forbidden**: 権限不足
- **404 Not Found**: リソースが存在しない
- **409 Conflict**: 競合エラー（重複登録等）
- **500 Internal Server Error**: サーバエラー

#### 共通ヘッダー
```
Content-Type: application/json
Cookie: connect.sid=<session_id>  # 認証後のリクエストで必須
```

---

## 2. 認証API（/api/auth）

### 2.1 ユーザ登録
**エンドポイント**: `POST /api/auth/register`
**認証**: 不要

**リクエストボディ**:
```json
{
  "username": "user1",
  "password": "securePassword123",
  "email": "user1@company.local"
}
```

**バリデーション**:
- username: 3-20文字、英数字とアンダースコアのみ
- password: 8文字以上、英数字を含む
- email: 有効なメールアドレス形式

**レスポンス例（成功）**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "user1",
      "email": "user1@company.local",
      "role": "user",
      "created_at": "2025-01-11T10:30:00.000Z"
    }
  },
  "message": "ユーザ登録が完了しました"
}
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "USERNAME_ALREADY_EXISTS",
    "message": "このユーザ名は既に使用されています"
  }
}
```

---

### 2.2 ログイン
**エンドポイント**: `POST /api/auth/login`
**認証**: 不要

**リクエストボディ**:
```json
{
  "username": "user1",
  "password": "securePassword123"
}
```

**レスポンス例（成功）**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "user1",
      "email": "user1@company.local",
      "role": "user"
    }
  },
  "message": "ログインしました"
}
```

**Set-Cookie ヘッダー**:
```
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; SameSite=Strict
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "ユーザ名またはパスワードが正しくありません"
  }
}
```

---

### 2.3 ログアウト
**エンドポイント**: `POST /api/auth/logout`
**認証**: 必要

**レスポンス例**:
```json
{
  "success": true,
  "message": "ログアウトしました"
}
```

---

### 2.4 セッション確認
**エンドポイント**: `GET /api/auth/me`
**認証**: 必要

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "user1",
      "email": "user1@company.local",
      "role": "user"
    }
  }
}
```

---

## 3. ユーザ管理API（/api/users）

### 3.1 ユーザ一覧取得
**エンドポイント**: `GET /api/users`
**認証**: 必要（管理者のみ）

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）
- `role`: ロールフィルタ（'admin' or 'user'）

**リクエスト例**:
```
GET /api/users?page=1&limit=10&role=user
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 2,
        "username": "user1",
        "email": "user1@company.local",
        "role": "user",
        "created_at": "2025-01-10T09:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 25,
      "limit": 10
    }
  }
}
```

---

### 3.2 ユーザ詳細取得
**エンドポイント**: `GET /api/users/:id`
**認証**: 必要（自分の情報または管理者のみ）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "user1",
      "email": "user1@company.local",
      "role": "user",
      "created_at": "2025-01-10T09:00:00.000Z",
      "updated_at": "2025-01-11T10:30:00.000Z"
    }
  }
}
```

---

### 3.3 ユーザ情報更新
**エンドポイント**: `PUT /api/users/:id`
**認証**: 必要（自分の情報または管理者のみ）

**リクエストボディ**:
```json
{
  "email": "newemail@company.local",
  "password": "newPassword123"  // 任意、変更する場合のみ
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "user1",
      "email": "newemail@company.local",
      "role": "user"
    }
  },
  "message": "ユーザ情報を更新しました"
}
```

---

### 3.4 ユーザ削除
**エンドポイント**: `DELETE /api/users/:id`
**認証**: 必要（管理者のみ）

**レスポンス例**:
```json
{
  "success": true,
  "message": "ユーザを削除しました"
}
```

**注意**: 貸出中の書籍がある場合はエラー
```json
{
  "success": false,
  "error": {
    "code": "USER_HAS_ACTIVE_LOANS",
    "message": "貸出中の書籍があるため削除できません",
    "details": {
      "active_loans_count": 2
    }
  }
}
```

---

## 4. 書籍管理API（/api/books）

### 4.1 書籍一覧取得
**エンドポイント**: `GET /api/books`
**認証**: 必要

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）
- `search`: タイトル・著者名で検索（部分一致）
- `category`: カテゴリフィルタ
- `available_only`: 貸出可能のみ（true/false）

**リクエスト例**:
```
GET /api/books?page=1&limit=10&search=Clean&available_only=true
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": 2,
        "isbn": "978-4-87311-704-1",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "publisher": "アスキー・メディアワークス",
        "published_year": 2009,
        "category": "技術書",
        "total_stock": 1,
        "available_stock": 1,
        "created_at": "2025-01-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 48,
      "limit": 10
    }
  }
}
```

---

### 4.2 書籍詳細取得
**エンドポイント**: `GET /api/books/:id`
**認証**: 必要

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "book": {
      "id": 2,
      "isbn": "978-4-87311-704-1",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "publisher": "アスキー・メディアワークス",
      "published_year": 2009,
      "category": "技術書",
      "total_stock": 1,
      "available_stock": 0,
      "created_at": "2025-01-10T08:00:00.000Z",
      "updated_at": "2025-01-11T14:00:00.000Z"
    },
    "loan_history": [
      {
        "loan_id": 5,
        "user_id": 3,
        "username": "user2",
        "loan_date": "2025-01-11T14:00:00.000Z",
        "due_date": "2025-01-25T14:00:00.000Z",
        "status": "borrowed"
      }
    ]
  }
}
```

---

### 4.3 書籍登録
**エンドポイント**: `POST /api/books`
**認証**: 必要（管理者のみ）

**リクエストボディ**:
```json
{
  "isbn": "978-4-295-00712-7",
  "title": "リーダブルコード",
  "author": "Dustin Boswell",
  "publisher": "オライリー・ジャパン",
  "published_year": 2012,
  "category": "技術書",
  "total_stock": 2
}
```

**バリデーション**:
- isbn: 必須、ISBNフォーマット（ハイフンあり/なし両対応）
- title: 必須、1-200文字
- author: 必須、1-100文字
- total_stock: 1-3（同一タイトル最大3冊）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "book": {
      "id": 10,
      "isbn": "978-4-295-00712-7",
      "title": "リーダブルコード",
      "author": "Dustin Boswell",
      "publisher": "オライリー・ジャパン",
      "published_year": 2012,
      "category": "技術書",
      "total_stock": 2,
      "available_stock": 2,
      "created_at": "2025-01-11T15:00:00.000Z"
    }
  },
  "message": "書籍を登録しました"
}
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "ISBN_ALREADY_EXISTS",
    "message": "このISBNは既に登録されています"
  }
}
```

---

### 4.4 書籍情報更新
**エンドポイント**: `PUT /api/books/:id`
**認証**: 必要（管理者のみ）

**リクエストボディ**:
```json
{
  "publisher": "オライリー・ジャパン（更新版）",
  "total_stock": 3
}
```

**注意**: available_stock は total_stock の範囲内に自動調整

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "book": {
      "id": 10,
      "isbn": "978-4-295-00712-7",
      "title": "リーダブルコード",
      "total_stock": 3,
      "available_stock": 2
    }
  },
  "message": "書籍情報を更新しました"
}
```

---

### 4.5 書籍削除
**エンドポイント**: `DELETE /api/books/:id`
**認証**: 必要（管理者のみ）

**レスポンス例**:
```json
{
  "success": true,
  "message": "書籍を削除しました"
}
```

**エラー例**（貸出中の場合）:
```json
{
  "success": false,
  "error": {
    "code": "BOOK_HAS_ACTIVE_LOANS",
    "message": "貸出中のため削除できません",
    "details": {
      "active_loans_count": 1
    }
  }
}
```

---

## 5. 貸出管理API（/api/loans）

### 5.1 貸出記録一覧取得
**エンドポイント**: `GET /api/loans`
**認証**: 必要

**クエリパラメータ**:
- `user_id`: ユーザIDでフィルタ（管理者のみ全ユーザ可）
- `status`: ステータスフィルタ（'borrowed', 'returned', 'overdue'）
- `page`: ページ番号
- `limit`: 1ページあたりの件数

**リクエスト例**:
```
GET /api/loans?user_id=2&status=borrowed&page=1&limit=10
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": 5,
        "user": {
          "id": 2,
          "username": "user1"
        },
        "book": {
          "id": 2,
          "isbn": "978-4-87311-704-1",
          "title": "Clean Code",
          "author": "Robert C. Martin"
        },
        "loan_date": "2025-01-11T10:00:00.000Z",
        "due_date": "2025-01-25T10:00:00.000Z",
        "return_date": null,
        "status": "borrowed",
        "days_until_due": 14
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_count": 15,
      "limit": 10
    }
  }
}
```

---

### 5.2 自分の貸出中書籍取得
**エンドポイント**: `GET /api/loans/my-loans`
**認証**: 必要

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": 5,
        "book": {
          "id": 2,
          "title": "Clean Code",
          "author": "Robert C. Martin"
        },
        "loan_date": "2025-01-11T10:00:00.000Z",
        "due_date": "2025-01-25T10:00:00.000Z",
        "status": "borrowed",
        "days_until_due": 14
      }
    ],
    "summary": {
      "total_borrowed": 1,
      "max_allowed": 3,
      "available_slots": 2
    }
  }
}
```

---

### 5.3 書籍を借りる
**エンドポイント**: `POST /api/loans`
**認証**: 必要

**リクエストボディ**:
```json
{
  "book_id": 2
}
```

**ビジネスルール検証**:
1. ユーザの現在貸出数 < 3
2. 書籍の available_stock > 0
3. 同一書籍を重複して借りていない

**レスポンス例（成功）**:
```json
{
  "success": true,
  "data": {
    "loan": {
      "id": 10,
      "user_id": 2,
      "book_id": 2,
      "loan_date": "2025-01-11T16:00:00.000Z",
      "due_date": "2025-01-25T16:00:00.000Z",
      "status": "borrowed"
    }
  },
  "message": "書籍を借りました。返却期限: 2025-01-25"
}
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "LOAN_LIMIT_EXCEEDED",
    "message": "貸出上限（3冊）に達しています",
    "details": {
      "current_loans": 3,
      "max_loans": 3
    }
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "BOOK_NOT_AVAILABLE",
    "message": "この書籍は現在貸出中です",
    "details": {
      "available_stock": 0
    }
  }
}
```

---

### 5.4 書籍を返却する
**エンドポイント**: `PUT /api/loans/:id/return`
**認証**: 必要

**レスポンス例（成功）**:
```json
{
  "success": true,
  "data": {
    "loan": {
      "id": 10,
      "book_id": 2,
      "loan_date": "2025-01-11T16:00:00.000Z",
      "due_date": "2025-01-25T16:00:00.000Z",
      "return_date": "2025-01-20T10:00:00.000Z",
      "status": "returned",
      "was_overdue": false
    }
  },
  "message": "書籍を返却しました"
}
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "LOAN_NOT_FOUND",
    "message": "貸出記録が見つかりません"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "LOAN_ALREADY_RETURNED",
    "message": "この書籍は既に返却済みです"
  }
}
```

---

### 5.5 延滞書籍一覧（管理者）
**エンドポイント**: `GET /api/loans/overdue`
**認証**: 必要（管理者のみ）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "overdue_loans": [
      {
        "id": 3,
        "user": {
          "id": 4,
          "username": "user3",
          "email": "user3@company.local"
        },
        "book": {
          "id": 5,
          "title": "人月の神話",
          "author": "Frederick P. Brooks Jr."
        },
        "loan_date": "2024-12-20T09:00:00.000Z",
        "due_date": "2025-01-03T09:00:00.000Z",
        "days_overdue": 8,
        "status": "overdue"
      }
    ],
    "summary": {
      "total_overdue": 1,
      "total_overdue_users": 1
    }
  }
}
```

---

## 6. カテゴリ管理API（/api/categories）

### 6.1 カテゴリ一覧取得
**エンドポイント**: `GET /api/categories`
**認証**: 必要

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "技術書",
        "count": 35
      },
      {
        "name": "ビジネス書",
        "count": 12
      },
      {
        "name": "小説",
        "count": 8
      }
    ]
  }
}
```

---

## 7. 統計API（/api/stats）

### 7.1 システム統計取得
**エンドポイント**: `GET /api/stats`
**認証**: 必要（管理者のみ）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 25,
      "active_borrowers": 12
    },
    "books": {
      "total": 150,
      "available": 98,
      "borrowed": 52
    },
    "loans": {
      "total_all_time": 850,
      "active": 52,
      "overdue": 3
    },
    "popular_books": [
      {
        "book_id": 2,
        "title": "Clean Code",
        "loan_count": 45
      }
    ]
  }
}
```

---

## 8. エラーコード一覧

| コード | 意味 | HTTPステータス |
|--------|------|----------------|
| VALIDATION_ERROR | バリデーションエラー | 400 |
| INVALID_CREDENTIALS | ログイン失敗 | 401 |
| UNAUTHORIZED | 認証が必要 | 401 |
| FORBIDDEN | 権限不足 | 403 |
| NOT_FOUND | リソースが存在しない | 404 |
| USERNAME_ALREADY_EXISTS | ユーザ名重複 | 409 |
| EMAIL_ALREADY_EXISTS | メール重複 | 409 |
| ISBN_ALREADY_EXISTS | ISBN重複 | 409 |
| LOAN_LIMIT_EXCEEDED | 貸出上限超過 | 409 |
| BOOK_NOT_AVAILABLE | 書籍貸出不可 | 409 |
| BOOK_HAS_ACTIVE_LOANS | 書籍に貸出中あり | 409 |
| USER_HAS_ACTIVE_LOANS | ユーザに貸出中あり | 409 |
| LOAN_ALREADY_RETURNED | 既に返却済み | 409 |
| INTERNAL_SERVER_ERROR | サーバエラー | 500 |

---

## 9. テスト用cURLコマンド例

### ユーザ登録
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test1234",
    "email": "test@company.local"
  }'
```

### ログイン
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "testuser",
    "password": "test1234"
  }'
```

### 書籍一覧取得（認証後）
```bash
curl -X GET http://localhost:3000/api/books \
  -b cookies.txt
```

### 書籍を借りる
```bash
curl -X POST http://localhost:3000/api/loans \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "book_id": 2
  }'
```

### 自分の貸出中書籍取得
```bash
curl -X GET http://localhost:3000/api/loans/my-loans \
  -b cookies.txt
```

### 返却
```bash
curl -X PUT http://localhost:3000/api/loans/10/return \
  -b cookies.txt
```

---

## 10. セキュリティ考慮事項

### 10.1 認証
- すべてのAPIは `/api/auth/register`, `/api/auth/login` 以外認証必須
- セッションタイムアウト: 30分（アクティビティで延長）
- パスワードハッシュ: bcrypt（salt rounds: 10）

### 10.2 CORS設定
```javascript
// 開発環境
{
  origin: 'http://localhost:5173',
  credentials: true
}

// 本番環境
{
  origin: 'http://library.company.local',
  credentials: true
}
```

### 10.3 レート制限
- ログインエンドポイント: 5回/分/IP
- 一般API: 100回/分/ユーザ
- 管理者API: 200回/分/ユーザ

### 10.4 入力検証
- すべてのリクエストボディをバリデーション
- SQLインジェクション対策: Prepared Statements使用
- XSS対策: 入力サニタイゼーション

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Software Architect Agent
