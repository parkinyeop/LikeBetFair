import React, { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface BetCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  betId: string;
  betInfo: {
    userId: string;
    stake: number;
    status: string;
    selections?: any[];
  };
  loading?: boolean;
}

const CANCEL_REASONS = [
  { value: 'system_error', label: '시스템 오류' },
  { value: 'invalid_game_data', label: '잘못된 경기 데이터' },
  { value: 'duplicate_bet', label: '중복 베팅' },
  { value: 'fraud_detected', label: '부정 베팅 감지' },
  { value: 'user_request', label: '사용자 요청' },
  { value: 'game_cancelled', label: '경기 취소/연기' },
  { value: 'other', label: '기타' }
];

export default function BetCancelModal({
  isOpen,
  onClose,
  onConfirm,
  betId,
  betInfo,
  loading = false
}: BetCancelModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirm = () => {
    const reason = selectedReason === 'other' ? customReason : 
      CANCEL_REASONS.find(r => r.value === selectedReason)?.label || '';
    
    if (!reason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }
    
    setShowConfirmModal(true);
  };

  const handleFinalConfirm = () => {
    const reason = selectedReason === 'other' ? customReason : 
      CANCEL_REASONS.find(r => r.value === selectedReason)?.label || '';
    
    onConfirm(reason);
    setShowConfirmModal(false);
    handleClose();
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    setShowConfirmModal(false);
    onClose();
  };

  const getRefundAmount = () => {
    return betInfo.stake.toLocaleString();
  };

  const isCancellable = () => {
    return betInfo.status === 'pending' || betInfo.status === 'open';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 메인 취소 모달 */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
          </div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    베팅 취소
                  </h3>
                  <div className="mt-2">
                    <div className="text-sm text-gray-500 mb-4">
                      <p>다음 베팅을 취소하고 환불 처리합니다:</p>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <div><strong>베팅 ID:</strong> {betId}</div>
                        <div><strong>유저 ID:</strong> {betInfo.userId}</div>
                        <div><strong>베팅 금액:</strong> {getRefundAmount()}원</div>
                        <div><strong>환불 예정:</strong> {getRefundAmount()}원</div>
                      </div>
                    </div>

                    {!isCancellable() && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              취소 불가능한 상태
                            </h3>
                            <div className="mt-1 text-sm text-yellow-700">
                              현재 상태({betInfo.status})에서는 취소할 수 없습니다.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          취소 사유 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedReason}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={!isCancellable()}
                        >
                          <option value="">취소 사유를 선택하세요</option>
                          {CANCEL_REASONS.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedReason === 'other' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            상세 사유 <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="취소 사유를 상세히 입력해주세요"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            disabled={!isCancellable()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirm}
                disabled={!isCancellable() || loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    처리 중...
                  </div>
                ) : (
                  '베팅 취소'
                )}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleClose}
                disabled={loading}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 최종 확인 모달 */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleFinalConfirm}
        title="베팅 취소 최종 확인"
        message={`정말로 이 베팅을 취소하고 ${getRefundAmount()}원을 환불하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        confirmText="취소 및 환불"
        cancelText="돌아가기"
        confirmButtonColor="red"
        loading={loading}
      />
    </>
  );
}
