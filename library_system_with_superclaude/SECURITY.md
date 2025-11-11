# セキュリティ設計書

## 1. 認証・セッション管理アーキテクチャ

### 1.1 認証方式
**Cookie-based Session（express-session）**

社内システムの特性を考慮し、シンプルで安全なCookieセッション方式を採用。

**選定理由**:
- 社内ネットワーク限定でシンプルな実装が可能
- Cookieの自動送信でフロントエンド実装が容易
- express-sessionの成熟したエコシステム

**代替案**:
- JWT: マイクロサービス構成やモバイルアプリ対応時に検討
- OAuth2.0: 外部サービス連携時に検討

---

### 1.2 セッション管理フロー

```
┌─────────────────────────────────────────────────────────┐
│                   Authentication Flow                    │
└─────────────────────────────────────────────────────────┘

[1] ログインリクエスト
     ↓
[2] ユーザ認証（username + password）
     ├─ usersテーブルから username でユーザ検索
     ├─ bcrypt.compare(password, password_hash)
     └─ 検証成功 → [3]へ、失敗 → 401エラー
     ↓
[3] セッション生成
     ├─ express-session がセッションIDを生成
     ├─ セッションストアにユーザ情報を保存
     │   - session.user = { id, username, role }
     └─ Set-Cookie ヘッダーでクライアントに送信
     ↓
[4] Cookie保存（ブラウザ）
     ├─ HttpOnly: JavaScriptからアクセス不可（XSS対策）
     ├─ SameSite=Strict: CSRF対策
     └─ Secure: HTTPS時のみ送信（本番環境）
     ↓
[5] 後続リクエスト
     ├─ ブラウザが自動的にCookieを送信
     ├─ authMiddleware がセッション検証
     └─ req.session.user が存在すれば認証成功
```

---

### 1.3 セッション設定

**express-session設定**:
```javascript
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './data'
  }),
  secret: process.env.SESSION_SECRET, // 環境変数から読み込み
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,          // XSS対策
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
    sameSite: 'strict',      // CSRF対策
    maxAge: 1800000          // 30分（ミリ秒）
  },
  name: 'sessionId',         // デフォルトのconnect.sidから変更
  rolling: true              // リクエスト毎にmaxAgeをリセット
}));
```

**セッションストレージ**:
- 開発環境: メモリストア（MemoryStore）
- 本番環境: SQLiteStore（`sessions.db`）

**セッションデータ構造**:
```javascript
{
  sessionId: "s%3A...",
  cookie: {
    expires: "2025-01-11T17:00:00.000Z",
    httpOnly: true,
    secure: true,
    sameSite: "strict"
  },
  user: {
    id: 2,
    username: "user1",
    role: "user"
  }
}
```

---

## 2. 認証ミドルウェア

### 2.1 認証チェックミドルウェア

**server/src/middleware/auth.js**:
```javascript
// セッション認証を確認
exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です。ログインしてください。'
      }
    });
  }

  // req.user にユーザ情報を設定（後続処理で使用）
  req.user = req.session.user;
  next();
};

// 管理者権限チェック
exports.requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です。'
      }
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '管理者権限が必要です。'
      }
    });
  }

  req.user = req.session.user;
  next();
};

// 自分の情報または管理者のみアクセス可能
exports.requireOwnerOrAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '認証が必要です。'
      }
    });
  }

  const userId = parseInt(req.params.id);
  const currentUser = req.session.user;

  if (currentUser.id !== userId && currentUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'アクセス権限がありません。'
      }
    });
  }

  req.user = currentUser;
  next();
};
```

### 2.2 ルーティングでの使用例

```javascript
const { requireAuth, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

// 全ユーザアクセス可能
router.get('/books', requireAuth, bookController.list);

// 管理者のみ
router.post('/books', requireAdmin, bookController.create);
router.delete('/books/:id', requireAdmin, bookController.delete);

// 自分または管理者のみ
router.get('/users/:id', requireOwnerOrAdmin, userController.getById);
router.put('/users/:id', requireOwnerOrAdmin, userController.update);
```

---

## 3. パスワードセキュリティ

### 3.1 パスワードハッシュ化

**bcryptの使用**:
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// パスワードハッシュ化（ユーザ登録時）
exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// パスワード検証（ログイン時）
exports.verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

**bcryptの特徴**:
- ソルト自動生成（レインボーテーブル攻撃対策）
- 計算コスト調整可能（SALT_ROUNDS）
- 時間的攻撃耐性（constant-time comparison）

