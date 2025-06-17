import React, { useState } from "react";
import Link from "next/link";
import JoinForm from './JoinForm';
import LoginForm from './LoginForm';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [selectedCategory, setSelectedCategory] = useState("Sportsbook");
  const [showJoin, setShowJoin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSoon, setShowSoon] = useState(false);
  const { isLoggedIn, username, logout } = useAuth();

  const handleMenuClick = (category: string) => {
    if (["Casino", "Poker", "Ladder"].includes(category)) {
      setShowSoon(true);
      return;
    }
    setSelectedCategory(category);
  };

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* 로고 & 메뉴 */}
        <div className="flex items-center space-x-6">
          <Link href="/">
            <span className="font-bold text-xl">Lbetfair</span>
          </Link>
          <nav className="hidden sm:flex space-x-4 font-medium">
            <button
              onClick={() => handleMenuClick("Exchange")}
              className={`hover:text-blue-200 ${
                selectedCategory === "Exchange"
                  ? "text-yellow-400 font-bold"
                  : "text-white"
              }`}
            >
              Exchange
            </button>
            <button
              onClick={() => handleMenuClick("Sportsbook")}
              className={`hover:text-blue-200 ${
                selectedCategory === "Sportsbook"
                  ? "text-yellow-400 font-bold"
                  : "text-white"
              }`}
            >
              Sportsbook
            </button>
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
          </nav>
        </div>

        {/* 로그인 & 기타 */}
        <div className="flex items-center space-x-3 text-sm">
          {isLoggedIn ? (
            <>
              <span className="font-semibold text-white">{username}님 접속중입니다</span>
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