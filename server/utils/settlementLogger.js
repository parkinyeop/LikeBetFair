import fs from 'fs';
import path from 'path';

class SettlementLogger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    
    // 로그 디렉토리 확인 및 생성
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // ✅ 데일리 로그 파일명 생성
  getLogFilePath() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `settlement-${dateStr}.log`);
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${message}`;
    
    if (data) {
      logEntry += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    logEntry += '\n' + '─'.repeat(80) + '\n';
    
    // 콘솔 출력
    console.log(logEntry);
    
    // 파일 기록 (데일리 로그)
    try {
      const logFile = this.getLogFilePath();
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('로그 파일 쓰기 실패:', error);
    }
  }

  logSettlement(type, orderId, data) {
    this.log(`[${type}] 주문 ${orderId} 정산`, data);
  }

  logPayment(orderId, amount, balanceBefore, balanceAfter, memo) {
    this.log(`[PAYMENT] 주문 ${orderId}`, {
      amount,
      balanceBefore,
      balanceAfter,
      change: amount,
      memo
    });
  }

  logError(context, error) {
    this.log(`[ERROR] ${context}`, {
      message: error.message,
      stack: error.stack
    });
  }

  logRefund(orderId, amount, reason) {
    this.log(`[REFUND] 주문 ${orderId}`, {
      amount,
      reason
    });
  }
}

const settlementLogger = new SettlementLogger();
export default settlementLogger;

