<template>
  <div>
    <NavBar />
    <div class="container">
      <h1>貸出管理（管理者）</h1>

      <div class="tabs">
        <button
          @click="currentTab = 'all'"
          :class="{ active: currentTab === 'all' }"
          class="tab-btn"
        >
          全貸出記録
        </button>
        <button
          @click="currentTab = 'overdue'"
          :class="{ active: currentTab === 'overdue' }"
          class="tab-btn"
        >
          期限切れ ({{ overdueLoans.length }})
        </button>
      </div>

      <div v-if="loading" class="loading">読み込み中...</div>

      <!-- 全貸出記録 -->
      <div v-if="currentTab === 'all' && !loading" class="card">
        <h2>全貸出記録</h2>

        <div v-if="allLoans.length === 0" class="empty-state">
          貸出記録がありません。
        </div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>ユーザーID</th>
              <th>氏名</th>
              <th>書籍ID</th>
              <th>タイトル</th>
              <th>貸出日</th>
              <th>返却期限</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="loan in allLoans" :key="loan.id">
              <td>{{ loan.user_id }}</td>
              <td>{{ loan.user_name }}</td>
              <td>{{ loan.book_id }}</td>
              <td>{{ loan.title }}</td>
              <td>{{ formatDate(loan.borrowed_at) }}</td>
              <td>{{ formatDate(loan.due_date) }}</td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'badge-success': loan.status === 'returned',
                    'badge-warning': loan.status === 'active' && !isOverdue(loan.due_date),
                    'badge-danger': loan.status === 'active' && isOverdue(loan.due_date)
                  }"
                >
                  {{
                    loan.status === 'returned'
                      ? '返却済み'
                      : isOverdue(loan.due_date)
                      ? '期限切れ'
                      : '貸出中'
                  }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 期限切れ -->
      <div v-if="currentTab === 'overdue' && !loading" class="card">
        <h2>期限切れ一覧</h2>

        <div v-if="overdueLoans.length === 0" class="empty-state">
          期限切れの貸出はありません。
        </div>

        <div v-else>
          <div class="alert alert-warning">
            {{ overdueLoans.length }} 件の期限切れがあります。
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>ユーザーID</th>
                <th>氏名</th>
                <th>書籍ID</th>
                <th>タイトル</th>
                <th>返却期限</th>
                <th>超過日数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="loan in overdueLoans" :key="loan.id">
                <td>{{ loan.user_id }}</td>
                <td>{{ loan.user_name }}</td>
                <td>{{ loan.book_id }}</td>
                <td>{{ loan.title }}</td>
                <td>{{ formatDate(loan.due_date) }}</td>
                <td class="overdue-days">{{ getOverdueDays(loan.due_date) }} 日</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NavBar from '../components/NavBar.vue';
import { loanAPI } from '../services/api';

export default {
  name: 'AdminLoans',
  components: {
    NavBar
  },
  data() {
    return {
      currentTab: 'all',
      allLoans: [],
      overdueLoans: [],
      loading: false
    };
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      this.loading = true;
      try {
        const [allRes, overdueRes] = await Promise.all([
          loanAPI.getAllLoans(),
          loanAPI.getOverdue()
        ]);

        this.allLoans = allRes.data.loans;
        this.overdueLoans = overdueRes.data.overdueLoans;
      } catch (err) {
        console.error('データ取得エラー:', err);
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ja-JP');
    },
    isOverdue(dueDateStr) {
      const dueDate = new Date(dueDateStr);
      const now = new Date();
      return dueDate < now;
    },
    getOverdueDays(dueDateStr) {
      const dueDate = new Date(dueDateStr);
      const now = new Date();
      const diffTime = now - dueDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
  }
};
</script>

<style scoped>
h1 {
  margin-bottom: 30px;
}

h2 {
  margin-bottom: 20px;
  font-size: 18px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #666;
  transition: all 0.3s;
}

.tab-btn:hover {
  color: var(--primary-color);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.overdue-days {
  color: var(--danger-color);
  font-weight: 600;
}
</style>
