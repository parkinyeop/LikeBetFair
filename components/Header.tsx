import React, { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [selectedCategory, setSelectedCategory] = useState("Exchange");

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
          <input
            type="text"
            placeholder="email/username"
            className="px-2 py-1 rounded border text-black"
          />
          <input
            type="password"
            placeholder="password"
            className="px-2 py-1 rounded border text-black"
          />
          <button className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50">
            Log In
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white border rounded hover:bg-blue-400">
            Join Now
          </button>
        </div>
      </div>
    </header>
  );
} 