import dotenv from 'dotenv';
import SeasonStatusChecker from '../services/seasonStatusChecker.js';

// 환경 변수 로드
dotenv.config();

async function main() {
  console.log('🔍 시즌 상태 체크 스크립트 실행\n');
  
  // API 키 확인
  if (!process.env.ODDS_API_KEY) {
    console.error('❌ ODDS_API_KEY 환경 변수가 설정되어 있지 않습니다');
    process.exit(1);
  }
  
  if (!process.env.THESPORTSDB_API_KEY) {
    console.error('❌ THESPORTSDB_API_KEY 환경 변수가 설정되어 있지 않습니다');
    process.exit(1);
  }
  
  const checker = new SeasonStatusChecker();
  
  try {
    const results = await checker.checkAllLeagues();
    
    console.log('\n📊 시즌 상태 체크 결과:');
    console.log('='.repeat(80));
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.league} (${result.sportKey})`);
      
      if (result.error) {
        console.log(`   ❌ 오류: ${result.error}`);
      } else {
        const statusIcon = result.newStatus === 'active' ? '🔵' : 
                          result.newStatus === 'break' ? '🟡' : '⚪';
        
        console.log(`   현재 상태: ${result.oldStatus || 'N/A'}`);
        console.log(`   감지 상태: ${statusIcon} ${result.newStatus}`);
        console.log(`   변경 여부: ${result.changed ? '✅ 변경됨' : '➖ 변경없음'}`);
        console.log(`   감지 사유: ${result.reason}`);
      }
    });
    
    // 요약 통계
    const successful = results.filter(r => !r.error);
    const changed = results.filter(r => r.changed);
    const errors = results.filter(r => r.error);
    
    console.log('\n📈 요약 통계:');
    console.log('='.repeat(40));
    console.log(`총 체크 리그: ${results.length}개`);
    console.log(`성공적 체크: ${successful.length}개`);
    console.log(`상태 변경된 리그: ${changed.length}개`);
    console.log(`오류 발생: ${errors.length}개`);
    
    if (changed.length > 0) {
      console.log('\n🔄 변경된 리그들:');
      changed.forEach(league => {
        console.log(`- ${league.league}: ${league.oldStatus} → ${league.newStatus}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 전체 체크 실패:', error);
    process.exit(1);
  }
}

main(); 