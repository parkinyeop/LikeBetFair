import React from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  onReset?: () => void;
  className?: string;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "검색...",
  filters = [],
  onReset,
  className = ""
}: FilterBarProps) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow mb-6 ${className}`}>
      <div className="flex flex-wrap gap-4 items-end">
        {/* 검색 입력 */}
        <div className="flex-1 min-w-64">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            검색
          </label>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 필터들 */}
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {filter.label}
            </label>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* 리셋 버튼 */}
        {onReset && (
          <div>
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
