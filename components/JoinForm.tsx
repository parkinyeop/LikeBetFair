import { useState } from 'react';

export default function JoinForm({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('http://localhost:5050/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowSuccessModal(true);
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        setMessage(data.message || '회원가입 실패');
      }
    } catch (err) {
      setMessage('서버 오류');
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
          <h2 className="text-xl font-bold mb-4">회원가입</h2>
          <input
            className="w-full mb-2 p-2 border rounded text-black"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
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
            가입하기
          </button>
          <button type="button" className="w-full bg-gray-300 py-2 rounded" onClick={onClose}>
            닫기
          </button>
          {message && <div className="mt-2 text-center text-sm text-red-500">{message}</div>}
        </form>
      </div>

      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow w-80">
            <h2 className="text-xl font-bold mb-4 text-center text-black">회원가입 성공!</h2>
            <p className="text-center mb-4 text-black">로그인 해주세요!</p>
            <button
              onClick={handleSuccessModalClose}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
} 