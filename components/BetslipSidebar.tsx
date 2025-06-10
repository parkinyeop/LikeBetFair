import React from "react";

export default function BetslipSidebar() {
  const selections = [
    { team: "Kia Tigers", odds: 1.5, desc: "Samsung Lions @ Kia Tigers" },
    { team: "SSG Landers", odds: 2.6, desc: "SSG Landers @ LG Twins" },
    { team: "KT Wiz", odds: 1.9, desc: "Lotte Giants @ KT Wiz" },
    { team: "NC Dinos", odds: 1.34, desc: "NC Dinos @ Kiwoom Heroes" },
  ];

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1).toFixed(2);

  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200">
      <h2 className="text-lg font-bold">Betslip</h2>

      {/* Selections List */}
      <div className="bg-gray-50 p-3 rounded">
        <p className="font-semibold mb-2">{selections.length} Selections</p>
        {selections.map((s, i) => (
          <div key={i} className="border-b border-gray-200 pb-2 mb-2">
            <div className="flex justify-between items-center">
              <p className="font-bold text-sm">{s.team}</p>
              <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">{s.odds}</span>
            </div>
            <p className="text-xs text-gray-500">Money Line - {s.desc}</p>
          </div>
        ))}
      </div>

      {/* Stake & Odds */}
      <div>
        <div className="flex gap-2 items-center mb-2">
          <div className="flex-1 border border-gray-200 px-3 py-2 rounded">ODDS<br />{totalOdds}</div>
          <input
            type="number"
            placeholder="Stake"
            className="flex-1 px-3 py-2 rounded border border-gray-200 bg-white text-black"
          />
        </div>
        <label className="text-xs flex items-center gap-2">
          <input type="checkbox" className="accent-blue-500" />
          Apply ACCA Edge - Get your stake back in cash if one leg lets you down.
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Returns <span className="font-bold text-black">US$0.00</span>
        </p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 text-sm text-yellow-800 p-3 rounded border border-yellow-200">
        <p className="font-semibold">⚠️ Maximum payout limits may be applied</p>
        <p>Bets are subject to Betfair's Terms & Conditions, including max payout.</p>
        <a href="#" className="text-blue-500 underline font-semibold">See T&Cs</a>
      </div>

      {/* Footer */}
      <div className="text-sm text-gray-500">
        <div className="flex justify-between">
          <span>Balance After Bet</span>
          <span>US$0.00</span>
        </div>
        <div className="flex justify-between">
          <span>Total Returns</span>
          <span>US$0.00</span>
        </div>
      </div>

      <button className="w-full py-2 bg-blue-500 text-white rounded mt-2 hover:bg-blue-600 transition-colors" disabled>
        Please Enter Stake
      </button>
    </aside>
  );
} 