import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../config/apiConfig';

interface UseAdminApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  immediate?: boolean; // 즉시 실행할지 여부
  queryParams?: Record<string, string>; // 쿼리 파라미터
}

interface UseAdminApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export function useAdminApi<T>(
  path: string, 
  options: UseAdminApiOptions = {}
): UseAdminApiReturn<T> {
  const { method = 'GET', body, headers = {}, immediate = true, queryParams } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    // AuthContext와 동일한 방식으로 토큰 가져오기
    const tabId = sessionStorage.getItem('tabId');
    const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...headers
    };
  }, [headers]);

  const buildUrl = useCallback(() => {
    let url = buildApiUrl(path);
    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return url;
  }, [path, queryParams]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // AuthContext와 동일한 방식으로 토큰 가져오기
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      if (!token) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return;
      }
      
      const requestOptions: RequestInit = {
        method,
        headers: getAuthHeaders(),
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      const url = buildUrl();
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 토큰 만료 처리
        if (response.status === 401 || errorData.error === 'jwt expired') {
          // AuthContext와 동일한 방식으로 토큰 제거
          const tabId = sessionStorage.getItem('tabId');
          if (tabId) {
            sessionStorage.removeItem(`token_${tabId}`);
          }
          setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
          // 페이지 리로드하여 로그인 페이지로 이동
          window.location.href = '/admin';
          return;
        }
        
        // ✅ 에러 타입 포함
        const errorType = errorData.error || errorData.type || 'Unknown';
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`[${errorType}] ${errorMessage}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'API 요청에 실패했습니다.');
      console.error('API 요청 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [method, body, getAuthHeaders, buildUrl]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, path, JSON.stringify(queryParams)]); // ✅ queryParams를 JSON 문자열로 비교

  // 🔄 5분마다 자동 갱신 (별도 useEffect로 분리)
  useEffect(() => {
    if (!immediate) return;

    const intervalId = setInterval(() => {
      console.log(`[useAdminApi] 자동 갱신 실행 (5분): ${path}`);
      fetchData();
    }, 5 * 60 * 1000); // 300,000ms = 5분

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, path]); // ✅ 자동 갱신은 path만 의존

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    mutate
  };
}

// 특별한 용도의 Hook들
export function useAdminApiMutation<T, R = any>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST',
  onSuccess?: () => void // 성공 후 콜백
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (body?: T): Promise<R | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // AuthContext와 동일한 방식으로 토큰 가져오기
      const tabId = sessionStorage.getItem('tabId');
      const token = tabId ? sessionStorage.getItem(`token_${tabId}`) : null;
      if (!token) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return null;
      }
      
      const response = await fetch(buildApiUrl(path), {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // 토큰 만료 처리
        if (response.status === 401 || errorData.error === 'jwt expired') {
          // AuthContext와 동일한 방식으로 토큰 제거
          const tabId = sessionStorage.getItem('tabId');
          if (tabId) {
            sessionStorage.removeItem(`token_${tabId}`);
          }
          setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
          // 페이지 리로드하여 로그인 페이지로 이동
          window.location.href = '/admin';
          return null;
        }
        
        // ✅ 에러 타입 포함
        const errorType = errorData.error || errorData.type || 'Unknown';
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`[${errorType}] ${errorMessage}`);
      }

      const result = await response.json();
      
      // 성공 후 콜백 호출
      if (onSuccess) {
        onSuccess();
      }
      
      return result;
    } catch (err: any) {
      setError(err.message || 'API 요청에 실패했습니다.');
      console.error('API 요청 오류:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path, method, onSuccess]);

  return {
    mutate,
    loading,
    error
  };
}

// 페이지네이션을 위한 Hook
export function useAdminApiWithPagination<T>(
  path: string,
  initialParams: Record<string, any> = {}
) {
  const [params, setParams] = useState(initialParams);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryString = new URLSearchParams({
    ...params,
    page: page.toString(),
    limit: limit.toString()
  }).toString();

  const fullPath = `${path}?${queryString}`;
  
  const { data, loading, error, refetch } = useAdminApi<T>(fullPath);

  const updateParams = useCallback((newParams: Record<string, any>) => {
    setParams(newParams);
    setPage(1); // 파라미터 변경 시 첫 페이지로
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    params,
    updateParams,
    page,
    goToPage,
    limit
  };
}
