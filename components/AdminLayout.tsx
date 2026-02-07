import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Header from './Header';

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredLevel?: number;
  title?: string;
  className?: string;
}

export default function AdminLayout({ 
  children, 
  requiredLevel = 1, 
  title,
  className = ""
}: AdminLayoutProps) {
  const { isLoggedIn, isAdmin, adminLevel, isAuthLoading } = useAuth();
  const router = useRouter();

  // 인증 로딩 중일 때 로딩 화면 표시
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">인증 정보를 확인하는 중입니다...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      router.push('/admin');
      return;
    }

    if (!isAdmin || adminLevel < requiredLevel) {
      alert(`접근 권한이 없습니다. (필요 레벨: ${requiredLevel}, 현재 레벨: ${adminLevel})`);
      router.push('/admin');
      return;
    }
  }, [isLoggedIn, isAdmin, adminLevel, requiredLevel, router, isAuthLoading]);

  // 권한 확인 중이거나 권한이 없는 경우
  if (!isLoggedIn || !isAdmin || adminLevel < requiredLevel) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-page fixed inset-0 bg-gray-100 flex flex-col z-50 ${className}`}>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        #__next {
          height: 100vh;
          overflow-x: hidden;
        }
        .admin-page * {
          box-sizing: border-box;
        }
      `}</style>
      
      <Header />
      
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <div className="p-6">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// 특별한 권한이 필요한 페이지를 위한 래퍼
export function AdminLayoutWithPermission({ 
  children, 
  requiredLevel = 1, 
  title,
  className = ""
}: AdminLayoutProps) {
  return (
    <AdminLayout requiredLevel={requiredLevel} title={title} className={className}>
      {children}
    </AdminLayout>
  );
}
