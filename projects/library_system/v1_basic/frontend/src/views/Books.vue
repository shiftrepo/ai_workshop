<template>
  <div>
    <NavBar />
    <div class="container">
      <h1>書籍一覧</h1>

      <div class="card">
        <div class="search-bar">
          <input
            type="text"
            v-model="searchKeyword"
            placeholder="書籍名で検索..."
            @input="handleSearch"
            class="search-input"
          />
          <button @click="loadBooks" class="btn btn-secondary">すべて表示</button>
        </div>
      </div>

      <div v-if="loading" class="loading">読み込み中...</div>

      <div v-if="message" class="alert" :class="messageType">
        {{ message }}
      </div>

      <div v-if="!loading && books.length === 0" class="card">
        <div class="empty-state">書籍が見つかりませんでした。</div>
      </div>

      <div v-else class="books-list">
        <div v-for="book in books" :key="book.id" class="book-item card">
          <div class="book-info">
            <div class="book-header">
              <h3>{{ book.title }}</h3>
              <span
                class="badge"
                :class="book.status === 'available' ? 'badge-success' : 'badge-warning'"
              >
                {{ book.status === 'available' ? '利用可能' : '貸出中' }}
              </span>
            </div>
            <div class="book-details">
              <p><strong>著者:</strong> {{ book.author }}</p>
              <p><strong>ISBN:</strong> {{ book.isbn || 'なし' }}</p>
              <p><strong>書籍ID:</strong> {{ book.book_id }}</p>
            </div>
          </div>
          <div class="book-actions">
            <button
              v-if="book.status === 'available'"
              @click="borrowBook(book.book_id)"
              class="btn btn-primary"
              :disabled="borrowing"
            >
              借りる
            </button>
            <button
              v-else
              @click="viewBookStatus(book.book_id)"
              class="btn btn-secondary"
            >
              状況確認
            </button>
          </div>
        </div>
      </div>

      <!-- 書籍状況モーダル -->
      <div v-if="showModal" class="modal" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>書籍状況</h2>
            <button @click="closeModal" class="close-btn">&times;</button>
          </div>
          <div v-if="bookStatus" class="modal-body">
            <p><strong>タイトル:</strong> {{ bookStatus.book.title }}</p>
            <p><strong>著者:</strong> {{ bookStatus.book.author }}</p>
            <p><strong>状態:</strong> {{ bookStatus.book.status === 'available' ? '利用可能' : '貸出中' }}</p>
            <div v-if="bookStatus.loanInfo">
              <hr />
              <p><strong>借用者:</strong> {{ bookStatus.loanInfo.borrowedBy }}</p>
              <p><strong>貸出日:</strong> {{ formatDate(bookStatus.loanInfo.borrowedAt) }}</p>
              <p><strong>返却期限:</strong> {{ formatDate(bookStatus.loanInfo.dueDate) }}</p>
              <p v-if="bookStatus.loanInfo.isOverdue" class="overdue-text">
                ※ 返却期限を過ぎています
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NavBar from '../components/NavBar.vue';
import { bookAPI, loanAPI, statusAPI } from '../services/api';

export default {
  name: 'Books',
  components: {
    NavBar
  },
  data() {
    return {
      books: [],
      loading: false,
      borrowing: false,
      searchKeyword: '',
      message: '',
      messageType: '',
      showModal: false,
      bookStatus: null
    };
  },
  async mounted() {
    await this.loadBooks();
  },
  methods: {
    async loadBooks() {
      this.loading = true;
      this.searchKeyword = '';
      try {
        const response = await bookAPI.getAll();
        this.books = response.data.books;
      } catch (err) {
        this.showMessage('書籍の読み込みに失敗しました。', 'alert-error');
      } finally {
        this.loading = false;
      }
    },
    async handleSearch() {
      if (!this.searchKeyword.trim()) {
        return;
      }

      this.loading = true;
      try {
        const response = await bookAPI.search(this.searchKeyword);
        this.books = response.data.books;
      } catch (err) {
        this.showMessage('検索に失敗しました。', 'alert-error');
      } finally {
        this.loading = false;
      }
    },
    async borrowBook(bookId) {
      if (!confirm('この書籍を借りますか？')) {
        return;
      }

      this.borrowing = true;
      try {
        const response = await loanAPI.borrow(bookId);
        this.showMessage(response.data.message, 'alert-success');
        await this.loadBooks();
      } catch (err) {
        this.showMessage(
          err.response?.data?.message || '貸出処理に失敗しました。',
          'alert-error'
        );
      } finally {
        this.borrowing = false;
      }
    },
    async viewBookStatus(bookId) {
      try {
        const response = await statusAPI.getBookStatus(bookId);
        this.bookStatus = response.data;
        this.showModal = true;
      } catch (err) {
        this.showMessage('状況の取得に失敗しました。', 'alert-error');
      }
    },
    closeModal() {
      this.showModal = false;
      this.bookStatus = null;
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

.search-bar {
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 14px;
}

.books-list {
  display: grid;
  gap: 15px;
}

.book-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.book-info {
  flex: 1;
}

.book-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.book-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-dark);
}

.book-details p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.book-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* モーダル */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: var(--text-dark);
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 10px 0;
}

.modal-body hr {
  margin: 20px 0;
  border: none;
  border-top: 1px solid var(--border-color);
}

.overdue-text {
  color: var(--danger-color);
  font-weight: 600;
}
</style>
