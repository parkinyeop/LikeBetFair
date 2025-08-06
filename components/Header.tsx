import React, { useState } from "react";
import Link from "next/link";
import JoinForm from './JoinForm';
import LoginForm from './LoginForm';
import { useAuth } from '../contexts/AuthContext';

const FRONTEND_VERSION = '25062301'; // YYYYMMDD + 2-digit sequence

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
        {/* Left: Lbetfair + version */}
        <div className="flex items-center gap-2 min-w-[180px] h-full">
          <Link href="/">
            <span className="font-bold text-xl">Lbetfair</span>
          </Link>
          <span className="ml-2 text-xs bg-white text-blue-600 rounded px-2 py-0.5 font-mono">v{FRONTEND_VERSION}</span>
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
      {showSoon && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-yellow-300 text-black px-6 py-3 rounded shadow-lg z-50">
          Coming Soon
          <button className="ml-4 text-sm underline" onClick={() => setShowSoon(false)}>Close</button>
        </div>
      )}
    </header>
  );
} 