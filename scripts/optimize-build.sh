#!/bin/bash
echo "🚀 빌드 최적화 시작..."
echo "📦 npm 캐시 정리 중..."
npm cache clean --force
echo "🧹 프로덕션 의존성만 유지 중..."

# 실제 Next.js 빌드 실행
echo "🏗️ Next.js 앱 빌드 중..."
npx next build 