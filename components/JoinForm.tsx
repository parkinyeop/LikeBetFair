import { useState } from 'react';

export default function JoinForm({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const requestBody: any = { username, email, password };
      if (referralCode.trim()) {
        requestBody.referralCode = referralCode.trim();
      }

      const res = await fetch('http://localhost:5050/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (res.ok) {
        setShowSuccessModal(true);
        setUsername('');
        setEmail('');
        setPassword('');
        setReferralCode('');
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
            className="w-full mb-2 p-2 border rounded text-black"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <input
            className="w-full mb-4 p-2 border rounded text-black"
            placeholder="추천코드 (선택사항)"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
          />
          {referralCode && (
            <div className="mb-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              💡 추천코드를 입력하시면 특별 혜택을 받을 수 있습니다!
            </div>
          )}
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
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <div className="bg-white p-6 rounded shadow w-80 text-center">
            <h3 className="text-lg font-bold mb-4 text-green-600">🎉 회원가입 완료!</h3>
            <p className="mb-4 text-gray-700">
              {referralCode 
                ? `추천코드 "${referralCode}"로 가입이 완료되었습니다!` 
                : '회원가입이 완료되었습니다!'
              }
            </p>
            <p className="mb-4 text-sm text-gray-500">이제 로그인하여 서비스를 이용하세요.</p>
            <button 
              onClick={handleSuccessModalClose}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
} 