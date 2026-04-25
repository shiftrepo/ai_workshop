/**
 * Type definitions for Library Management System
 */

export interface User {
  id: number;
  user_id: string;
  password_hash: string;
  is_admin: boolean;
  created_at: string;
}

export interface Book {
  id: number;
  book_id: string;
  title: string;
  author: string;
  created_at: string;
}

export interface Loan {
  id: number;
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  user_id: string;
  password: string;
}

export interface RegisterRequest {
  user_id: string;
  password: string;
}

export interface BorrowRequest {
  user_id: string;
  book_id: string;
}

export interface ReturnRequest {
  user_id: string;
  book_id: string;
}

export interface AddBookRequest {
  title: string;
  author: string;
  copies?: number;
}

export interface UserStatus {
  user_id: string;
  borrowed_books: Array<{
    book_id: string;
    title: string;
    author: string;
    borrowed_at: string;
    due_date: string;
    is_overdue: boolean;
  }>;
}

export interface BookStatus {
  book_id: string;
  title: string;
  author: string;
  is_available: boolean;
  borrowed_by?: string;
  borrowed_at?: string;
  due_date?: string;
}
