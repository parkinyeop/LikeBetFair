import express from 'express';
import gameResultService from '../services/gameResultService.js';
import oddsApiService from '../services/oddsApiService.js';
import { getHealthStatus, updateActiveCategories, getActiveCategories } from '../jobs/oddsUpdateJob.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 스케줄러 상태 조회
router.get('/scheduler/status', (req, res) => {
  try {
    const status = getHealthStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

// 활성 카테고리 조회
router.get('/active-categories', (req, res) => {
  try {
    const activeCategories = getActiveCategories();
    res.json({ activeCategories });
  } catch (error) {
    console.error('Error getting active categories:', error);
    res.status(500).json({ error: 'Failed to get active categories' });
  }
});

// 활성 카테고리 업데이트
router.put('/active-categories', (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }
    
    updateActiveCategories(categories);
    res.json({ 
      message: 'Active categories updated successfully', 
      activeCategories: categories,
      costOptimization: {
        estimatedApiCalls: `~${categories.length * 2} calls per hour`,
        savings: `~${Math.round((1 - categories.length / 13) * 100)}% reduction in API calls`
      }
    });
  } catch (error) {
    console.error('Error updating active categories:', error);
    res.status(500).json({ error: 'Failed to update active categories' });
  }
});

// 누락된 경기 결과 수집
router.post('/collect-missing-results', async (req, res) => {
  try {
    const result = await gameResultService.collectMissingGameResults();
    res.json({
      message: 'Missing game results collection completed',
      ...result
    });
  } catch (error) {
    console.error('Error collecting missing game results:', error);
    res.status(500).json({ error: 'Failed to collect missing game results' });
  }
});

// 데이터베이스 통계
router.get('/stats', async (req, res) => {
  try {
    const stats = await gameResultService.getDatabaseStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({ error: 'Failed to get database stats' });
  }
});

// API 비용 추정
router.get('/cost-estimate', async (req, res) => {
  try {
    const costEstimate = await gameResultService.getApiCostEstimate();
    res.json(costEstimate);
  } catch (error) {
    console.error('Error getting cost estimate:', error);
    res.status(500).json({ error: 'Failed to get cost estimate' });
  }
});

// 배당률 조회
router.get('/odds', async (req, res) => {
  try {
    const { mainCategory, subCategory, limit = 100 } = req.query;
    const odds = await oddsApiService.getOdds(mainCategory, subCategory, parseInt(limit));
    res.json(odds);
  } catch (error) {
    console.error('Error fetching odds:', error);
    res.status(500).json({ error: 'Failed to fetch odds' });
  }
});

// 배당률 수동 업데이트
router.post('/odds/update', async (req, res) => {
  try {
    await oddsApiService.fetchAndCacheOdds();
    res.json({ message: 'Odds updated successfully' });
  } catch (error) {
    console.error('Error updating odds:', error);
    res.status(500).json({ error: 'Failed to update odds' });
  }
});

// 활성 카테고리 배당률만 업데이트 (비용 절약용)
router.post('/odds/update/active', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }
    
    await oddsApiService.fetchAndCacheOddsForCategories(categories);
    res.json({ message: 'Active categories odds updated successfully', categories });
  } catch (error) {
    console.error('Error updating active categories odds:', error);
    res.status(500).json({ error: 'Failed to update active categories odds' });
  }
});

// 배당률 통계
router.get('/odds/stats', async (req, res) => {
  try {
    const stats = await oddsApiService.getOddsStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting odds stats:', error);
    res.status(500).json({ error: 'Failed to get odds stats' });
  }
});

// 배당률 비용 추정
router.get('/odds/cost-estimate', async (req, res) => {
  try {
    const costEstimate = await oddsApiService.getApiCostEstimate();
    res.json(costEstimate);
  } catch (error) {
    console.error('Error getting odds cost estimate:', error);
    res.status(500).json({ error: 'Failed to get odds cost estimate' });
  }
});

// 스케줄러 강제 리셋 API
router.post('/scheduler/reset', async (req, res) => {
  try {
    console.log('[API] 스케줄러 강제 리셋 요청 받음');
    
    // 고우선순위 리그 배당율 업데이트 실행
    const highPriorityCategories = ['NBA', 'MLB', 'KBO', 'NFL', '프리미어리그'];
    const highResult = await oddsApiService.fetchAndCacheOddsForCategories(highPriorityCategories, 'high');
    
    // 중우선순위 리그 배당율 업데이트 실행
    const mediumPriorityCategories = ['MLS', 'KLEAGUE', 'JLEAGUE', 'SERIEA'];
    const mediumResult = await oddsApiService.fetchAndCacheOddsForCategories(mediumPriorityCategories, 'medium');
    
    const totalUpdated = (highResult?.updatedCount || 0) + (mediumResult?.updatedCount || 0);
    
    console.log('[API] 스케줄러 리셋 완료:', { highResult, mediumResult, totalUpdated });
    
    res.json({ 
      message: 'Scheduler reset completed successfully',
      highPriorityResult: highResult,
      mediumPriorityResult: mediumResult,
      totalUpdated
    });
  } catch (error) {
    console.error('[API] 스케줄러 리셋 실패:', error);
    res.status(500).json({ error: 'Failed to reset scheduler', details: error.message });
  }
});

