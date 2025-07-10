import React, { useState } from "react";
import Link from "next/link";
import JoinForm from './JoinForm';
import LoginForm from './LoginForm';
import { useAuth } from '../contexts/AuthContext';

const FRONTEND_VERSION = '25062301'; // YYYYMMDD + 2자리 시퀀스

export default function Header() {
  const [selectedCategory, setSelectedCategory] = useState("Sportsbook");
  const [showJoin, setShowJoin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSoon, setShowSoon] = useState(false);
  const { isLoggedIn, username, logout, isAdmin, adminLevel } = useAuth();

  const handleMenuClick = (category: string) => {
    if (["Casino", "Poker", "Ladder"].includes(category)) {
      setShowSoon(true);
      return;
    }
    setSelectedCategory(category);
    
    // 스포츠북 또는 Exchange 홈 선택 시 사이드바 리셋 이벤트 발생
    if (category === "Sportsbook") {
      window.dispatchEvent(new CustomEvent('sportsbookSelected'));
    } else if (category === "Exchange") {
      window.dispatchEvent(new CustomEvent('exchangeHomeSelected'));
    }
  };

  return (
    <header className="w-full bg-blue-600 text-white shadow h-16 flex items-center">
      <div className="w-full flex items-center justify-between h-full px-4">
        {/* 왼쪽: Lbetfair + 버전 */}
        <div className="flex items-center gap-2 min-w-[180px] h-full">
          <Link href="/">
            <span className="font-bold text-xl">Lbetfair</span>
          </Link>
          <span className="ml-2 text-xs bg-white text-blue-600 rounded px-2 py-0.5 font-mono">v{FRONTEND_VERSION}</span>
        </div>
        {/* 중앙: 메뉴 */}
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
            
            {/* 관리자 메뉴 - 관리자만 표시 */}
            {isAdmin && (
              <Link href="/admin" passHref legacyBehavior>
                <button
                  onClick={() => handleMenuClick("Admin")}
                  className={`flex items-center space-x-1 ${selectedCategory === "Admin" ? "text-yellow-400 font-bold" : "text-white hover:text-blue-200"}`}
                >
                  <span>관리자</span>
                  {adminLevel >= 4 && (
                    <span className="text-[10px] bg-green-500 text-white px-1 rounded">L{adminLevel}</span>
                  )}
                </button>
              </Link>
            )}
          </div>
        </nav>
        {/* 오른쪽: 로그인/회원가입 또는 유저 정보 */}
        <div className="flex items-center space-x-3 min-w-[180px] justify-end text-sm h-full">
          {isLoggedIn ? (
            <>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-white">
                  {username}님 접속중입니다
                  {isAdmin && (
                    <span className="ml-1 text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                      관리자 Lv.{adminLevel}
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowLogin(true)}
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50"
              >
                로그인
              </button>
              <button
                onClick={() => setShowJoin(true)}
                className="px-3 py-1 bg-blue-500 text-white border rounded hover:bg-blue-400"
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}
      {showJoin && <JoinForm onClose={() => setShowJoin(false)} />}
      {showSoon && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-yellow-300 text-black px-6 py-3 rounded shadow-lg z-50">
          준비중 입니다
          <button className="ml-4 text-sm underline" onClick={() => setShowSoon(false)}>닫기</button>
        </div>
      )}
    </header>
  );
} 