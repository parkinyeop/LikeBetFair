// 임시 버튼 스타일 함수 - pages/exchange.tsx 호환성을 위해 유지
export const getButtonStyle = (isActive: boolean, isDisabled: boolean, isSelected: boolean = false, isLarge: boolean = false) => {
  const baseStyle = isLarge
    ? "w-full h-16 px-4 py-2 rounded text-white font-bold transition-all duration-200 border-2 border-gray-400 flex flex-col justify-center items-center"
    : "flex-1 p-2 rounded-lg text-center text-white text-sm transition-all duration-200";

  if (isDisabled) {
    return `${baseStyle} cursor-not-allowed bg-gray-600 text-white`;
  }

  if (isSelected) {
    return `${baseStyle} bg-yellow-500 hover:bg-yellow-600 cursor-pointer shadow-lg hover:shadow-xl border-2 border-yellow-400`;
  }

  if (isActive) {
    return `${baseStyle} bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg hover:shadow-xl border-2 border-blue-400`;
  }

  return `${baseStyle} bg-gray-400 cursor-not-allowed border-2 border-gray-500`;
};
