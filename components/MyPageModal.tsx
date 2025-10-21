import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// 탭 컴포넌트들 import
import ProfileTab from './mypage/ProfileTab';
import PaymentsTab from './mypage/PaymentsTab';
import BetsTab from './mypage/BetsTab';
import ExchangeOrdersTab from './mypage/ExchangeOrdersTab';

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewUserId?: string; // 관리자가 조회할 사용자 ID
  viewUsername?: string; // 관리자가 조회할 사용자명
}

export default function MyPageModal({ isOpen, onClose, viewUserId, viewUsername }: MyPageModalProps) {
  const { username } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // 조회 대상 사용자명 결정
  const displayUsername = viewUsername || username;
  const isAdminViewing = !!viewUserId; // 관리자가 다른 사용자 정보를 보는지 여부

  if (!isOpen) return null;

  return (
    <>
      {/* 모달 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* 모달 컨테이너 */}
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 닫히지 않도록
        >
          {/* 모달 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                마이페이지 {isAdminViewing && '(관리자 조회)'}
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                {isAdminViewing ? `${displayUsername}님의 정보` : `안녕하세요, ${displayUsername}님`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              title="닫기"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 탭 네비게이션 */}
          <nav className="flex border-b border-gray-200 bg-white">
            <TabButton
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
            >
              📋 개인정보
            </TabButton>
            <TabButton
              active={activeTab === 'payments'}
              onClick={() => setActiveTab('payments')}
            >
              💰 입출금내역
            </TabButton>
            <TabButton
              active={activeTab === 'bets'}
              onClick={() => setActiveTab('bets')}
            >
              🎲 베팅내역
            </TabButton>
            <TabButton
              active={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
            >
              📊 익스체인지 주문
            </TabButton>
          </nav>

          {/* 탭 컨텐츠 */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {activeTab === 'profile' && <ProfileTab viewUserId={viewUserId} />}
            {activeTab === 'payments' && <PaymentsTab viewUserId={viewUserId} />}
            {activeTab === 'bets' && <BetsTab viewUserId={viewUserId} />}
            {activeTab === 'orders' && <ExchangeOrdersTab viewUserId={viewUserId} />}
          </div>
        </div>
      </div>
    </>
  );
}

// 탭 버튼 컴포넌트
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 px-6 font-medium text-sm transition-colors border-b-2 ${
        active
          ? 'border-blue-600 text-blue-600 bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
