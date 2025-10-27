import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// レスポンスインターセプター（エラーハンドリング）
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // 認証エラーの場合、ログインページにリダイレクト
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (userId, password, name) =>
        api.post('/register', { userId, password, name }),

    login: (userId, password) =>
        api.post('/login', { userId, password }),

    logout: () =>
        api.post('/logout'),

    getCurrentUser: () =>
        api.get('/me')
};

export const bookAPI = {
    getAll: () =>
        api.get('/books'),

    getAvailable: () =>
        api.get('/books/available'),

    getById: (bookId) =>
        api.get(`/books/${bookId}`),

    search: (keyword) =>
        api.get('/books/search', { params: { keyword } }),

    add: (bookId, title, author, isbn) =>
        api.post('/book/add', { bookId, title, author, isbn }),

    delete: (bookId) =>
        api.delete(`/books/${bookId}`)
};

export const loanAPI = {
    borrow: (bookId) =>
        api.post('/borrow', { bookId }),

    return: (bookId) =>
        api.post('/return', { bookId }),

    getAllLoans: () =>
        api.get('/loans'),

    getOverdue: () =>
        api.get('/loans/overdue')
};

export const statusAPI = {
    getMyStatus: () =>
        api.get('/status/my'),

    getUserStatus: (userId) =>
        api.get(`/status/user/${userId}`),

    getBookStatus: (bookId) =>
        api.get(`/status/book/${bookId}`)
};

export default api;
