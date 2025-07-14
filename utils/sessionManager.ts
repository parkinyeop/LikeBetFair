// 다중 계정 접속을 위한 세션 관리 유틸리티

interface SessionInfo {
  username: string;
  token: string;
  balance: number;
  isAdmin: boolean;
  adminLevel: number;
  lastLogin: number;
}

class SessionManager {
  private static instance: SessionManager;
  private currentSessionKey: string = 'current_session';
  private sessionsKey: string = 'user_sessions';

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // 현재 세션 키 생성 (탭별 고유 식별자)
  private getSessionKey(): string {
    return `${this.currentSessionKey}_${window.location.hostname}_${window.name || 'default'}`;
  }

  // 사용자별 세션 저장
  saveUserSession(username: string, sessionData: Omit<SessionInfo, 'username' | 'lastLogin'>): void {
    try {
      const sessions = this.getAllSessions();
      const sessionInfo: SessionInfo = {
        ...sessionData,
        username,
        lastLogin: Date.now()
      };
      
      sessions[username] = sessionInfo;
      localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
      
      // 현재 세션으로 설정
      this.setCurrentSession(username);
      
      console.log(`[SessionManager] 사용자 세션 저장: ${username}`);
    } catch (error) {
      console.error('[SessionManager] 세션 저장 실패:', error);
    }
  }

  // 현재 세션 설정
  setCurrentSession(username: string): void {
    try {
      const sessionKey = this.getSessionKey();
      localStorage.setItem(sessionKey, username);
      console.log(`[SessionManager] 현재 세션 설정: ${username}`);
    } catch (error) {
      console.error('[SessionManager] 현재 세션 설정 실패:', error);
    }
  }

  // 현재 세션 가져오기
  getCurrentSession(): SessionInfo | null {
    try {
      const sessionKey = this.getSessionKey();
      const currentUsername = localStorage.getItem(sessionKey);
      
      if (!currentUsername) {
        console.log('[SessionManager] 현재 세션 없음');
        return null;
      }

      const sessions = this.getAllSessions();
      const session = sessions[currentUsername];
      
      if (!session) {
        console.log(`[SessionManager] 사용자 세션 없음: ${currentUsername}`);
        return null;
      }

      console.log(`[SessionManager] 현재 세션 로드: ${currentUsername}`);
      return session;
    } catch (error) {
      console.error('[SessionManager] 현재 세션 로드 실패:', error);
      return null;
    }
  }

  // 모든 세션 가져오기
  getAllSessions(): Record<string, SessionInfo> {
    try {
      const sessions = localStorage.getItem(this.sessionsKey);
      return sessions ? JSON.parse(sessions) : {};
    } catch (error) {
      console.error('[SessionManager] 세션 목록 로드 실패:', error);
      return {};
    }
  }

  // 특정 사용자 세션 가져오기
  getUserSession(username: string): SessionInfo | null {
    try {
      const sessions = this.getAllSessions();
      return sessions[username] || null;
    } catch (error) {
      console.error('[SessionManager] 사용자 세션 로드 실패:', error);
      return null;
    }
  }

  // 세션 삭제
  removeSession(username: string): void {
    try {
      const sessions = this.getAllSessions();
      delete sessions[username];
      localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
      
      // 현재 세션이 삭제된 세션이면 현재 세션도 제거
      const currentSession = this.getCurrentSession();
      if (currentSession && currentSession.username === username) {
        const sessionKey = this.getSessionKey();
        localStorage.removeItem(sessionKey);
      }
      
      console.log(`[SessionManager] 세션 삭제: ${username}`);
    } catch (error) {
      console.error('[SessionManager] 세션 삭제 실패:', error);
    }
  }

  // 모든 세션 삭제
  clearAllSessions(): void {
    try {
      localStorage.removeItem(this.sessionsKey);
      const sessionKey = this.getSessionKey();
      localStorage.removeItem(sessionKey);
      console.log('[SessionManager] 모든 세션리어');
    } catch (error) {
      console.error('[SessionManager] 세션 전체 삭제 실패:', error);
    }
  }

  // 세션 유효성 검사
  isSessionValid(session: SessionInfo): boolean {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    
    return (now - session.lastLogin) < maxAge;
  }

  // 만료된 세션 정리
  cleanupExpiredSessions(): void {
    try {
      const sessions = this.getAllSessions();
      const validSessions: Record<string, SessionInfo> = {};
      
      Object.entries(sessions).forEach(([username, session]) => {
        if (this.isSessionValid(session)) {
          validSessions[username] = session;
        } else {
          console.log(`[SessionManager] 만료된 세션 제거: ${username}`);
        }
      });
      
      localStorage.setItem(this.sessionsKey, JSON.stringify(validSessions));
    } catch (error) {
      console.error('[SessionManager] 만료 세션 정리 실패:', error);
    }
  }

  // 세션 정보 출력 (디버깅용)
  debugSessions(): void {
    try {
      const sessions = this.getAllSessions();
      const currentSession = this.getCurrentSession();
      
      console.log('[SessionManager] 디버그 정보:');
      console.log('- 현재 세션:', currentSession);
      console.log('- 전체 세션 수:', Object.keys(sessions).length);
      console.log('- 세션 목록:', Object.keys(sessions));
    } catch (error) {
      console.error('[SessionManager] 디버그 정보 출력 실패:', error);
    }
  }
}

export default SessionManager.getInstance(); 