const { Client } = require('ssh2');
const fs = require('fs').promises;

async function testConnection() {
    const privateKey = await fs.readFile('../dev-environment/sample-data/log_collector_key', 'utf8');
    
    console.log('Private key loaded, length:', privateKey.length);
    console.log('First 50 chars:', privateKey.substring(0, 50));
    
    const conn = new Client();
    
    conn.on('ready', () => {
        console.log('✅ SSH connection successful!');
        conn.end();
    }).on('error', (err) => {
        console.log('❌ SSH error:', err.message);
        console.log('Error level:', err.level);
    }).connect({
        host: 'localhost',
        port: 5001,
        username: 'logcollector',
        privateKey: privateKey,
        debug: (info) => console.log('DEBUG:', info)
    });
}

testConnection().catch(console.error);
