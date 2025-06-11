import React, { useState } from "react";
import Link from "next/link";
import JoinForm from './JoinForm';
import LoginForm from './LoginForm';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [selectedCategory, setSelectedCategory] = useState("Exchange");
  const [showJoin, setShowJoin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { isLoggedIn, username, logout } = useAuth();

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
              onClick={() => setSelectedCategory("Exchange")}
              className={`hover:text-blue-200 ${
                selectedCategory === "Exchange"
                  ? "text-black font-bold"
                  : "text-white"
              }`}
            >
              Exchange
            </button>
            <button
              onClick={() => setSelectedCategory("Sportsbook")}
              className={`hover:text-blue-200 ${
                selectedCategory === "Sportsbook"
                  ? "text-black font-bold"
                  : "text-white"
              }`}
            >
              Sportsbook
            </button>
            <div className="flex items-center space-x-1">
              <Link href="/casino" className="text-gray-300">Casino</Link>
              <span className="text-[10px] bg-red-500 text-white px-1 rounded">SOON</span>
            </div>
            <div className="flex items-center space-x-1">
              <Link href="/poker" className="text-gray-300">Poker</Link>
              <span className="text-[10px] bg-red-500 text-white px-1 rounded">SOON</span>
            </div>
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
    </header>
  );
} 