import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PasswordChangeModal from './PasswordChangeModal';

interface UserData {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export default function ProfileTab() {
  const { username, userId } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // 사용자 정보 로드
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/mypage/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('사용자 정보 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

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
          value={userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString('ko-KR') : '정보 없음'} 
        />
      </div>

      <div className="pt-4">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          비밀번호 변경
        </button>
      </div>

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
