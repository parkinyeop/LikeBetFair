#!/bin/bash

echo "🚀 빌드 최적화 시작..."

# 1. 캐시 정리
echo "📦 npm 캐시 정리 중..."
npm cache clean --force

# 2. 불필요한 의존성 제거
echo "🧹 프로덕션 의존성만 유지 중..."
npm prune --production

# 3. 서버 의존성도 정리
echo "🖥️ 서버 의존성 정리 중..."
cd server
npm cache clean --force
npm prune --production
cd ..

# 4. 메모리 설정으로 빌드
echo "🔨 Next.js 빌드 중..."
NODE_OPTIONS='--max-old-space-size=4096' npm run build:optimized

# 5. 빌드 결과 확인
echo "✅ 빌드 완료!"
echo "📊 빌드 결과:"
ls -la .next/

echo "🎉 최적화 완료!" 