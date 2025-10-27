<template>
  <nav class="navbar">
    <div class="container nav-container">
      <div class="nav-brand">
        <router-link to="/dashboard">図書貸出管理システム</router-link>
      </div>

      <div class="nav-menu">
        <router-link to="/dashboard" class="nav-link">ダッシュボード</router-link>
        <router-link to="/books" class="nav-link">書籍一覧</router-link>
        <router-link to="/my-loans" class="nav-link">貸出状況</router-link>

        <div v-if="user?.isAdmin" class="nav-dropdown">
          <span class="nav-link">管理者</span>
          <div class="dropdown-content">
            <router-link to="/admin/books">書籍管理</router-link>
            <router-link to="/admin/loans">貸出管理</router-link>
          </div>
        </div>

        <div class="nav-user">
          <span class="user-name">{{ user?.name || 'ゲスト' }}</span>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">ログアウト</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { authAPI } from '../services/api';

export default {
  name: 'NavBar',
  data() {
    return {
      user: null
    };
  },
  mounted() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    }
  },
  methods: {
    async handleLogout() {
      try {
        await authAPI.logout();
      } catch (err) {
        console.error('ログアウトエラー:', err);
      } finally {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        this.$router.push('/login');
      }
    }
  }
};
</script>

<style scoped>
.navbar {
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 15px 0;
  margin-bottom: 20px;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand a {
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
  text-decoration: none;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  color: var(--text-dark);
  text-decoration: none;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 5px;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: var(--bg-light);
}

.nav-link.router-link-active {
  color: var(--primary-color);
  background-color: var(--bg-light);
}

.nav-dropdown {
  position: relative;
}

.nav-dropdown:hover .dropdown-content {
  display: block;
}

.dropdown-content {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  min-width: 160px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  padding: 10px 0;
  z-index: 100;
}

.dropdown-content a {
  display: block;
  padding: 10px 20px;
  color: var(--text-dark);
  text-decoration: none;
  transition: background-color 0.3s;
}

.dropdown-content a:hover {
  background-color: var(--bg-light);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 15px;
  border-left: 1px solid var(--border-color);
  padding-left: 20px;
}

.user-name {
  font-weight: 500;
  color: var(--text-dark);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
</style>
