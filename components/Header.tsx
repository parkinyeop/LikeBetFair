import { buildApiUrl } from '../config/apiConfig';
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import JoinForm from './JoinForm';
import LoginForm from './LoginForm';
import MyPageModal from './MyPageModal';
import { useAuth } from '../contexts/AuthContext';


export default function Header() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Sportsbook");
  const [showJoin, setShowJoin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSoon, setShowSoon] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [siteName, setSiteName] = useState("Lbetfair"); // 기본값
  const [siteDescription, setSiteDescription] = useState("스포츠 베팅 플랫폼"); // 기본값
  const { isLoggedIn, username, logout, isAdmin, adminLevel } = useAuth();

  // 현재 경로에 따라 카테고리 설정
  useEffect(() => {
    const path = router.asPath;
    console.log('현재 경로:', path);
    
    if (path.startsWith('/exchange')) {
      setSelectedCategory("Exchange");
    } else if (path.startsWith('/admin')) {
      setSelectedCategory("Admin");
    } else if (path === '/' || path.startsWith('/odds') || path.startsWith('/sports')) {
      setSelectedCategory("Sportsbook");
    }
  }, [router.asPath]);

  // 설정값 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/admin/public-settings'));
        if (response.ok) {
          const data = await response.json();
          console.log('Header 설정 로드 성공:', data);
          if (data.settings?.site_name) {
            setSiteName(data.settings.site_name);
            console.log('사이트명 업데이트:', data.settings.site_name);
          }
          if (data.settings?.site_description) {
            setSiteDescription(data.settings.site_description);
            console.log('사이트 설명 업데이트:', data.settings.site_description);
          }
        }
      } catch (error) {
        console.log('설정 로드 실패, 기본값 사용:', error);
      }
    };
    
    loadSettings();
  }, []);

  const handleMenuClick = (category: string) => {
    if (["Casino", "Poker", "Ladder"].includes(category)) {
      setShowSoon(true);
      return;
    }
    setSelectedCategory(category);
    
    // Trigger sidebar reset event when Sportsbook or Exchange home is selected
    if (category === "Sportsbook") {
      window.dispatchEvent(new CustomEvent('sportsbookSelected'));
    } else if (category === "Exchange") {
      window.dispatchEvent(new CustomEvent('exchangeHomeSelected'));
    }
  };

  return (
    <header className="w-full bg-blue-600 text-white shadow h-16 flex items-center">
      <div className="w-full flex items-center justify-between h-full px-4">
        {/* Left: 사이트명 + 설명 */}
        <div className="flex items-center gap-2 min-w-[180px] h-full">
          <Link href="/">
            <span className="font-bold text-xl">{siteName}</span>
          </Link>
          <span className="ml-2 text-xs bg-white text-blue-600 rounded px-2 py-0.5">{siteDescription}</span>
        </div>
        {/* Center: Menu */}
        <nav className="flex-1 flex items-center justify-center h-full">
          <div className="flex space-x-4 font-medium">
            <Link href="/exchange" passHref legacyBehavior>
              <button
                onClick={() => handleMenuClick("Exchange")}
                className={`hover:text-blue-200 ${selectedCategory === "Exchange" ? "text-yellow-400 font-bold" : "text-white"}`}
              >
                Exchange
              </button>
            </Link>
            <Link href="/" passHref legacyBehavior>
              <button
                onClick={() => handleMenuClick("Sportsbook")}
                className={`hover:text-blue-200 ${selectedCategory === "Sportsbook" ? "text-yellow-400 font-bold" : "text-white"}`}
              >
                Sportsbook
              </button>
            </Link>
            <button
              onClick={() => handleMenuClick("Casino")}
              className="flex items-center space-x-1 text-gray-300"
            >
              <span>Casino</span>
              <span className="text-[10px] bg-red-500 text-white px-1 rounded">SOON</span>
            </button>
            <button
              onClick={() => handleMenuClick("Poker")}
              className="flex items-center space-x-1 text-gray-300"
            >
              <span>Poker</span>
              <span className="text-[10px] bg-red-500 text-white px-1 rounded">SOON</span>
            </button>
            <button
              onClick={() => handleMenuClick("Ladder")}
              className="flex items-center space-x-1 text-gray-300"
            >
              <span>Ladder</span>
              <span className="text-[10px] bg-red-500 text-white px-1 rounded">SOON</span>
            </button>
            
            {/* Admin menu - only shown to admins */}
            {isAdmin && (
              <Link href="/admin" passHref legacyBehavior>
                <button
                  onClick={() => handleMenuClick("Admin")}
                  className={`flex items-center space-x-1 ${selectedCategory === "Admin" ? "text-yellow-400 font-bold" : "text-white hover:text-blue-200"}`}
                >
                  <span>Admin</span>
                  {adminLevel >= 4 && (
                    <span className="text-[10px] bg-green-500 text-white px-1 rounded">L{adminLevel}</span>
                  )}
                </button>
              </Link>
            )}
          </div>
        </nav>
        {/* Right: Login/Sign up or user info */}
        <div className="flex items-center space-x-3 min-w-[180px] justify-end text-sm h-full">
          {isLoggedIn ? (
            <>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-white">
                  Welcome, {username}
                  {isAdmin && (
                    <span className="ml-1 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                      Admin Lv.{adminLevel}
                    </span>
                  )}
                </span>
              </div>
              
              {/* 마이페이지 버튼 */}
              <button
                onClick={() => setShowMyPage(true)}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-400 transition-colors"
                title="마이페이지"
              >
                👤
              </button>
              
              <button
                onClick={logout}
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowLogin(true)}
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50"
              >
                Login
              </button>
              <button
                onClick={() => setShowJoin(true)}
                className="px-3 py-1 bg-blue-500 text-white border rounded hover:bg-blue-400"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}
      {showJoin && <JoinForm onClose={() => setShowJoin(false)} />}
      {showMyPage && <MyPageModal isOpen={showMyPage} onClose={() => setShowMyPage(false)} />}
      {showSoon && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-yellow-300 text-black px-6 py-3 rounded shadow-lg z-50">
          Coming Soon
          <button className="ml-4 text-sm underline" onClick={() => setShowSoon(false)}>Close</button>
        </div>
      )}
    </header>
  );
} 