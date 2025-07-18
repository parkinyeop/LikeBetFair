# Node.js 18 Alpine 이미지 사용 (가벼운 버전)
FROM node:18-alpine

# 메모리 제한 증가
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NODE_ENV=production

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./
COPY server/package*.json ./server/

# 프로덕션 의존성만 설치
RUN npm ci --only=production && \
    cd server && npm ci --only=production && \
    cd .. && \
    npm cache clean --force

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# 애플리케이션 시작
CMD ["npm", "start"] 