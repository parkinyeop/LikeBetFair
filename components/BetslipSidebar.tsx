import React from "react";
import BetSelectionPanel from "./BetSelectionPanel";

export default function BetslipSidebar() {
  return (
    <aside className="w-80 bg-white text-black p-4 space-y-4 border-l border-gray-200">
      <h2 className="text-lg font-bold">Betslip</h2>
      <BetSelectionPanel />
    </aside>
  );
} 