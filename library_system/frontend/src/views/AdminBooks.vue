<template>
  <div>
    <NavBar />
    <div class="container">
      <h1>書籍管理（管理者）</h1>

      <div class="card">
        <h2>新規書籍登録</h2>

        <div v-if="message" class="alert" :class="messageType">
          {{ message }}
        </div>

        <form @submit.prevent="addBook">
          <div class="form-row">
            <div class="form-group">
              <label for="bookId">書籍ID *</label>
              <input
                type="text"
                id="bookId"
                v-model="newBook.bookId"
                required
                placeholder="BK011"
              />
            </div>

            <div class="form-group">
              <label for="title">タイトル *</label>
              <input
                type="text"
                id="title"
                v-model="newBook.title"
                required
                placeholder="書籍のタイトル"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="author">著者 *</label>
              <input
                type="text"
                id="author"
                v-model="newBook.author"
                required
                placeholder="著者名"
              />
            </div>

            <div class="form-group">
              <label for="isbn">ISBN</label>
              <input
                type="text"
                id="isbn"
                v-model="newBook.isbn"
                placeholder="978-4-XXXX-XXXX-X"
              />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="adding">
            {{ adding ? '登録中...' : '書籍を登録' }}
          </button>
        </form>
      </div>

      <div class="card">
        <h2>登録済み書籍一覧</h2>

        <div v-if="loading" class="loading">読み込み中...</div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>書籍ID</th>
              <th>タイトル</th>
              <th>著者</th>
              <th>ISBN</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="book in books" :key="book.id">
              <td>{{ book.book_id }}</td>
              <td>{{ book.title }}</td>
              <td>{{ book.author }}</td>
              <td>{{ book.isbn || '-' }}</td>
              <td>
                <span
                  class="badge"
                  :class="book.status === 'available' ? 'badge-success' : 'badge-warning'"
                >
                  {{ book.status === 'available' ? '利用可能' : '貸出中' }}
                </span>
              </td>
              <td>
                <button
                  v-if="book.status === 'available'"
                  @click="deleteBook(book.book_id)"
                  class="btn btn-danger btn-sm"
                  :disabled="deleting"
                >
                  削除
                </button>
                <span v-else class="disabled-text">貸出中は削除不可</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import NavBar from '../components/NavBar.vue';
import { bookAPI } from '../services/api';

export default {
  name: 'AdminBooks',
  components: {
    NavBar
  },
  data() {
    return {
      books: [],
      loading: false,
      adding: false,
      deleting: false,
      newBook: {
        bookId: '',
        title: '',
        author: '',
        isbn: ''
      },
      message: '',
      messageType: ''
    };
  },
  async mounted() {
    await this.loadBooks();
  },
  methods: {
    async loadBooks() {
      this.loading = true;
      try {
        const response = await bookAPI.getAll();
        this.books = response.data.books;
      } catch (err) {
        this.showMessage('書籍の読み込みに失敗しました。', 'alert-error');
      } finally {
        this.loading = false;
      }
    },
    async addBook() {
      this.adding = true;
      try {
        const response = await bookAPI.add(
          this.newBook.bookId,
          this.newBook.title,
          this.newBook.author,
          this.newBook.isbn
        );
        this.showMessage(response.data.message, 'alert-success');

        // フォームをリセット
        this.newBook = {
          bookId: '',
          title: '',
          author: '',
          isbn: ''
        };

        await this.loadBooks();
      } catch (err) {
        this.showMessage(
          err.response?.data?.message || '書籍の登録に失敗しました。',
          'alert-error'
        );
      } finally {
        this.adding = false;
      }
    },
    async deleteBook(bookId) {
      if (!confirm(`書籍 ${bookId} を削除しますか？この操作は取り消せません。`)) {
        return;
      }

      this.deleting = true;
      try {
        const response = await bookAPI.delete(bookId);
        this.showMessage(response.data.message, 'alert-success');
        await this.loadBooks();
      } catch (err) {
        this.showMessage(
          err.response?.data?.message || '書籍の削除に失敗しました。',
          'alert-error'
        );
      } finally {
        this.deleting = false;
      }
    },
    showMessage(text, type) {
      this.message = text;
      this.messageType = type;
      setTimeout(() => {
        this.message = '';
      }, 5000);
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

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.disabled-text {
  font-size: 13px;
  color: #999;
}
</style>
