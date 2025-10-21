import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/apiConfig';
import PasswordChangeModal from './PasswordChangeModal';

interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export default function ProfileTab({ viewUserId }: { viewUserId?: string }) {
  const { username, userId } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const isAdminViewing = !!viewUserId; // 관리자가 다른 사용자 정보를 보는지

  // 사용자 정보 로드
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // AuthContext와 동일한 방식으로 토큰 가져오기
        const tabId = sessionStorage.getItem('tabId');
        const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;

        if (!token) {
          console.error('토큰이 없습니다.');
          setLoading(false);
          return;
        }

        // 관리자가 다른 사용자 정보를 조회하는 경우
        const apiUrl = isAdminViewing 
          ? buildApiUrl(`/api/admin/users/${viewUserId}/profile`)
          : buildApiUrl('/api/mypage/profile');

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          console.error('사용자 정보 로드 실패:', response.status);
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [viewUserId, isAdminViewing]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">개인정보</h2>

      <div className="grid grid-cols-2 gap-4">
        <InfoField label="사용자명" value={userData?.username || username} />
        <InfoField label="이메일" value={userData?.email || '정보 없음'} />
        <InfoField 
          label="가입일" 
          value={userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('ko-KR') : '정보 없음'} 
        />
        <InfoField 
          label="최근 로그인" 
          value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '정보 없음'} 
        />
      </div>

      {/* 관리자 조회 시에는 비밀번호 변경 버튼 숨김 */}
      {!isAdminViewing && (
        <div className="pt-4">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            비밀번호 변경
          </button>
        </div>
      )}

      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: string;
}

function InfoField({ label, value }: InfoFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <div className="text-lg text-gray-900">{value}</div>
    </div>
  );
}
