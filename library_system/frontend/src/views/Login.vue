<template>
  <div class="login-page">
    <div class="login-container">
      <div class="card">
        <h1>図書貸出管理システム</h1>
        <h2>ログイン</h2>

        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="userId">ユーザーID</label>
            <input
              type="text"
              id="userId"
              v-model="userId"
              required
              placeholder="ユーザーIDを入力"
            />
          </div>

          <div class="form-group">
            <label for="password">パスワード</label>
            <input
              type="password"
              id="password"
              v-model="password"
              required
              placeholder="パスワードを入力"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
            {{ loading ? 'ログイン中...' : 'ログイン' }}
          </button>
        </form>

        <div class="register-link">
          アカウントをお持ちでない方は
          <router-link to="/register">こちら</router-link>
        </div>

        <div class="demo-accounts">
          <h3>デモアカウント</h3>
          <p><strong>管理者:</strong> ID: admin / パスワード: admin123</p>
          <p><strong>一般ユーザー:</strong> ID: tanaka / パスワード: user123</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authAPI } from '../services/api';

export default {
  name: 'Login',
  data() {
    return {
      userId: '',
      password: '',
      error: '',
      loading: false
    };
  },
  methods: {
    async handleLogin() {
      this.error = '';
      this.loading = true;

      try {
        const response = await authAPI.login(this.userId, this.password);

        if (response.data.success) {
          // ログイン成功
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user', JSON.stringify(response.data.user));
          this.$router.push('/dashboard');
        }
      } catch (err) {
        this.error = err.response?.data?.message || 'ログインに失敗しました。';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  width: 100%;
  max-width: 450px;
  padding: 20px;
}

.card {
  padding: 40px;
}

h1 {
  color: var(--primary-color);
  font-size: 24px;
  margin-bottom: 10px;
  text-align: center;
}

h2 {
  font-size: 20px;
  margin-bottom: 30px;
  text-align: center;
  color: var(--text-dark);
}

.btn-block {
  width: 100%;
  margin-top: 20px;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.register-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover {
  text-decoration: underline;
}

.demo-accounts {
  margin-top: 30px;
  padding: 15px;
  background-color: var(--bg-light);
  border-radius: 5px;
  font-size: 13px;
}

.demo-accounts h3 {
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--text-dark);
}

.demo-accounts p {
  margin: 5px 0;
  color: #666;
}
</style>
