const bcrypt = require('bcrypt');
const database = require('./src/config/database');
const User = require('./src/models/User');

async function testLogin() {
    try {
        await database.connect();

        console.log('=== データベース内のユーザー確認 ===');
        const users = await database.all('SELECT user_id, name, is_admin FROM users');
        console.log('ユーザー一覧:', users);

        console.log('\n=== パスワードハッシュの検証 ===');

        // adminユーザーのパスワードハッシュを確認
        const adminUser = await database.get('SELECT * FROM users WHERE user_id = ?', ['admin']);
        console.log('adminユーザー:', adminUser ? '存在する' : '存在しない');

        if (adminUser) {
            console.log('保存されているハッシュ:', adminUser.password_hash);

            // パスワードの検証
            const passwords = ['admin123', 'password', 'admin'];
            for (const pass of passwords) {
                const isValid = await bcrypt.compare(pass, adminUser.password_hash);
                console.log(`パスワード "${pass}": ${isValid ? '✓ 一致' : '✗ 不一致'}`);
            }

            // 正しいハッシュを生成
            console.log('\n=== 正しいパスワードハッシュの生成 ===');
            const correctHash = await bcrypt.hash('admin123', 10);
            console.log('admin123のハッシュ:', correctHash);
        }

        // User.verifyPasswordメソッドのテスト
        console.log('\n=== User.verifyPasswordメソッドのテスト ===');
        const verifiedUser = await User.verifyPassword('admin', 'admin123');
        console.log('認証結果:', verifiedUser ? '成功' : '失敗');

        await database.close();
    } catch (err) {
        console.error('エラー:', err);
        process.exit(1);
    }
}

testLogin();