// 모든 게임 결과 조회
router.get('/', async (req, res) => {
  try {
    const { mainCategory, subCategory, status, limit = 100 } = req.query;
    const results = await gameResultService.getGameResults(mainCategory, subCategory, status, parseInt(limit));
    res.json(results);
  } catch (error) {
    console.error('Error fetching game results:', error);
    res.status(500).json({ error: 'Failed to fetch game results' });
  }
});

// 특정 게임 결과 조회
router.get('/:id', async (req, res) => {
  try {
    const result = await gameResultService.getGameResultById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Game result not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching game result:', error);
    res.status(500).json({ error: 'Failed to fetch game result' });
  }
});

// 게임 결과 수동 업데이트
router.post('/update', async (req, res) => {
  try {
    await gameResultService.fetchAndUpdateResults();
    res.json({ message: 'Game results updated successfully' });
  } catch (error) {
    console.error('Error updating game results:', error);
    res.status(500).json({ error: 'Failed to update game results' });
  }
});

// 활성 카테고리만 업데이트 (비용 절약용)
router.post('/update/active', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }
    
    await gameResultService.fetchAndUpdateResultsForCategories(categories);
    res.json({ message: 'Active categories updated successfully', categories });
  } catch (error) {
    console.error('Error updating active categories:', error);
    res.status(500).json({ error: 'Failed to update active categories' });
  }
});

// 특정 스포츠의 최근 경기 결과 조회
router.get('/recent/:mainCategory', async (req, res) => {
  try {
    const { mainCategory } = req.params;
    const { days = 7 } = req.query;
    const results = await gameResultService.fetchRecentResults(mainCategory, parseInt(days));
    res.json(results);
  } catch (error) {
    console.error('Error fetching recent results:', error);
    res.status(500).json({ error: 'Failed to fetch recent results' });
  }
});

// 데이터베이스 통계 조회
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await gameResultService.getDatabaseStats();
    
    // 통계 데이터 정리
    const summary = {
      total: 0,
      byCategory: {},
      byStatus: {},
      byResult: {},
      lastUpdate: getHealthStatus()
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      summary.total += count;

      // 카테고리별 통계
      const categoryKey = `${stat.mainCategory}_${stat.subCategory}`;
      if (!summary.byCategory[categoryKey]) {
        summary.byCategory[categoryKey] = 0;
      }
      summary.byCategory[categoryKey] += count;

      // 상태별 통계
      if (!summary.byStatus[stat.status]) {
        summary.byStatus[stat.status] = 0;
      }
      summary.byStatus[stat.status] += count;

      // 결과별 통계
      if (!summary.byResult[stat.result]) {
        summary.byResult[stat.result] = 0;
      }
      summary.byResult[stat.result] += count;
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Failed to fetch database stats' });
  }
});

