import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import Dashboard from '../views/Dashboard.vue';
import Books from '../views/Books.vue';
import MyLoans from '../views/MyLoans.vue';
import AdminBooks from '../views/AdminBooks.vue';
import AdminLoans from '../views/AdminLoans.vue';

const routes = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/register',
        name: 'Register',
        component: Register
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { requiresAuth: true }
    },
    {
        path: '/books',
        name: 'Books',
        component: Books,
        meta: { requiresAuth: true }
    },
    {
        path: '/my-loans',
        name: 'MyLoans',
        component: MyLoans,
        meta: { requiresAuth: true }
    },
    {
        path: '/admin/books',
        name: 'AdminBooks',
        component: AdminBooks,
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/admin/loans',
        name: 'AdminLoans',
        component: AdminLoans,
        meta: { requiresAuth: true, requiresAdmin: true }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

// ナビゲーションガード
router.beforeEach((to, from, next) => {
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    if (requiresAuth && !isAuthenticated) {
        next('/login');
    } else {
        next();
    }
});

export default router;
