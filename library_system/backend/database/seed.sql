-- デモ用初期データ

-- アドミンユーザー (パスワード: admin123)
INSERT INTO users (user_id, password_hash, name, is_admin) VALUES
('admin', '$2b$10$DiNyfDWHsG8rUTnRYKxkWeyIzQS4Wp.uOQhgTmR.Srntn4N5U3UIq', '管理者', 1);

-- 一般ユーザー (パスワード: user123)
INSERT INTO users (user_id, password_hash, name, is_admin) VALUES
('tanaka', '$2b$10$qpPcAfG4jQFzF2LJlzVDDuPRf7oCG4y7/NO.nkd/fdV4yrUfiK/Aa', '田中太郎', 0),
('sato', '$2b$10$qpPcAfG4jQFzF2LJlzVDDuPRf7oCG4y7/NO.nkd/fdV4yrUfiK/Aa', '佐藤花子', 0),
('suzuki', '$2b$10$qpPcAfG4jQFzF2LJlzVDDuPRf7oCG4y7/NO.nkd/fdV4yrUfiK/Aa', '鈴木一郎', 0),
('yamada', '$2b$10$qpPcAfG4jQFzF2LJlzVDDuPRf7oCG4y7/NO.nkd/fdV4yrUfiK/Aa', '山田美咲', 0);

-- 書籍データ（10冊）
INSERT INTO books (book_id, title, author, isbn, status) VALUES
('BK001', 'リーダブルコード', 'Dustin Boswell', '9784873115658', 'available'),
('BK002', 'Clean Code', 'Robert C. Martin', '9784048930598', 'available'),
('BK003', 'プログラミング作法', 'Brian W. Kernighan', '9784048930581', 'available'),
('BK004', 'デザインパターン', 'Erich Gamma', '9784797311129', 'borrowed'),
('BK005', 'リファクタリング', 'Martin Fowler', '9784274050374', 'available'),
('BK006', 'アジャイルサムライ', 'Jonathan Rasmusson', '9784274068560', 'borrowed'),
('BK007', 'SQLアンチパターン', 'Bill Karwin', '9784873115894', 'available'),
('BK008', 'Webを支える技術', '山本陽平', '9784774142043', 'borrowed'),
('BK009', 'UIデザインの心理学', 'Jeff Johnson', '9784873116211', 'available'),
('BK010', 'テスト駆動開発', 'Kent Beck', '9784274217883', 'available');

-- サンプル貸出記録
INSERT INTO loans (user_id, book_id, borrowed_at, due_date, status) VALUES
('tanaka', 'BK004', datetime('now', '-5 days'), datetime('now', '+9 days'), 'active'),
('sato', 'BK006', datetime('now', '-10 days'), datetime('now', '+4 days'), 'active'),
('suzuki', 'BK008', datetime('now', '-3 days'), datetime('now', '+11 days'), 'active');
