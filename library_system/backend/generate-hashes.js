const bcrypt = require('bcrypt');

async function generateHashes() {
    console.log('=== パスワードハッシュ生成 ===\n');

    const passwords = [
        { label: 'admin (admin123)', password: 'admin123' },
        { label: 'users (user123)', password: 'user123' }
    ];

    for (const item of passwords) {
        const hash = await bcrypt.hash(item.password, 10);
        console.log(`${item.label}:`);
        console.log(`パスワード: ${item.password}`);
        console.log(`ハッシュ: ${hash}`);
        console.log('');
    }
}

generateHashes();
