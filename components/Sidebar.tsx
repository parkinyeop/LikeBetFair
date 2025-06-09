import React from 'react';

type SidebarProps = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

const Sidebar = ({ categories, selected, onSelect }: SidebarProps) => {
  return (
    <div className="h-full flex flex-col justify-between">
      <div className="p-4">
        <h3 className="text-lg font-bold mb-2">Basketball</h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <div
              key={cat}
              onClick={() => onSelect(cat)}
              className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-200 ${
                selected === cat ? "bg-blue-500 text-white font-semibold" : "text-blue-700"
              }`}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-black text-white text-center py-2 text-sm">Next Horse Race</div>
    </div>
  );
};

export default Sidebar; 