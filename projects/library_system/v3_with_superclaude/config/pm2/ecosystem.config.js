/**
 * 図書貸出システム PM2設定ファイル
 * 用途: Node.jsアプリケーションのプロセス管理
 * 配置先: /opt/library/config/pm2/ecosystem.config.js
 * 起動方法: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [
    {
      // アプリケーション名
      name: 'library-api',

      // 起動スクリプト
      script: '/opt/library/app/server/src/server.js',

      // インスタンス数 (CPUコア数に応じて調整)
      instances: 2,

      // 実行モード (cluster: 複数インスタンス, fork: 単一インスタンス)
      exec_mode: 'cluster',

      // ウォッチモード (本番環境では無効化)
      watch: false,

      // メモリ上限でのリスタート
      max_memory_restart: '500M',

      // 環境変数 (本番環境)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        DATABASE_PATH: '/opt/library/data/library.db',
        LOG_LEVEL: 'info',
        LOG_FILE: '/opt/library/logs/app/combined.log',
        ERROR_LOG_FILE: '/opt/library/logs/app/error.log'
      },

      // 環境変数 (ステージング環境)
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        HOST: '127.0.0.1',
        DATABASE_PATH: '/opt/library/data/library-staging.db',
        LOG_LEVEL: 'debug'
      },

      // ログ設定
      error_file: '/opt/library/logs/pm2/library-api-error.log',
      out_file: '/opt/library/logs/pm2/library-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 自動リスタート設定
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // Graceful shutdown
      listen_timeout: 3000,
      kill_timeout: 5000,

      // クラスタ設定
      wait_ready: true,
      instance_var: 'INSTANCE_ID',

      // エラー時の再起動間隔
      exp_backoff_restart_delay: 100,

      // Node.js実行オプション
      node_args: '--max-old-space-size=512',

      // 環境変数ファイル
      env_file: '/opt/library/app/server/.env.production',

      // Cron再起動 (毎日午前3時にリロード)
      cron_restart: '0 3 * * *',

      // インタープリタ
      interpreter: 'node',

      // 起動遅延 (クラスタの順次起動)
      increment_var: 'PORT',

      // ソースマップサポート
      source_map_support: false,

      // PM2プラス連携 (オプショナル)
      pmx: true,

      // 自動ダンプ
      autodump: true
    }
  ],

  // デプロイ設定 (オプショナル)
  deploy: {
    production: {
      user: 'library',
      host: 'library-server',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/library-system.git',
      path: '/opt/library/app',
      'post-deploy': 'cd server && npm ci --production && pm2 reload ecosystem.config.js --env production'
    },
    staging: {
      user: 'library',
      host: 'library-staging',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/library-system.git',
      path: '/opt/library/app',
      'post-deploy': 'cd server && npm ci --production && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
