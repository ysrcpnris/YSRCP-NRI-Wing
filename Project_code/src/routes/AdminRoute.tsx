// src/routes/AdminRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}
