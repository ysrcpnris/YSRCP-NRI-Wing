// src/pages/AdminLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const adminUser = {
  email: 'admin@example.com',
  password: 'Admin@123', // hardcoded for development
};

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Admin Sign In</h2>
        {error && <div className="mb-3 text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 rounded-lg font-semibold ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500">Please sign in with your admin credentials</p>
      </div>
    </div>
  );
}
