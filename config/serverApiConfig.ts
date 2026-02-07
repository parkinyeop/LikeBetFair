// 서버 사이드용 API 설정 파일
// Next.js API 라우트에서 사용

/**
 * 서버 사이드용 API URL 생성
 */
export function buildServerApiUrl(endpoint: string, params?: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://likebetfair.onrender.com';
  let url = `${baseUrl}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}

/**
 * 서버 사이드용 기본 헤더
 */
export function getServerHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * 서버 사이드용 환경 설정
 */
export const SERVER_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'https://likebetfair.onrender.com',
  TIMEOUT: 10000,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};
