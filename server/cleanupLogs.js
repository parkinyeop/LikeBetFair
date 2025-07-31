import fs from 'fs';
import path from 'path';

async function cleanupLogs() {
  try {
    console.log('🧹 과도한 로그 정리 시작...');
    
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      console.log('❌ 로그 디렉토리가 존재하지 않습니다.');
      return;
    }
    
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('scheduler_') && file.endsWith('.log'))
      .sort();
    
    console.log(`📁 처리할 로그 파일: ${logFiles.length}개`);
    
    for (const logFile of logFiles) {
      const filePath = path.join(logsDir, logFile);
      console.log(`\n📄 처리 중: ${logFile}`);
      
      // 로그 파일 읽기
      const logContent = fs.readFileSync(filePath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      console.log(`   원본 로그 수: ${lines.length}개`);
      
      // 중복 init 로그 제거
      const cleanedLines = [];
      const seenInitLogs = new Set();
      let duplicateCount = 0;
      
      for (const line of lines) {
        try {
          const log = JSON.parse(line);
          
          // init 타입 로그 중복 체크
          if (log.type === 'init' && log.status === 'start') {
            const key = `${log.type}_${log.status}_${log.message}`;
            if (seenInitLogs.has(key)) {
              duplicateCount++;
              continue; // 중복 로그 생략
            }
            seenInitLogs.add(key);
          }
          
          // 불필요한 데이터 제거
          if (log.categories && Array.isArray(log.categories)) {
            log.categoryCount = log.categories.length;
            delete log.categories;
          }
          
          cleanedLines.push(JSON.stringify(log));
        } catch (e) {
          // 파싱 실패한 라인은 그대로 유지
          cleanedLines.push(line);
        }
      }
      
      console.log(`   중복 제거: ${duplicateCount}개`);
      console.log(`   정리된 로그 수: ${cleanedLines.length}개`);
      
      // 백업 파일 생성
      const backupPath = filePath + '.backup';
      fs.copyFileSync(filePath, backupPath);
      console.log(`   백업 생성: ${logFile}.backup`);
      
      // 정리된 로그 저장
      fs.writeFileSync(filePath, cleanedLines.join('\n') + '\n');
      console.log(`   ✅ 정리 완료: ${logFile}`);
    }
    
    console.log('\n🎉 모든 로그 파일 정리 완료!');
    
  } catch (error) {
    console.error('❌ 로그 정리 중 오류 발생:', error);
  }
}

cleanupLogs(); 