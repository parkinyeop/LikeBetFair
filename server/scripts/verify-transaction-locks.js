/**
 * 🔍 트랜잭션 + Lock 적용 검증 스크립트
 * 
 * exchange.js의 /match-order API에 트랜잭션과 Lock이 제대로 적용되었는지 확인
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exchangeFilePath = path.join(__dirname, '../routes/exchange.js');
const content = fs.readFileSync(exchangeFilePath, 'utf8');

console.log('🔍 트랜잭션 + Lock 적용 검증 중...\n');

// 검증 항목
const checks = [
  {
    name: '1. 트랜잭션 시작',
    pattern: /const transaction = await sequelize\.transaction\(\);/,
    line: 162
  },
  {
    name: '2. targetOrder Lock 적용',
    pattern: /lock: transaction\.LOCK\.UPDATE.*\n.*transaction/,
    line: 183
  },
  {
    name: '3. User Lock 적용',
    pattern: /const user = await User\.findByPk\(userId, \{[\s\S]*?lock: transaction\.LOCK\.UPDATE/,
    line: 302
  },
  {
    name: '4. balanceService에 transaction 전달',
    pattern: /await balanceService\.deductBalance\([\s\S]*?transaction\s*\)/,
    line: 313
  },
  {
    name: '5. ExchangeOrder.create에 transaction',
    pattern: /await ExchangeOrder\.create\(\{[\s\S]*?\}, \{ transaction \}\)/,
    line: 335
  },
  {
    name: '6. targetOrder.save에 transaction',
    pattern: /await targetOrder\.save\(\{ transaction \}\)/,
    line: 436
  },
  {
    name: '7. ExchangeOrderMatch.create에 transaction',
    pattern: /await ExchangeOrderMatch\.create\(\{[\s\S]*?\}, \{ transaction \}\)/,
    line: 462
  },
  {
    name: '8. 트랜잭션 커밋',
    pattern: /await transaction\.commit\(\)/,
    line: 492
  },
  {
    name: '9. catch 블록에서 rollback',
    pattern: /catch.*\{[\s]*await transaction\.rollback\(\)/,
    line: 513
  }
];

let passedCount = 0;
let failedCount = 0;

checks.forEach(check => {
  const found = check.pattern.test(content);
  if (found) {
    console.log(`✅ ${check.name} (예상 라인: ~${check.line})`);
    passedCount++;
  } else {
    console.log(`❌ ${check.name} - 찾을 수 없음!`);
    failedCount++;
  }
});

// Rollback 횟수 확인
const rollbackMatches = content.match(/await transaction\.rollback\(\)/g);
const rollbackCount = rollbackMatches ? rollbackMatches.length : 0;

console.log(`\n📊 Rollback 호출 횟수: ${rollbackCount}회`);
console.log('   예상: 10-15회 (모든 검증 실패 케이스 + catch 블록)');

if (rollbackCount < 10) {
  console.log('   ⚠️  일부 검증 실패 케이스에서 rollback이 누락되었을 수 있습니다.');
}

console.log(`\n🎯 최종 결과:`);
console.log(`   - 통과: ${passedCount}/${checks.length}개`);
console.log(`   - 실패: ${failedCount}/${checks.length}개`);

if (failedCount === 0 && rollbackCount >= 10) {
  console.log('\n🎉 검증 완료! 트랜잭션 + Lock이 올바르게 적용되었습니다.');
  process.exit(0);
} else {
  console.log('\n❌ 일부 항목이 누락되었습니다. 코드를 다시 확인하세요.');
  process.exit(1);
}

