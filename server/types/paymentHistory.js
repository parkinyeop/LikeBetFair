/**
 * PaymentHistory 거래 유형 및 상태 정의
 *
 * 이 파일은 PaymentHistory 테이블의 transactionType과 status 필드에
 * 사용될 수 있는 값들을 상수로 정의합니다.
 *
 * 장점:
 * 1. 오타 방지
 * 2. IDE 자동완성 지원
 * 3. 일관성 유지
 * 4. 타입 안정성 (TypeScript 전환 시 그대로 사용 가능)
 */

/**
 * 거래 유형 (Transaction Type)
 */
export const TransactionType = {
  // 스포츠북 관련
  SPORTSBOOK_BET_DEDUCT: 'SPORTSBOOK_BET_DEDUCT',           // 스포츠북 베팅 차감
  SPORTSBOOK_WIN_PAYOUT: 'SPORTSBOOK_WIN_PAYOUT',           // 스포츠북 당첨금 지급
  SPORTSBOOK_CANCEL_REFUND: 'SPORTSBOOK_CANCEL_REFUND',     // 스포츠북 베팅 취소 환불
  SPORTSBOOK_RESETTLE: 'SPORTSBOOK_RESETTLE',               // 스포츠북 재정산

  // 익스체인지 주문 관련
  EXCHANGE_ORDER_DEDUCT: 'EXCHANGE_ORDER_DEDUCT',           // 익스체인지 주문 차감
  EXCHANGE_PARTIAL_REFUND: 'EXCHANGE_PARTIAL_REFUND',       // 익스체인지 부분 매칭 환불
  EXCHANGE_CANCEL_REFUND: 'EXCHANGE_CANCEL_REFUND',         // 익스체인지 주문 취소 환불
  EXCHANGE_SETTLEMENT: 'EXCHANGE_SETTLEMENT',               // 익스체인지 정산 (actualProfit)

  // 익스체인지 멀티베팅 관련
  EXCHANGE_MULTIBET_DEDUCT: 'EXCHANGE_MULTIBET_DEDUCT',     // 익스체인지 멀티베팅 차감
  EXCHANGE_MULTIBET_SETTLEMENT: 'EXCHANGE_MULTIBET_SETTLEMENT', // 익스체인지 멀티베팅 정산

  // 기타
  INITIAL_BALANCE: 'INITIAL_BALANCE',                       // 초기 잔액
  ROLLBACK_FIX: 'ROLLBACK_FIX',                             // 롤백/수정 거래
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',                   // 수동 조정 (관리자)
};

/**
 * 거래 상태 (Transaction Status)
 */
export const TransactionStatus = {
  COMPLETED: 'completed',       // 정상 완료
  ROLLED_BACK: 'rolled_back',   // 롤백됨
  PENDING: 'pending',           // 대기 중
  FAILED: 'failed',             // 실패
};

/**
 * TransactionType 배열 (유효성 검증용)
 */
export const VALID_TRANSACTION_TYPES = Object.values(TransactionType);

/**
 * TransactionStatus 배열 (유효성 검증용)
 */
export const VALID_TRANSACTION_STATUSES = Object.values(TransactionStatus);

/**
 * TransactionType 한글 레이블 매핑
 */
export const TransactionTypeLabels = {
  [TransactionType.SPORTSBOOK_BET_DEDUCT]: '스포츠북 베팅 차감',
  [TransactionType.SPORTSBOOK_WIN_PAYOUT]: '스포츠북 당첨금 지급',
  [TransactionType.SPORTSBOOK_CANCEL_REFUND]: '스포츠북 베팅 취소 환불',
  [TransactionType.SPORTSBOOK_RESETTLE]: '스포츠북 재정산',
  [TransactionType.EXCHANGE_ORDER_DEDUCT]: '익스체인지 주문 차감',
  [TransactionType.EXCHANGE_PARTIAL_REFUND]: '익스체인지 부분 매칭 환불',
  [TransactionType.EXCHANGE_CANCEL_REFUND]: '익스체인지 주문 취소 환불',
  [TransactionType.EXCHANGE_SETTLEMENT]: '익스체인지 정산',
  [TransactionType.EXCHANGE_MULTIBET_DEDUCT]: '익스체인지 멀티베팅 차감',
  [TransactionType.EXCHANGE_MULTIBET_SETTLEMENT]: '익스체인지 멀티베팅 정산',
  [TransactionType.INITIAL_BALANCE]: '초기 잔액',
  [TransactionType.ROLLBACK_FIX]: '롤백/수정',
  [TransactionType.MANUAL_ADJUSTMENT]: '수동 조정',
};

/**
 * TransactionType이 유효한지 검증
 * @param {string} type
 * @returns {boolean}
 */
export function isValidTransactionType(type) {
  return VALID_TRANSACTION_TYPES.includes(type);
}

/**
 * TransactionStatus가 유효한지 검증
 * @param {string} status
 * @returns {boolean}
 */
export function isValidTransactionStatus(status) {
  return VALID_TRANSACTION_STATUSES.includes(status);
}

export default {
  TransactionType,
  TransactionStatus,
  VALID_TRANSACTION_TYPES,
  VALID_TRANSACTION_STATUSES,
  TransactionTypeLabels,
  isValidTransactionType,
  isValidTransactionStatus,
};