// 특정 카테고리별 상세 통계
router.get('/stats/category/:mainCategory', async (req, res) => {
  try {
    const { mainCategory } = req.params;
    const { subCategory } = req.query;
    
    const whereClause = { mainCategory };
    if (subCategory) {
      whereClause.subCategory = subCategory;
    }

    const results = await gameResultService.getGameResults(mainCategory, subCategory);
    
    const stats = {
      total: results.length,
      byStatus: {},
      byResult: {},
      bySubCategory: {},
      recentGames: results.slice(0, 10) // 최근 10경기
    };

    results.forEach(game => {
      // 상태별 통계
      if (!stats.byStatus[game.status]) {
        stats.byStatus[game.status] = 0;
      }
      stats.byStatus[game.status]++;

      // 결과별 통계
      if (!stats.byResult[game.result]) {
        stats.byResult[game.result] = 0;
      }
      stats.byResult[game.result]++;

      // 서브카테고리별 통계
      if (!stats.bySubCategory[game.subCategory]) {
        stats.bySubCategory[game.subCategory] = 0;
      }
      stats.bySubCategory[game.subCategory]++;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

// 데이터 검증 및 정리
router.post('/cleanup', async (req, res) => {
  try {
    await gameResultService.cleanupOldData();
    res.json({ message: 'Data cleanup completed successfully' });
  } catch (error) {
    console.error('Error during data cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup data' });
  }
});

// 경기 결과 조회
router.get('/results', async (req, res) => {
  try {
    const { mainCategory, subCategory, status, limit = 100 } = req.query;
    const results = await gameResultService.getGameResults(mainCategory, subCategory, status, parseInt(limit));
    res.json(results);
  } catch (error) {
    console.error('Error fetching game results:', error);
    res.status(500).json({ error: 'Failed to fetch game results' });
  }
});

// 특정 경기 결과 조회
router.get('/results/:id', async (req, res) => {
  try {
    const result = await gameResultService.getGameResultById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Game result not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching game result:', error);
    res.status(500).json({ error: 'Failed to fetch game result' });
  }
});

// 경기 결과 수동 업데이트
router.post('/results/update', async (req, res) => {
  try {
    await gameResultService.fetchAndUpdateResults();
    res.json({ message: 'Game results updated successfully' });
  } catch (error) {
    console.error('Error updating game results:', error);
    res.status(500).json({ error: 'Failed to update game results' });
  }
});

// API 사용량 모니터링
router.get('/api-usage', async (req, res) => {
  try {
    const apiUsage = {
      tracker: oddsApiService.apiCallTracker,
      dynamicPriority: oddsApiService.getDynamicPriorityLevel(),
      recommendations: {
        canMakeCall: oddsApiService.canMakeApiCall(),
        suggestedAction: oddsApiService.apiCallTracker.dailyCalls > oddsApiService.apiCallTracker.dailyLimit * 0.8 
          ? 'Reduce update frequency' 
          : 'Normal operation',
        projectedMonthlyUsage: Math.round(oddsApiService.apiCallTracker.dailyCalls * 30),
        remainingCalls: {
          daily: Math.max(0, oddsApiService.apiCallTracker.dailyLimit - oddsApiService.apiCallTracker.dailyCalls),
          monthly: Math.max(0, oddsApiService.apiCallTracker.monthlyLimit - oddsApiService.apiCallTracker.monthlyCalls)
        }
      }
    };
    res.json(apiUsage);
  } catch (error) {
    console.error('Error getting API usage:', error);
    res.status(500).json({ error: 'Failed to get API usage' });
  }
});

// 스케줄러 로그 조회
router.get('/scheduler-logs', async (req, res) => {
  try {
    const { date, type, limit = 100 } = req.query;
    const logsDir = path.join(process.cwd(), 'logs');
    
    // 날짜 지정이 없으면 오늘 날짜 사용
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `scheduler_${targetDate}.log`);
    
    if (!fs.existsSync(logFile)) {
      return res.json({ 
        date: targetDate,
        logs: [],
        message: 'No logs found for this date'
      });
    }
    
    // 로그 파일 읽기
    const logContent = fs.readFileSync(logFile, 'utf8');
    let logs = logContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(log => log !== null);
    
    // 타입 필터링
    if (type) {
      logs = logs.filter(log => log.type === type);
    }
    
    // 최신순 정렬 및 제한
    logs = logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));
    
    res.json({
      date: targetDate,
      type: type || 'all',
      count: logs.length,
      logs: logs
    });
    
  } catch (error) {
    console.error('Error reading scheduler logs:', error);
    res.status(500).json({ error: 'Failed to read scheduler logs' });
  }
});

// 스케줄러 로그 통계
router.get('/scheduler-logs/stats', async (req, res) => {
  try {
    const { date } = req.query;
    const logsDir = path.join(process.cwd(), 'logs');
    
    // 날짜 지정이 없으면 오늘 날짜 사용
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `scheduler_${targetDate}.log`);
    
    if (!fs.existsSync(logFile)) {
      return res.json({ 
        date: targetDate,
        stats: {},
        message: 'No logs found for this date'
      });
    }
    
    // 로그 파일 읽기 및 통계 생성
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logs = logContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(log => log !== null);
    
    const stats = {
      total: logs.length,
      byType: {},
      byStatus: {},
      errors: [],
      lastUpdate: logs.length > 0 ? logs[logs.length - 1].timestamp : null
    };
    
    logs.forEach(log => {
      // 타입별 통계
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      
      // 상태별 통계
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      
      // 에러 수집
      if (log.status === 'error') {
        stats.errors.push({
          timestamp: log.timestamp,
          type: log.type,
          message: log.message,
          error: log.error
        });
      }
    });
    
    res.json({
      date: targetDate,
      stats: stats
    });
    
  } catch (error) {
    console.error('Error generating scheduler log stats:', error);
    res.status(500).json({ error: 'Failed to generate scheduler log stats' });
  }
});

export default router; 