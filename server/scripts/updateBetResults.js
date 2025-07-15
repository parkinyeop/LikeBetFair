import betResultService from '../services/betResultService.js';

async function updateBetResults() {
  try {
    console.log('베팅 결과 업데이트 시작...');
    const result = await betResultService.updateBetResults();
    console.log('업데이트 결과:', result);
  } catch (err) {
    console.error('에러:', err.message);
  }
}

updateBetResults(); 