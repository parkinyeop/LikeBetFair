import React, { useState, useEffect } from "react";

interface SidebarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  resetToHome?: boolean; // Reset to home signal
}

const Sidebar: React.FC<SidebarProps> = ({ categories, selected, onSelect, resetToHome }) => {
  // Separate main/sub categories
  const mainCategories = categories.filter(cat => !cat.includes(" > "));
  const subCategories = categories.filter(cat => cat.includes(" > "));

  // Currently selected main/sub
  const [currentMain, currentSub] = selected.includes(" > ")
    ? selected.split(" > ")
    : [selected, ""];

  // Separately manage subcategory open state
  const [openMain, setOpenMain] = useState<string | null>(currentMain || null);

  // Close all categories when resetToHome is true
  useEffect(() => {
    if (resetToHome) {
      setOpenMain(null);
    }
  }, [resetToHome]);

  // Sync openMain when selected changes
  useEffect(() => {
    if (selected.includes(" > ")) {
      const [main] = selected.split(" > ");
      setOpenMain(main);
    } else if (selected && mainCategories.includes(selected)) {
      // When only main category is selected
      setOpenMain(selected);
    }
  }, [selected, mainCategories]);

  return (
    <div className="flex flex-col p-3 space-y-1 h-full min-h-0 overflow-y-auto">
      {mainCategories.map((category) => {
        const isOpen = openMain === category;
        const isSelected = currentMain === category;

        return (
          <div key={category}>
            <button
              onClick={() => {
                // Change to toggle method
                if (isOpen) {
                  setOpenMain(null); // Close if open
                } else {
                  setOpenMain(category); // Open if closed
                  onSelect(category); // Select main category
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

            {/* Only show subcategories for openMain (open main) */}
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