import fs from 'fs';
import path from 'path';

/**
 * 오래된 로그 파일 자동 삭제
 * @param {number} daysToKeep - 보관할 일수 (기본 7일)
 */
export function cleanupOldLogs(daysToKeep = 7) {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    console.log('[LogCleanup] 로그 디렉토리 없음');
    return;
  }

  try {
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // 밀리초 단위
    
    const files = fs.readdirSync(logsDir);
    let deletedCount = 0;
    let totalSize = 0;
    let skippedCount = 0;

    files.forEach(file => {
      // ✅ 정산 로그는 영구 보관 (삭제하지 않음)
      if (file.startsWith('settlement-')) {
        skippedCount++;
        console.log(`[LogCleanup] 보관: ${file} (정산 로그는 영구 보관)`);
        return;
      }

      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      // 파일 생성 시간 확인
      const fileAge = now - stats.mtime.getTime();
      
      if (fileAge > maxAge) {
        const fileSize = stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        totalSize += fileSize;
        console.log(`[LogCleanup] 삭제: ${file} (${(fileSize / 1024 / 1024).toFixed(2)} MB, ${Math.floor(fileAge / (24 * 60 * 60 * 1000))}일 전)`);
      }
    });

    if (deletedCount > 0) {
      console.log(`[LogCleanup] 완료: ${deletedCount}개 파일 삭제, ${skippedCount}개 보관, ${(totalSize / 1024 / 1024).toFixed(2)} MB 확보`);
    } else {
      console.log(`[LogCleanup] 삭제할 로그 없음 (${daysToKeep}일 이내, ${skippedCount}개 정산 로그 보관)`);
    }
  } catch (error) {
    console.error('[LogCleanup] 오류:', error.message);
  }
}

/**
 * 로그 파일 크기 확인 및 통계
 */
export function getLogStats() {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    return { totalFiles: 0, totalSize: 0, files: [] };
  }

  const files = fs.readdirSync(logsDir);
  let totalSize = 0;
  const fileList = [];

  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    fileList.push({
      name: file,
      size: stats.size,
      sizeInMB: (stats.size / 1024 / 1024).toFixed(2),
      age: Math.floor((Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000))
    });
  });

  return {
    totalFiles: files.length,
    totalSize,
    totalSizeInMB: (totalSize / 1024 / 1024).toFixed(2),
    files: fileList.sort((a, b) => b.size - a.size) // 크기순 정렬
  };
}

export default { cleanupOldLogs, getLogStats };

