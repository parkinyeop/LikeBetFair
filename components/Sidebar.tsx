import React from "react";

interface SidebarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ categories, selected, onSelect }) => {
  // 메인/서브 분리
  const mainCategories = categories.filter(cat => !cat.includes(" > "));
  const subCategories = categories.filter(cat => cat.includes(" > "));

  // 현재 선택된 메인 카테고리와 서브 카테고리
  const [currentMain, currentSub] = selected.includes(" > ")
    ? selected.split(" > ")
    : [selected, ""];

  return (
    <div className="flex flex-col p-4 space-y-1">
      {mainCategories.map((category) => {
        const isSelectedMain = currentMain === category;

        return (
          <div key={category}>
            <button
              onClick={() => {
                // 클릭된 카테고리가 이미 선택된 메인이 아니라면 갱신
                if (currentMain !== category) {
                  onSelect(category); // 메인만 선택됨
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                isSelectedMain
                  ? "font-bold bg-white shadow text-blue-600"
                  : "text-gray-700 hover:bg-gray-300"
              }`}
            >
              {category}
            </button>

            {/* 선택된 메인 카테고리만 하위 표시 */}
            {isSelectedMain && (
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