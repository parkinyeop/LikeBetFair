import React, { useState, useEffect } from "react";

interface SidebarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  resetToHome?: boolean; // 홈으로 리셋 신호
}

const Sidebar: React.FC<SidebarProps> = ({ categories, selected, onSelect, resetToHome }) => {
  // 메인/서브 분리
  const mainCategories = categories.filter(cat => !cat.includes(" > "));
  const subCategories = categories.filter(cat => cat.includes(" > "));

  // 현재 선택된 메인/서브
  const [currentMain, currentSub] = selected.includes(" > ")
    ? selected.split(" > ")
    : [selected, ""];

  // 하위 카테고리 열림 상태를 별도 관리
  const [openMain, setOpenMain] = useState<string | null>(currentMain || null);

  // resetToHome이 true일 때 모든 카테고리 닫기
  useEffect(() => {
    if (resetToHome) {
      setOpenMain(null);
    }
  }, [resetToHome]);

  // selected가 변경될 때 openMain 동기화
  useEffect(() => {
    if (selected.includes(" > ")) {
      const [main] = selected.split(" > ");
      setOpenMain(main);
    } else if (selected && mainCategories.includes(selected)) {
      // 메인 카테고리만 선택된 경우
      setOpenMain(selected);
    }
  }, [selected, mainCategories]);

  return (
    <div className="flex flex-col p-4 space-y-1 h-full min-h-0 overflow-y-auto">
      {mainCategories.map((category) => {
        const isOpen = openMain === category;
        const isSelected = currentMain === category;

        return (
          <div key={category}>
            <button
              onClick={() => {
                // 토글 방식으로 변경
                if (isOpen) {
                  setOpenMain(null); // 열려있으면 닫기
                } else {
                  setOpenMain(category); // 닫혀있으면 열기
                  onSelect(category); // 메인 카테고리 선택
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                isSelected
                  ? "font-bold bg-white shadow text-blue-600"
                  : "text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category}
            </button>

            {/* openMain(열린 메인)만 하위 표시 */}
            {isOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {subCategories
                  .filter(sub => sub.startsWith(`${category} > `))
                  .map(subCat => {
                    const subLabel = subCat.split(" > ")[1];
                    const isSelectedSub = currentSub === subLabel;
                    return (
                      <button
                        key={subCat}
                        onClick={() => onSelect(subCat)}
                        className={`w-full text-left px-3 py-1 text-sm rounded-md transition-colors ${
                          isSelectedSub
                            ? "font-bold bg-white shadow text-blue-600"
                            : "text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {subLabel}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Sidebar; 