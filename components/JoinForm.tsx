import { useState } from 'react';
import { API_CONFIG } from '../config/apiConfig';

export default function JoinForm({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      console.log('[Registration] Form submission started');
      console.log('[Registration] Input data:', { 
        username: username ? `${username.substring(0, 3)}***` : null,
        email: email ? `${email.substring(0, 3)}***` : null,
        hasPassword: !!password,
        passwordLength: password.length,
        hasReferralCode: !!referralCode
      });

      // 클라이언트 측 검증
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      if (username.length < 2 || username.length > 50) {
        setError('Username must be 2-50 characters');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }

      const requestBody: any = { username: username.trim(), email: email.trim(), password };
      if (referralCode.trim()) {
        requestBody.referralCode = referralCode.trim();
      }

      console.log('[Registration] API request started');
      console.log('[Registration] Request URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`);
      console.log('[Registration] Request body:', requestBody);

      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Registration] API response status:', res.status);
      console.log('[Registration] API response headers:', Object.fromEntries(res.headers.entries()));

      // 응답을 텍스트로 먼저 읽기
      const responseText = await res.text();
      console.log('[Registration] API response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[Registration] JSON parsing failed:', parseError);
        console.error('[Registration] Original response text:', responseText);
        setError('Server response format error occurred');
        setIsLoading(false);
        return;
      }

      console.log('[Registration] API response data:', data);

      if (res.ok) {
        console.log('[Registration] Success');
        setShowSuccessModal(true);
        setUsername('');
        setEmail('');
        setPassword('');
        setReferralCode('');
        setMessage(data.message || 'Registration completed successfully');
      } else {
        console.log('[Registration] Failed:', data);
        console.error('[Registration] HTTP status:', res.status);
        console.error('[Registration] Response data:', data);
        
        // 서버에서 반환한 오류 메시지 처리
        if (data.error) {
          setError(data.error);
        } else if (data.message) {
          setError(data.message);
        } else {
          setError(`Registration failed (${res.status})`);
        }

        // 상세 오류 정보가 있으면 콘솔에 출력
        if (data.details) {
          console.error('[Registration] Detailed error:', data.details);
        }
        if (data.missing) {
          console.error('[Registration] Missing fields:', data.missing);
        }
      }
    } catch (err) {
      console.error('[Registration] Network error:', err);
      console.error('[Registration] Full error:', err);
      setError('Server connection failed. Please try again later.');
    } finally {
      setIsLoading(false);
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
          <h2 className="text-xl font-bold mb-4">Sign Up</h2>
          <input
            className="w-full mb-2 p-2 border rounded text-black"
            placeholder="Username (2-50 characters)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            disabled={isLoading}
          />
          <input
            className="w-full mb-2 p-2 border rounded text-black"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <input
            className="w-full mb-2 p-2 border rounded text-black"
            placeholder="Password (min 6 characters)"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={isLoading}
          />
          <input
            className="w-full mb-4 p-2 border rounded text-black"
            placeholder="Referral Code (optional)"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
            disabled={isLoading}
          />
          {referralCode && (
            <div className="mb-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              💡 Enter a referral code to receive special benefits!
            </div>
          )}
          <button 
            type="submit" 
            className={`w-full py-2 rounded mb-2 ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Sign Up'}
          </button>
          <button 
            type="button" 
            className="w-full bg-gray-300 py-2 rounded hover:bg-gray-400" 
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </button>
          {error && (
            <div className="mt-2 text-center text-sm text-red-500 bg-red-50 p-2 rounded">
              ❌ {error}
            </div>
          )}
          {message && !error && (
            <div className="mt-2 text-center text-sm text-green-500 bg-green-50 p-2 rounded">
              ✅ {message}
            </div>
          )}
        </form>
      </div>

      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <div className="bg-white p-6 rounded shadow w-80 text-center">
            <h3 className="text-lg font-bold mb-4 text-green-600">🎉 Registration Complete!</h3>
            <p className="mb-4 text-gray-700">
              {referralCode 
                ? `Registration completed with referral code "${referralCode}"!` 
                : 'Registration completed successfully!'
              }
            </p>
            <p className="mb-4 text-sm text-gray-500">Please log in to use the service.</p>
            <button 
              onClick={handleSuccessModalClose}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
} 