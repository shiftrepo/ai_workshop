const fs = require('fs');
const path = require('path');
const database = require('./database');

async function initDatabase() {
    try {
        console.log('データベース初期化を開始します...');

        await database.connect();

        // スキーマ読み込みと実行
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        const statements = schema.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await database.run(statement);
            }
        }
        console.log('✓ スキーマを作成しました');

        // 初期データ読み込みと実行
        const seedPath = path.join(__dirname, '../../database/seed.sql');
        const seed = fs.readFileSync(seedPath, 'utf8');

        const seedStatements = seed.split(';').filter(stmt => stmt.trim());
        for (const statement of seedStatements) {
            if (statement.trim()) {
                try {
                    await database.run(statement);
                } catch (err) {
                    // 既存データの場合はスキップ
                    if (!err.message.includes('UNIQUE constraint failed')) {
                        throw err;
                    }
                }
            }
        }
        console.log('✓ 初期データを投入しました');

        console.log('\n初期化完了！');
        console.log('\n【デモアカウント情報】');
        console.log('管理者: ID=admin, パスワード=admin123');
        console.log('一般ユーザー: ID=tanaka/sato/suzuki/yamada, パスワード=user123');

        await database.close();
    } catch (err) {
        console.error('初期化エラー:', err);
        process.exit(1);
    }
}

// スクリプトとして直接実行された場合
if (require.main === module) {
    initDatabase();
}

module.exports = initDatabase;
