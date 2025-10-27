<template>
  <div>
    <NavBar />
    <div class="container">
      <h1>貸出状況</h1>

      <div v-if="loading" class="loading">読み込み中...</div>

      <div v-if="message" class="alert" :class="messageType">
        {{ message }}
      </div>

      <div v-if="!loading" class="card">
        <div class="status-summary">
          <div class="summary-item">
            <span class="summary-label">現在の貸出:</span>
            <span class="summary-value">{{ myStatus?.activeLoans || 0 }} / 3 冊</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">残り枠:</span>
            <span class="summary-value">{{ myStatus?.remainingSlots || 3 }} 冊</span>
          </div>
        </div>
      </div>

      <div v-if="!loading && myStatus?.loans?.length === 0" class="card">
        <div class="empty-state">
          現在借りている書籍はありません。<br />
          <router-link to="/books">書籍一覧</router-link>から書籍を借りることができます。
        </div>
      </div>

      <div v-else-if="!loading" class="loans-list">
        <div v-for="loan in myStatus.loans" :key="loan.id" class="loan-item card">
          <div class="loan-info">
            <h3>{{ loan.title }}</h3>
            <div class="loan-details">
              <p><strong>著者:</strong> {{ loan.author }}</p>
              <p><strong>書籍ID:</strong> {{ loan.book_id }}</p>
              <p><strong>貸出日:</strong> {{ formatDate(loan.borrowed_at) }}</p>
              <p><strong>返却期限:</strong> {{ formatDate(loan.due_date) }}</p>
              <p>
                <strong>状態:</strong>
                <span v-if="loan.isOverdue" class="badge badge-danger">期限切れ</span>
                <span v-else-if="loan.daysUntilDue <= 3" class="badge badge-warning">
                  残り{{ loan.daysUntilDue }}日
                </span>
                <span v-else class="badge badge-success">貸出中</span>
              </p>
            </div>
          </div>
          <div class="loan-actions">
            <button
              @click="returnBook(loan.book_id)"
              class="btn btn-primary"
              :disabled="returning"
            >
              返却する
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NavBar from '../components/NavBar.vue';
import { statusAPI, loanAPI } from '../services/api';

export default {
  name: 'MyLoans',
  components: {
    NavBar
  },
  data() {
    return {
      myStatus: null,
      loading: false,
      returning: false,
      message: '',
      messageType: ''
    };
  },
  async mounted() {
    await this.loadStatus();
  },
  methods: {
    async loadStatus() {
      this.loading = true;
      try {
        const response = await statusAPI.getMyStatus();
        this.myStatus = response.data;
      } catch (err) {
        this.showMessage('状況の読み込みに失敗しました。', 'alert-error');
      } finally {
        this.loading = false;
      }
    },
    async returnBook(bookId) {
      if (!confirm('この書籍を返却しますか？')) {
        return;
      }

      this.returning = true;
      try {
        const response = await loanAPI.return(bookId);
        this.showMessage(response.data.message, 'alert-success');
        await this.loadStatus();
      } catch (err) {
        this.showMessage(
          err.response?.data?.message || '返却処理に失敗しました。',
          'alert-error'
        );
      } finally {
        this.returning = false;
      }
    },
    showMessage(text, type) {
      this.message = text;
      this.messageType = type;
      setTimeout(() => {
        this.message = '';
      }, 5000);
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
}

.status-summary {
  display: flex;
  gap: 40px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-label {
  font-weight: 500;
  color: #666;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  line-height: 1.8;
}

.empty-state a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.empty-state a:hover {
  text-decoration: underline;
}

.loans-list {
  display: grid;
  gap: 15px;
}

.loan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.loan-info {
  flex: 1;
}

.loan-info h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: var(--text-dark);
}

.loan-details p {
  margin: 8px 0;
  font-size: 14px;
  color: #666;
}

.loan-actions {
  display: flex;
  gap: 10px;
}
</style>
