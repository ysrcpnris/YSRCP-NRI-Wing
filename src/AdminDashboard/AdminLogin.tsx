// src/pages/AdminLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Hardcoded admin credentials for development (replace with secure auth in production)
const adminUser = {
  email: 'admin@example.com',
  password: 'Admin@123', // hardcoded for development
};

// Admin login form component with email and password validation
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

// Validates credentials and sets admin session on successful login
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  const trimmedEmail = email.trim().toLowerCase();

  if (
    trimmedEmail === adminUser.email.toLowerCase() &&
    password === adminUser.password
  ) {
    localStorage.setItem('is_admin', 'true');
    localStorage.setItem('adminLoginTime', new Date().toISOString());
    navigate('/admin/dashboard');
    return;
  }

  setError('Invalid credentials');
  setIsLoading(false);
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Admin Sign In</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in with your admin credentials</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="input-field"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="input-field"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-gradient w-full py-3 rounded-xl"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