### 3.2 パスワードポリシー

**バリデーション要件**:
- 最小長: 8文字
- 含む文字種: 英字と数字を少なくとも1つずつ
- 禁止: ユーザ名と同一、一般的な弱いパスワード

**実装例**:
```javascript
exports.validatePassword = (password, username) => {
  // 長さチェック
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上必要です' };
  }

  // 英字と数字を含むかチェック
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: 'パスワードは英字と数字を含む必要があります' };
  }

  // ユーザ名と同一チェック
  if (password.toLowerCase() === username.toLowerCase()) {
    return { valid: false, message: 'パスワードにユーザ名を使用できません' };
  }

  // 弱いパスワードチェック
  const weakPasswords = ['password', '12345678', 'admin123'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'このパスワードは使用できません' };
  }

  return { valid: true };
};
```

---

## 4. 主要な脅威と対策

### 4.1 SQLインジェクション対策

**脅威**: 悪意のあるSQL文を注入し、データベースを不正操作

**対策**:
- **Prepared Statements（パラメータ化クエリ）使用**

```javascript
// ❌ 脆弱なコード（SQLインジェクションの危険）
const username = req.body.username;
db.run(`SELECT * FROM users WHERE username = '${username}'`);

// ✅ 安全なコード（Prepared Statements）
const username = req.body.username;
db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
  // 処理
});
```

**SQLiteでのプレースホルダー**:
- `?`: 位置ベース
- `$name`, `@name`, `:name`: 名前付き

---

### 4.2 XSS（クロスサイトスクリプティング）対策

**脅威**: 悪意のあるスクリプトを埋め込み、他のユーザに実行させる

**対策**:
1. **Vue.jsの自動エスケープ機能**
   - `{{ variable }}` は自動的にHTMLエスケープ
   - `v-html` は使用しない（信頼できる入力のみ）

2. **HTTPOnly Cookie**
   - セッションCookieにHTTPOnly属性を設定
   - JavaScriptからのアクセス不可

3. **Content Security Policy (CSP) ヘッダー**
```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

---

### 4.3 CSRF（クロスサイトリクエストフォージェリ）対策

**脅威**: ユーザが意図しない操作を実行させる攻撃

**対策**:
1. **SameSite Cookie属性**
```javascript
cookie: {
  sameSite: 'strict'  // クロスサイトリクエストでCookieを送信しない
}
```

2. **CSRFトークン（追加セキュリティ）**
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// 状態変更操作（POST, PUT, DELETE）に適用
app.post('/api/loans', csrfProtection, loanController.create);
```

**フロントエンドでの送信**:
```javascript
// CSRFトークンを取得してリクエストヘッダーに含める
axios.post('/api/loans', data, {
  headers: {
    'CSRF-Token': csrfToken
  }
});
```

---

### 4.4 認証総当たり攻撃対策

**脅威**: パスワードを総当たりで試行

**対策**:
1. **レート制限（express-rate-limit）**
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1分
  max: 5,                    // 最大5回
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'ログイン試行が多すぎます。しばらくしてから再試行してください。'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

2. **アカウントロックアウト**
```javascript
// 5回失敗でアカウント一時ロック（10分間）
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 10 * 60 * 1000; // 10分

// usersテーブルに追加
// login_attempts INTEGER DEFAULT 0
// locked_until TEXT
```

---

### 4.5 セッション固定攻撃対策

**脅威**: 攻撃者が事前に知っているセッションIDを使わせる

**対策**:
1. **ログイン成功時にセッションIDを再生成**
```javascript
exports.login = async (req, res) => {
  const { username, password } = req.body;

  // ユーザ認証
  const user = await userService.authenticate(username, password);

  if (user) {
    // セッションIDを再生成（セッション固定攻撃対策）
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Session error' });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ success: false, error: 'Session save error' });
        }

        res.json({
          success: true,
          data: { user },
          message: 'ログインしました'
        });
      });
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'ユーザ名またはパスワードが正しくありません'
      }
    });
  }
};
```

2. **ログアウト時にセッション破棄**
```javascript
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }

    res.clearCookie('sessionId');
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
};
```

---

### 4.6 セッションハイジャック対策

**脅威**: セッションIDを盗み、他人になりすます

**対策**:
1. **HTTPS使用（本番環境）**
```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production'  // HTTPS時のみCookieを送信
}
```

