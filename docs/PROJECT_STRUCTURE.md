# 프로젝트 구조 가이드

## 디렉토리 구조
- `/` : Next.js 프론트엔드 (개발 서버 포트: 3000)
- `/server` : Express.js 백엔드 API 서버 (개발 서버 포트: 5050)
- `/components` : React 컴포넌트
- `/pages` : Next.js 페이지 라우트
- `/pages/api` : Next.js API 라우트 (BFF 역할)
- `/public` : 정적 파일 (이미지 등)
- `/styles` : 글로벌 CSS 스타일
- `/utils` : 클라이언트 측 유틸리티 함수
- `/config` : 클라이언트 측 설정 파일
- `/hooks` : React 커스텀 훅
- `/contexts` : React 컨텍스트
- `/server/config` : 서버 측 설정 파일
- `/server/controllers` : API 요청 처리 로직 (Controller)
- `/server/models` : Sequelize 데이터베이스 모델
- `/server/migrations` : 데이터베이스 스키마 마이그레이션
- `/server/routes` : Express API 라우트 정의
- `/server/services` : 비즈니스 로직 처리 (Service)
- `/server/utils` : 서버 측 유틸리티 함수
- `/docs` : 프로젝트 관련 문서

## 실행 방법
- `npm run dev` : 프론트엔드와 백엔드 서버 동시 실행
- `npm run dev:client` : 프론트엔드 서버만 실행
- `npm run dev:server` : 백엔드 서버만 실행

## 의존성 관리
- **루트 `package.json`**: 프론트엔드(Next.js) 및 전체 프로젝트 공통 개발 도구(ESLint, Prettier 등)의 의존성을 관리합니다.
- **`server/package.json`**: 백엔드(Express) 전용 의존성을 관리합니다.
