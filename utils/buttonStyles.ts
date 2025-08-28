// 🎯 공통 버튼 스타일 함수 - 모든 마켓 버튼에서 재사용
export const getButtonStyle = (isActive: boolean, isDisabled: boolean, isSelected: boolean = false, isLarge: boolean = true) => {
  console.log('🎨 getButtonStyle 호출됨:', { isActive, isDisabled, isSelected, isLarge });
  
  const baseStyle = isLarge
    ? "w-full h-16 px-4 py-2 rounded text-white font-bold transition-all duration-200 border-2 border-gray-400 flex flex-col justify-center items-center"
    : "flex-1 p-2 rounded-lg text-center text-white text-sm transition-all duration-200";

  if (isDisabled) {
    console.log('🎨 getButtonStyle 결과: 비활성화 (어두운 회색)');
    return `${baseStyle} cursor-not-allowed bg-gray-600 text-white`;
  }

  if (isSelected) {
    console.log('🎨 getButtonStyle 결과: 선택됨 (노란색)');
    return `${baseStyle} bg-yellow-500 hover:bg-yellow-600 cursor-pointer shadow-lg hover:shadow-xl`;
  }

  if (isActive) {
    console.log('🎨 getButtonStyle 결과: 활성화 (파란색)');
    return `${baseStyle} bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-lg hover:shadow-xl`;
  }

  console.log('🎨 getButtonStyle 결과: 기본 (회색)');
  return `${baseStyle} bg-gray-400 cursor-not-allowed`;
};
