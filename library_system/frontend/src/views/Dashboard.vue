<template>
  <div>
    <NavBar />
    <div class="container">
      <h1>ダッシュボード</h1>

      <div v-if="loading" class="loading">読み込み中...</div>

      <div v-else>
        <div class="stats-grid">
          <div class="stat-card card">
            <h3>現在の貸出</h3>
            <div class="stat-value">{{ myStatus?.activeLoans || 0 }} / 3 冊</div>
            <div class="stat-label">残り {{ myStatus?.remainingSlots || 3 }} 枠</div>
          </div>

          <div class="stat-card card">
            <h3>利用可能な書籍</h3>
            <div class="stat-value">{{ availableBooks?.length || 0 }} 冊</div>
          </div>

          <div v-if="user?.isAdmin" class="stat-card card">
            <h3>期限切れ</h3>
            <div class="stat-value overdue">{{ overdueCount }} 件</div>
          </div>
        </div>

        <!-- 現在借りている書籍 -->
        <div class="card">
          <h2>現在借りている書籍</h2>

          <div v-if="myStatus?.loans?.length === 0" class="empty-state">
            現在借りている書籍はありません。
          </div>

          <table v-else class="table">
            <thead>
              <tr>
                <th>書籍ID</th>
                <th>タイトル</th>
                <th>著者</th>
                <th>返却期限</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loan in myStatus.loans" :key="loan.id">
                <td>{{ loan.book_id }}</td>
                <td>{{ loan.title }}</td>
                <td>{{ loan.author }}</td>
                <td>{{ formatDate(loan.due_date) }}</td>
                <td>
                  <span v-if="loan.isOverdue" class="badge badge-danger">期限切れ</span>
                  <span v-else-if="loan.daysUntilDue <= 3" class="badge badge-warning">
                    残り{{ loan.daysUntilDue }}日
                  </span>
                  <span v-else class="badge badge-success">貸出中</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 新着書籍 -->
        <div class="card">
          <h2>利用可能な書籍</h2>
          <div class="books-grid">
            <div
              v-for="book in availableBooks?.slice(0, 6)"
              :key="book.id"
              class="book-card"
            >
              <div class="book-title">{{ book.title }}</div>
              <div class="book-author">{{ book.author }}</div>
              <div class="book-id">ID: {{ book.book_id }}</div>
            </div>
          </div>

          <div class="text-center" style="margin-top: 20px;">
            <router-link to="/books" class="btn btn-primary">すべての書籍を見る</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NavBar from '../components/NavBar.vue';
import { statusAPI, bookAPI, loanAPI } from '../services/api';

export default {
  name: 'Dashboard',
  components: {
    NavBar
  },
  data() {
    return {
      loading: true,
      user: null,
      myStatus: null,
      availableBooks: [],
      overdueCount: 0
    };
  },
  async mounted() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.user = JSON.parse(userStr);
    }
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const [statusRes, booksRes] = await Promise.all([
          statusAPI.getMyStatus(),
          bookAPI.getAvailable()
        ]);

        this.myStatus = statusRes.data;
        this.availableBooks = booksRes.data.books;

        // 管理者の場合、期限切れ情報も取得
        if (this.user?.isAdmin) {
          const overdueRes = await loanAPI.getOverdue();
          this.overdueCount = overdueRes.data.overdueLoans.length;
        }
      } catch (err) {
        console.error('データ取得エラー:', err);
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ja-JP');
    }
  }
};
</script>

<style scoped>
h1 {
  margin-bottom: 30px;
  color: var(--text-dark);
}

h2 {
  margin-bottom: 20px;
  font-size: 18px;
  color: var(--text-dark);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  text-align: center;
  padding: 30px;
}

.stat-card h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
  font-weight: 500;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 10px;
}

.stat-value.overdue {
  color: var(--danger-color);
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.book-card {
  background-color: var(--bg-light);
  padding: 15px;
  border-radius: 5px;
  border-left: 3px solid var(--primary-color);
}

.book-title {
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--text-dark);
}

.book-author {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.book-id {
  font-size: 12px;
  color: #999;
}

.text-center {
  text-align: center;
}
</style>
