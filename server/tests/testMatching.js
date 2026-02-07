import teamMatchingService from '../services/teamMatchingService.js';

// 테스트 데이터
const order = {
  homeTeam: 'Detroit Tigers',
  awayTeam: 'New York Mets',
  commenceTime: new Date('2025-09-01T08:11:00Z')
};

const gameResult = {
  homeTeam: 'Houston Astros',
  awayTeam: 'Detroit Tigers',
  commenceTime: new Date('2025-04-27T21:10:00Z')
};

console.log('🧪 팀명 매칭 테스트');
console.log('주문:', order);
console.log('경기 결과:', gameResult);

const matchingInfo = teamMatchingService.getMatchingInfo(order, gameResult);
console.log('\n매칭 정보:', matchingInfo);

console.log('\n매칭 결과:', matchingInfo.overallMatch ? '✅ 매칭됨' : '❌ 매칭 안됨');
