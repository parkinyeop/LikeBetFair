# 테스트 파일들

이 디렉토리는 프로젝트의 테스트 파일들을 포함합니다.

## 파일 목록

### `testNewSettlement.js`
- **목적**: 새로운 Exchange 정산 시스템 테스트
- **기능**: 
  - 시간+팀명 기반 매칭 로직 테스트
  - 정산 서비스 실행 및 결과 확인
- **실행 방법**: `node server/tests/testNewSettlement.js`

### `testMatching.js`
- **목적**: 팀명 매칭 서비스 테스트
- **기능**:
  - 자연어 처리 기반 팀명 매칭 테스트
  - 매칭 정확도 확인
- **실행 방법**: `node server/tests/testMatching.js`

## 사용법

```bash
# 정산 시스템 테스트
cd server
node tests/testNewSettlement.js

# 팀명 매칭 테스트
cd server
node tests/testMatching.js
```

## 주의사항

- 테스트 실행 전 데이터베이스 연결이 필요합니다
- 프로덕션 환경에서는 주의해서 실행하세요
- 테스트 후 생성된 데이터는 정리하세요
