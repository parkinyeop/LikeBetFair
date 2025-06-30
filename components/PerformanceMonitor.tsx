// 개발 환경 성능 모니터링 컴포넌트
import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  avgRenderTime: number;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  enabled?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  componentName, 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0
  });

  const [startTime] = useState(() => Date.now());
  const [renderTimes, setRenderTimes] = useState<number[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    setRenderTimes(prev => {
      const newTimes = [...prev, renderTime].slice(-10); // 최근 10개 기록만 유지
      const avgTime = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length;
      
      setMetrics(prevMetrics => ({
        renderCount: prevMetrics.renderCount + 1,
        lastRenderTime: renderTime,
        avgRenderTime: Math.round(avgTime * 100) / 100,
        memoryUsage: (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024 * 100) / 100 : undefined
      }));
      
      return newTimes;
    });
  });

  // 성능 경고 체크
  const getPerformanceWarning = () => {
    if (metrics.lastRenderTime > 16) return 'slow'; // 60fps 기준
    if (metrics.renderCount > 100) return 'excessive';
    return null;
  };

  if (!enabled) return null;

  const warning = getPerformanceWarning();

  return (
    <div className={`fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-2 rounded font-mono z-50 ${
      warning === 'slow' ? 'border-2 border-red-500' : 
      warning === 'excessive' ? 'border-2 border-yellow-500' : 
      'border border-gray-600'
    }`}>
      <div className="font-bold">{componentName}</div>
      <div>Renders: {metrics.renderCount}</div>
      <div>Last: {metrics.lastRenderTime}ms</div>
      <div>Avg: {metrics.avgRenderTime}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {metrics.memoryUsage}MB</div>
      )}
      {warning === 'slow' && (
        <div className="text-red-400 font-bold">⚠️ Slow render!</div>
      )}
      {warning === 'excessive' && (
        <div className="text-yellow-400 font-bold">⚠️ Too many renders!</div>
      )}
    </div>
  );
};

export default PerformanceMonitor; 