2. **User-Agent検証（追加セキュリティ）**
```javascript
// セッション作成時にUser-Agentを保存
req.session.userAgent = req.headers['user-agent'];

// 認証ミドルウェアで検証
exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // User-Agent検証
  if (req.session.userAgent !== req.headers['user-agent']) {
    req.session.destroy();
    return res.status(401).json({
      success: false,
      error: {
        code: 'SESSION_INVALID',
        message: 'セッションが無効です。再ログインしてください。'
      }
    });
  }

  req.user = req.session.user;
  next();
};
```

---

## 5. 入力検証とサニタイゼーション

### 5.1 バリデーションミドルウェア

**express-validator使用**:
```javascript
const { body, validationResult } = require('express-validator');

// ユーザ登録バリデーション
exports.validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('ユーザ名は3-20文字で入力してください')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('ユーザ名は英数字とアンダースコアのみ使用できます'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上必要です')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('パスワードは英字と数字を含む必要があります'),

  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力内容に誤りがあります',
          details: errors.array()
        }
      });
    }
    next();
  }
];

// ルーティングで使用
router.post('/register', validateRegister, authController.register);
```

### 5.2 サニタイゼーション

**文字列サニタイゼーション**:
```javascript
const validator = require('validator');

// HTMLタグ除去
const sanitizedInput = validator.escape(userInput);

// トリム
const trimmedInput = validator.trim(userInput);
```

---

## 6. ロギングと監査

### 6.1 セキュリティイベントログ

**winston使用**:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// セキュリティイベント記録
exports.logSecurityEvent = (event, userId, details) => {
  logger.warn({
    type: 'SECURITY_EVENT',
    event: event,
    userId: userId,
    details: details,
    timestamp: new Date().toISOString()
  });
};

// 使用例
// ログイン失敗
logSecurityEvent('LOGIN_FAILED', null, { username: req.body.username, ip: req.ip });

// 権限エラー
logSecurityEvent('UNAUTHORIZED_ACCESS', req.user.id, { path: req.path, ip: req.ip });
```

### 6.2 監査ログ

**記録対象**:
- ログイン/ログアウト
- ユーザ作成/削除
- 書籍登録/削除
- 管理者操作
- 権限エラー

---

## 7. セキュリティヘッダー

### 7.1 helmet使用

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
  },
  hsts: {
    maxAge: 31536000,  // 1年
    includeSubDomains: true
  }
}));
```

**設定されるヘッダー**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## 8. 環境変数管理

### 8.1 .envファイル

**server/.env.example**:
```
NODE_ENV=development
PORT=3000
SESSION_SECRET=CHANGE_THIS_IN_PRODUCTION_TO_A_RANDOM_STRING
DATABASE_PATH=./data/library.db
SESSIONS_DB_PATH=./data/sessions.db
LOG_LEVEL=info

# 本番環境では必ず変更
# SESSION_SECRET=$(openssl rand -base64 32)
```

**dotenv使用**:
```javascript
require('dotenv').config();

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'CHANGE_THIS_IN_PRODUCTION') {
  console.error('SESSION_SECRET must be set in production');
  process.exit(1);
}
```

---

## 9. データベースセキュリティ

### 9.1 ファイルパーミッション

```bash
# SQLiteファイルの権限設定
chmod 600 library.db sessions.db

# ディレクトリ権限
chmod 700 data/
```

### 9.2 バックアップとリストア

```bash
# 暗号化バックアップ（GPG使用）
sqlite3 library.db ".backup - " | gpg -c > library_backup_$(date +%Y%m%d).db.gpg

# リストア
gpg -d library_backup_YYYYMMDD.db.gpg | sqlite3 library.db
```

---

## 10. セキュリティチェックリスト

### デプロイ前の確認項目

- [ ] SESSION_SECRET を強力なランダム文字列に変更
- [ ] 本番環境で `NODE_ENV=production` 設定
- [ ] Cookie の `secure: true` 設定（HTTPS環境）
- [ ] デフォルト管理者パスワード変更
- [ ] データベースファイルのパーミッション確認（600）
- [ ] ログファイルのローテーション設定
- [ ] レート制限の動作確認
- [ ] CORS設定の確認（許可するオリジン）
- [ ] CSRFトークン検証の有効化
- [ ] エラーメッセージに機密情報が含まれないか確認
- [ ] SQLクエリがすべてPrepared Statementsか確認
- [ ] セキュリティヘッダーの設定確認

---

**作成日**: 2025-01-11
**バージョン**: 1.0
**著者**: Software Architect Agent
