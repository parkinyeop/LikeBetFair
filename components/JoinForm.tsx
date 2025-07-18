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
      console.log('[회원가입] 폼 제출 시작');
      console.log('[회원가입] 입력 데이터:', { 
        username: username ? `${username.substring(0, 3)}***` : null,
        email: email ? `${email.substring(0, 3)}***` : null,
        hasPassword: !!password,
        passwordLength: password.length,
        hasReferralCode: !!referralCode
      });

      // 클라이언트 측 검증
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('모든 필수 필드를 입력해주세요');
        setIsLoading(false);
        return;
      }

      if (username.length < 2 || username.length > 50) {
        setError('사용자명은 2-50자 사이여야 합니다');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다');
        setIsLoading(false);
        return;
      }

      const requestBody: any = { username: username.trim(), email: email.trim(), password };
      if (referralCode.trim()) {
        requestBody.referralCode = referralCode.trim();
      }

      console.log('[회원가입] API 요청 시작');
      console.log('[회원가입] 요청 URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`);

      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[회원가입] API 응답 상태:', res.status);
      console.log('[회원가입] API 응답 헤더:', Object.fromEntries(res.headers.entries()));

      const data = await res.json();
      console.log('[회원가입] API 응답 데이터:', data);

      if (res.ok) {
        console.log('[회원가입] 성공');
        setShowSuccessModal(true);
        setUsername('');
        setEmail('');
        setPassword('');
        setReferralCode('');
        setMessage(data.message || '회원가입이 완료되었습니다');
      } else {
        console.log('[회원가입] 실패:', data);
        // 서버에서 반환한 오류 메시지 처리
        if (data.error) {
          setError(data.error);
        } else if (data.message) {
          setError(data.message);
        } else {
          setError('회원가입에 실패했습니다');
        }

        // 상세 오류 정보가 있으면 콘솔에 출력
        if (data.details) {
          console.error('[회원가입] 상세 오류:', data.details);
        }
      }
    } catch (err) {
      console.error('[회원가입] 네트워크 오류:', err);
      setError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
          <h2 className="text-xl font-bold mb-4">회원가입</h2>
          <input
            className="w-full mb-2 p-2 border rounded text-black"
            placeholder="Username (2-50자)"
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
            placeholder="Password (6자 이상)"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={isLoading}
          />
          <input
            className="w-full mb-4 p-2 border rounded text-black"
            placeholder="추천코드 (선택사항)"
            value={referralCode}
            onChange={e => setReferralCode(e.target.value)}
            disabled={isLoading}
          />
          {referralCode && (
            <div className="mb-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              💡 추천코드를 입력하시면 특별 혜택을 받을 수 있습니다!
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
            {isLoading ? '처리 중...' : '가입하기'}
          </button>
          <button 
            type="button" 
            className="w-full bg-gray-300 py-2 rounded hover:bg-gray-400" 
            onClick={onClose}
            disabled={isLoading}
          >
            닫기
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