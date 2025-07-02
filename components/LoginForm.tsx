'use client';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:5050/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log('로그인 응답:', data);
      console.log('로그인 응답 balance:', data.balance, typeof data.balance);
      if (res.ok) {
        localStorage.setItem('token', data.token);
        login(
          data.username || data.email, 
          Number(data.balance), 
          data.isAdmin || false, 
          data.adminLevel || 0
        );
        onClose();
      } else {
        setMessage(data.message || '로그인 실패');
      }
    } catch (err) {
      setMessage('서버 오류');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
        <h2 className="text-xl font-bold mb-4">로그인</h2>
        <input
          className="w-full mb-2 p-2 border rounded text-black"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full mb-4 p-2 border rounded text-black"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded mb-2">
          로그인
        </button>
        <button type="button" className="w-full bg-gray-300 py-2 rounded" onClick={onClose}>
          닫기
        </button>
        {message && <div className="mt-2 text-center text-sm text-red-500">{message}</div>}
      </form>
    </div>
  );
} 