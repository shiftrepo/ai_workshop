<template>
  <div class="register-page">
    <div class="register-container">
      <div class="card">
        <h1>図書貸出管理システム</h1>
        <h2>新規登録</h2>

        <div v-if="error" class="alert alert-error">
          {{ error }}
        </div>

        <div v-if="success" class="alert alert-success">
          {{ success }}
        </div>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="userId">ユーザーID *</label>
            <input
              type="text"
              id="userId"
              v-model="userId"
              required
              minlength="3"
              placeholder="3文字以上"
            />
          </div>

          <div class="form-group">
            <label for="name">氏名 *</label>
            <input
              type="text"
              id="name"
              v-model="name"
              required
              placeholder="山田太郎"
            />
          </div>

          <div class="form-group">
            <label for="password">パスワード *</label>
            <input
              type="password"
              id="password"
              v-model="password"
              required
              minlength="6"
              placeholder="6文字以上"
            />
          </div>

          <div class="form-group">
            <label for="passwordConfirm">パスワード（確認） *</label>
            <input
              type="password"
              id="passwordConfirm"
              v-model="passwordConfirm"
              required
              placeholder="もう一度入力"
            />
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
            {{ loading ? '登録中...' : '登録' }}
          </button>
        </form>

        <div class="login-link">
          既にアカウントをお持ちの方は
          <router-link to="/login">こちら</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authAPI } from '../services/api';

export default {
  name: 'Register',
  data() {
    return {
      userId: '',
      name: '',
      password: '',
      passwordConfirm: '',
      error: '',
      success: '',
      loading: false
    };
  },
  methods: {
    async handleRegister() {
      this.error = '';
      this.success = '';

      // バリデーション
      if (this.password !== this.passwordConfirm) {
        this.error = 'パスワードが一致しません。';
        return;
      }

      this.loading = true;

      try {
        const response = await authAPI.register(this.userId, this.password, this.name);

        if (response.data.success) {
          this.success = '登録が完了しました。ログインページに移動します...';
          setTimeout(() => {
            this.$router.push('/login');
          }, 2000);
        }
      } catch (err) {
        this.error = err.response?.data?.message || '登録に失敗しました。';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-container {
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

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.login-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
