<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
:root {
  --primary-color: #4a90e2;
  --primary-dark: #357abd;
  --success-color: #51cf66;
  --danger-color: #ff6b6b;
  --warning-color: #ffd43b;
  --bg-light: #f8f9fa;
  --text-dark: #2c3e50;
  --border-color: #dee2e6;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-dark);
  background-color: var(--bg-light);
}

#app {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-dark);
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.alert {
  padding: 12px 20px;
  border-radius: 5px;
  margin-bottom: 15px;
}

.alert-success {
  background-color: #d3f9d8;
  color: #2b8a3e;
  border: 1px solid #8ce99a;
}

.alert-error {
  background-color: #ffe0e0;
  color: #c92a2a;
  border: 1px solid #ffa8a8;
}

.alert-warning {
  background-color: #fff3bf;
  color: #e67700;
  border: 1px solid #ffe066;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.table th {
  background-color: var(--bg-light);
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background-color: #d3f9d8;
  color: #2b8a3e;
}

.badge-warning {
  background-color: #fff3bf;
  color: #e67700;
}

.badge-danger {
  background-color: #ffe0e0;
  color: #c92a2a;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #868e96;
}
</style>
