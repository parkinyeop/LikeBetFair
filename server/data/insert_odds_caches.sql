-- OddsCaches 테이블에 배당율 데이터 삽입
-- 생성 시간: 2025-08-01T04:59:50.964Z
-- 총 경기 수: 401
-- 처리된 경기 수: 401
-- 오류 수: 0

BEGIN;


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T16:41:00Z', 'Cincinnati Reds', 'Atlanta Braves', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.08},{"name":"Cincinnati Reds","price":1.79}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.53},{"name":"Cincinnati Reds","price":2.55}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.2},{"name":"Cincinnati Reds","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.59},{"name":"Cincinnati Reds","price":2.49}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.2},{"name":"Cincinnati Reds","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.59},{"name":"Cincinnati Reds","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.07}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.1},{"name":"Cincinnati Reds","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.57},{"name":"Cincinnati Reds","price":2.45}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.1},{"name":"Cincinnati Reds","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.56},{"name":"Cincinnati Reds","price":2.55}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.09},{"name":"Cincinnati Reds","price":1.78}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.55},{"name":"Cincinnati Reds","price":2.54}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":1.99}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.1},{"name":"Cincinnati Reds","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.56},{"name":"Cincinnati Reds","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.08},{"name":"Cincinnati Reds","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.55},{"name":"Cincinnati Reds","price":2.49}]},{"key":"totals","outcomes":[{"name":"Over","price":1.99},{"name":"Under","price":1.83}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.15},{"name":"Cincinnati Reds","price":1.74}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.77}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.2},{"name":"Cincinnati Reds","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.59},{"name":"Cincinnati Reds","price":2.48}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Braves","price":2.06},{"name":"Cincinnati Reds","price":1.78}]},{"key":"spreads","outcomes":[{"name":"Atlanta Braves","price":1.53},{"name":"Cincinnati Reds","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":1.97}]}]}]', [{"name":"Atlanta Braves","price":"2.12"},{"name":"Cincinnati Reds","price":"1.77"}],
  '2025-08-01T04:59:50.960Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T18:21:00Z', 'Chicago Cubs', 'Baltimore Orioles', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.2},{"name":"Chicago Cubs","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.55},{"name":"Chicago Cubs","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.88}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.2},{"name":"Chicago Cubs","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.54},{"name":"Chicago Cubs","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.25},{"name":"Chicago Cubs","price":1.68}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.55},{"name":"Chicago Cubs","price":2.56}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.87}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.26},{"name":"Chicago Cubs","price":1.72}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.57},{"name":"Chicago Cubs","price":2.53}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.26},{"name":"Chicago Cubs","price":1.72}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.57},{"name":"Chicago Cubs","price":2.54}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.83}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.22},{"name":"Chicago Cubs","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.56},{"name":"Chicago Cubs","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.23},{"name":"Chicago Cubs","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.55},{"name":"Chicago Cubs","price":2.49}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.84}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.25},{"name":"Chicago Cubs","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.54},{"name":"Chicago Cubs","price":2.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.25},{"name":"Chicago Cubs","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.55},{"name":"Chicago Cubs","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.92},{"name":"Under","price":1.85}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Orioles","price":2.2},{"name":"Chicago Cubs","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Baltimore Orioles","price":1.56},{"name":"Chicago Cubs","price":2.55}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]}]', [{"name":"Baltimore Orioles","price":"2.23"},{"name":"Chicago Cubs","price":"1.68"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T22:45:00Z', 'Philadelphia Phillies', 'Detroit Tigers', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.39},{"name":"Philadelphia Phillies","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.62},{"name":"Philadelphia Phillies","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.39},{"name":"Philadelphia Phillies","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.62},{"name":"Philadelphia Phillies","price":2.41}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.32},{"name":"Philadelphia Phillies","price":1.64}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.62},{"name":"Philadelphia Phillies","price":2.32}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.85}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.25},{"name":"Philadelphia Phillies","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.59},{"name":"Philadelphia Phillies","price":2.45}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.27},{"name":"Philadelphia Phillies","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.64},{"name":"Philadelphia Phillies","price":2.38}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.3},{"name":"Philadelphia Phillies","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.59},{"name":"Philadelphia Phillies","price":2.43}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.28},{"name":"Philadelphia Phillies","price":1.64}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.58},{"name":"Philadelphia Phillies","price":2.41}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.37},{"name":"Philadelphia Phillies","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.62},{"name":"Philadelphia Phillies","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.25},{"name":"Philadelphia Phillies","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.57},{"name":"Philadelphia Phillies","price":2.45}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.25},{"name":"Philadelphia Phillies","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.59},{"name":"Philadelphia Phillies","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Tigers","price":2.3},{"name":"Philadelphia Phillies","price":1.63}]},{"key":"spreads","outcomes":[{"name":"Detroit Tigers","price":1.57},{"name":"Philadelphia Phillies","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.85}]}]}]', [{"name":"Detroit Tigers","price":"2.31"},{"name":"Philadelphia Phillies","price":"1.65"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T22:45:00Z', 'Washington Nationals', 'Milwaukee Brewers', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.68},{"name":"Washington Nationals","price":2.34}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.02},{"name":"Washington Nationals","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.68},{"name":"Washington Nationals","price":2.34}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.05},{"name":"Washington Nationals","price":1.84}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.65},{"name":"Washington Nationals","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.04},{"name":"Washington Nationals","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.65},{"name":"Washington Nationals","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.05},{"name":"Washington Nationals","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.66},{"name":"Washington Nationals","price":2.29}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.05},{"name":"Washington Nationals","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.9}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.65},{"name":"Washington Nationals","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.05},{"name":"Washington Nationals","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.64},{"name":"Washington Nationals","price":2.28}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.04},{"name":"Washington Nationals","price":1.79}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.68},{"name":"Washington Nationals","price":2.33}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2},{"name":"Washington Nationals","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.65},{"name":"Washington Nationals","price":2.25}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.05},{"name":"Washington Nationals","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.65},{"name":"Washington Nationals","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.05},{"name":"Washington Nationals","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Milwaukee Brewers","price":1.65},{"name":"Washington Nationals","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Milwaukee Brewers","price":2.07},{"name":"Washington Nationals","price":1.76}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.87}]}]}]', [{"name":"Milwaukee Brewers","price":"1.66"},{"name":"Washington Nationals","price":"2.30"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T23:08:00Z', 'Toronto Blue Jays', 'Kansas City Royals', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Royals","price":2.3},{"name":"Toronto Blue Jays","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Kansas City Royals","price":1.61},{"name":"Toronto Blue Jays","price":2.36}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Royals","price":2.32},{"name":"Toronto Blue Jays","price":1.64}]},{"key":"spreads","outcomes":[{"name":"Kansas City Royals","price":1.65},{"name":"Toronto Blue Jays","price":2.35}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Royals","price":2.3},{"name":"Toronto Blue Jays","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Kansas City Royals","price":1.61},{"name":"Toronto Blue Jays","price":2.35}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Royals","price":2.3},{"name":"Toronto Blue Jays","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Kansas City Royals","price":1.62},{"name":"Toronto Blue Jays","price":2.35}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Kansas City Royals","price":"2.30"},{"name":"Toronto Blue Jays","price":"1.65"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T23:10:00Z', 'Cleveland Guardians', 'Minnesota Twins', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.83},{"name":"Minnesota Twins","price":2.09}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":2.77},{"name":"Minnesota Twins","price":1.49}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.83},{"name":"Minnesota Twins","price":2.09}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":2.79},{"name":"Minnesota Twins","price":1.49}]},{"key":"totals","outcomes":[{"name":"Over","price":2.07},{"name":"Under","price":1.81}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.84},{"name":"Minnesota Twins","price":1.99}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":2.8},{"name":"Minnesota Twins","price":1.45}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.87},{"name":"Minnesota Twins","price":1.95}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":2.85},{"name":"Minnesota Twins","price":1.44}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.84},{"name":"Minnesota Twins","price":1.98}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":1.5},{"name":"Minnesota Twins","price":2.62}]},{"key":"totals","outcomes":[{"name":"Over","price":2.01},{"name":"Under","price":1.81}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.86},{"name":"Minnesota Twins","price":1.99}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":1.48},{"name":"Minnesota Twins","price":2.65}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.84}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.91},{"name":"Minnesota Twins","price":1.91}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":1.53},{"name":"Minnesota Twins","price":2.55}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.89},{"name":"Minnesota Twins","price":1.96}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":1.49},{"name":"Minnesota Twins","price":2.68}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.82}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.83},{"name":"Minnesota Twins","price":2}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":1.49},{"name":"Minnesota Twins","price":2.65}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.83},{"name":"Minnesota Twins","price":2.09}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":2.76},{"name":"Minnesota Twins","price":1.49}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Guardians","price":1.87},{"name":"Minnesota Twins","price":1.91}]},{"key":"spreads","outcomes":[{"name":"Cleveland Guardians","price":1.49},{"name":"Minnesota Twins","price":2.55}]},{"key":"totals","outcomes":[{"name":"Over","price":1.97},{"name":"Under","price":1.8}]}]}]', [{"name":"Cleveland Guardians","price":"1.85"},{"name":"Minnesota Twins","price":"2.00"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T23:11:00Z', 'Boston Red Sox', 'Houston Astros', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Boston Red Sox","price":2.12},{"name":"Houston Astros","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Boston Red Sox","price":1.65},{"name":"Houston Astros","price":2.28}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Boston Red Sox","price":2.12},{"name":"Houston Astros","price":1.76}]},{"key":"spreads","outcomes":[{"name":"Boston Red Sox","price":1.67},{"name":"Houston Astros","price":2.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Boston Red Sox","price":2.1},{"name":"Houston Astros","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Boston Red Sox","price":1.65},{"name":"Houston Astros","price":2.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Boston Red Sox","price":2.11},{"name":"Houston Astros","price":1.75}]},{"key":"spreads","outcomes":[{"name":"Boston Red Sox","price":1.67},{"name":"Houston Astros","price":2.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Boston Red Sox","price":"2.11"},{"name":"Houston Astros","price":"1.76"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T23:11:00Z', 'Miami Marlins', 'New York Yankees', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.38},{"name":"New York Yankees","price":1.61}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.77},{"name":"New York Yankees","price":2.08}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.45},{"name":"New York Yankees","price":1.58}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.83},{"name":"New York Yankees","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.97},{"name":"Under","price":1.85}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.45},{"name":"New York Yankees","price":1.57}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.87},{"name":"New York Yankees","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.43},{"name":"New York Yankees","price":1.59}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.87},{"name":"New York Yankees","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.52},{"name":"New York Yankees","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.87},{"name":"New York Yankees","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.52},{"name":"New York Yankees","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.89},{"name":"New York Yankees","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":2.03}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.44},{"name":"New York Yankees","price":1.57}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.87},{"name":"New York Yankees","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.99}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.35},{"name":"New York Yankees","price":1.61}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.83},{"name":"New York Yankees","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.38},{"name":"New York Yankees","price":1.56}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.82},{"name":"New York Yankees","price":1.97}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.82}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Miami Marlins","price":2.39},{"name":"New York Yankees","price":1.61}]},{"key":"spreads","outcomes":[{"name":"Miami Marlins","price":1.77},{"name":"New York Yankees","price":2.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]}]', [{"name":"Miami Marlins","price":"2.43"},{"name":"New York Yankees","price":"1.59"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T23:12:00Z', 'New York Mets', 'San Francisco Giants', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.7},{"name":"San Francisco Giants","price":2.2}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.5},{"name":"San Francisco Giants","price":1.55}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.71},{"name":"San Francisco Giants","price":2.2}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.67},{"name":"San Francisco Giants","price":1.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.01}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.7},{"name":"San Francisco Giants","price":2.29}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.56},{"name":"San Francisco Giants","price":1.56}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.7},{"name":"San Francisco Giants","price":2.29}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.57},{"name":"San Francisco Giants","price":1.56}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.07}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.69},{"name":"San Francisco Giants","price":2.2}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.55},{"name":"San Francisco Giants","price":1.53}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.69},{"name":"San Francisco Giants","price":2.18}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.56},{"name":"San Francisco Giants","price":1.52}]},{"key":"totals","outcomes":[{"name":"Over","price":2.03},{"name":"Under","price":1.8}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.71},{"name":"San Francisco Giants","price":2.18}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.58},{"name":"San Francisco Giants","price":1.53}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.69},{"name":"San Francisco Giants","price":2.18}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.65},{"name":"San Francisco Giants","price":1.5}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.7},{"name":"San Francisco Giants","price":2.28}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.56},{"name":"San Francisco Giants","price":1.56}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.7},{"name":"San Francisco Giants","price":2.2}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.55},{"name":"San Francisco Giants","price":1.56}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"New York Mets","price":1.71},{"name":"San Francisco Giants","price":2.12}]},{"key":"spreads","outcomes":[{"name":"New York Mets","price":2.55},{"name":"San Francisco Giants","price":1.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.83}]}]}]', [{"name":"New York Mets","price":"1.70"},{"name":"San Francisco Giants","price":"2.21"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-01T23:35:00Z', 'Tampa Bay Rays', 'Los Angeles Dodgers', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.7},{"name":"Tampa Bay Rays","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.1},{"name":"Tampa Bay Rays","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.7},{"name":"Tampa Bay Rays","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.13},{"name":"Tampa Bay Rays","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.07}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.68},{"name":"Tampa Bay Rays","price":2.26}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.06},{"name":"Tampa Bay Rays","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.71},{"name":"Tampa Bay Rays","price":2.18}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.15},{"name":"Tampa Bay Rays","price":1.74}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.68},{"name":"Tampa Bay Rays","price":2.25}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.1},{"name":"Tampa Bay Rays","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.84}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.69},{"name":"Tampa Bay Rays","price":2.22}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.1},{"name":"Tampa Bay Rays","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.68},{"name":"Tampa Bay Rays","price":2.22}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.09},{"name":"Tampa Bay Rays","price":1.76}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.7},{"name":"Tampa Bay Rays","price":2.29}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.1},{"name":"Tampa Bay Rays","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.65},{"name":"Tampa Bay Rays","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.08},{"name":"Tampa Bay Rays","price":1.73}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.94}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.69},{"name":"Tampa Bay Rays","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.1},{"name":"Tampa Bay Rays","price":1.74}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Dodgers","price":1.69},{"name":"Tampa Bay Rays","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Dodgers","price":2.15},{"name":"Tampa Bay Rays","price":1.71}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]}]', [{"name":"Los Angeles Dodgers","price":"1.69"},{"name":"Tampa Bay Rays","price":"2.24"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-02T00:10:00Z', 'Colorado Rockies', 'Pittsburgh Pirates', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.29},{"name":"Pittsburgh Pirates","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.77},{"name":"Pittsburgh Pirates","price":2.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.29},{"name":"Pittsburgh Pirates","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.78},{"name":"Pittsburgh Pirates","price":2.13}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.98}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.26},{"name":"Pittsburgh Pirates","price":1.68}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.85},{"name":"Pittsburgh Pirates","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.26},{"name":"Pittsburgh Pirates","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.83},{"name":"Pittsburgh Pirates","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.22},{"name":"Pittsburgh Pirates","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.77},{"name":"Pittsburgh Pirates","price":2.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.25},{"name":"Pittsburgh Pirates","price":1.68}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.83},{"name":"Pittsburgh Pirates","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.94}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.23},{"name":"Pittsburgh Pirates","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.79},{"name":"Pittsburgh Pirates","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.28},{"name":"Pittsburgh Pirates","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.77},{"name":"Pittsburgh Pirates","price":2.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.18},{"name":"Pittsburgh Pirates","price":1.66}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.78},{"name":"Pittsburgh Pirates","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.25},{"name":"Pittsburgh Pirates","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.85},{"name":"Pittsburgh Pirates","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rockies","price":2.25},{"name":"Pittsburgh Pirates","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Colorado Rockies","price":1.83},{"name":"Pittsburgh Pirates","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Colorado Rockies","price":"2.25"},{"name":"Pittsburgh Pirates","price":"1.68"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-02T01:39:00Z', 'Los Angeles Angels', 'Chicago White Sox', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Chicago White Sox","price":2.14},{"name":"Los Angeles Angels","price":1.75}]},{"key":"spreads","outcomes":[{"name":"Chicago White Sox","price":1.59},{"name":"Los Angeles Angels","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.82}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago White Sox","price":2.14},{"name":"Los Angeles Angels","price":1.75}]},{"key":"spreads","outcomes":[{"name":"Chicago White Sox","price":1.59},{"name":"Los Angeles Angels","price":2.45}]},{"key":"totals","outcomes":[{"name":"Over","price":1.84},{"name":"Under","price":1.98}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Chicago White Sox","price":2.15},{"name":"Los Angeles Angels","price":1.71}]},{"key":"spreads","outcomes":[{"name":"Chicago White Sox","price":1.59},{"name":"Los Angeles Angels","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Chicago White Sox","price":2.13},{"name":"Los Angeles Angels","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Chicago White Sox","price":1.61},{"name":"Los Angeles Angels","price":2.4}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]}]', [{"name":"Chicago White Sox","price":"2.14"},{"name":"Los Angeles Angels","price":"1.74"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-02T01:40:00Z', 'San Diego Padres', 'St. Louis Cardinals', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.62},{"name":"St. Louis Cardinals","price":2.47}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.38},{"name":"St. Louis Cardinals","price":1.63}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.62},{"name":"St. Louis Cardinals","price":2.47}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.39},{"name":"St. Louis Cardinals","price":1.64}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.61},{"name":"St. Louis Cardinals","price":2.39}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.35},{"name":"St. Louis Cardinals","price":1.62}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.65},{"name":"St. Louis Cardinals","price":2.3}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.38},{"name":"St. Louis Cardinals","price":1.6}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.61},{"name":"St. Louis Cardinals","price":2.4}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.4},{"name":"St. Louis Cardinals","price":1.61}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.63},{"name":"St. Louis Cardinals","price":2.35}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.39},{"name":"St. Louis Cardinals","price":1.62}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.93}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.61},{"name":"St. Louis Cardinals","price":2.33}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.38},{"name":"St. Louis Cardinals","price":1.59}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.62},{"name":"St. Louis Cardinals","price":2.44}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.4},{"name":"St. Louis Cardinals","price":1.62}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.57},{"name":"St. Louis Cardinals","price":2.32}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.33},{"name":"St. Louis Cardinals","price":1.57}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.88}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.62},{"name":"St. Louis Cardinals","price":2.35}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.45},{"name":"St. Louis Cardinals","price":1.57}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"San Diego Padres","price":1.61},{"name":"St. Louis Cardinals","price":2.35}]},{"key":"spreads","outcomes":[{"name":"San Diego Padres","price":2.4},{"name":"St. Louis Cardinals","price":1.59}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"San Diego Padres","price":"1.62"},{"name":"St. Louis Cardinals","price":"2.38"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'baseball', 'MLB', 'baseball_mlb', 'MLB',
  '2025-08-02T02:10:00Z', 'Seattle Mariners', 'Texas Rangers', '[{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.6},{"name":"Texas Rangers","price":2.51}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.23},{"name":"Texas Rangers","price":1.7}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.6},{"name":"Texas Rangers","price":2.51}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.25},{"name":"Texas Rangers","price":1.71}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.57},{"name":"Texas Rangers","price":2.46}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.26},{"name":"Texas Rangers","price":1.66}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.57},{"name":"Texas Rangers","price":2.43}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.3},{"name":"Texas Rangers","price":1.67}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.58},{"name":"Texas Rangers","price":2.46}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.28},{"name":"Texas Rangers","price":1.66}]},{"key":"totals","outcomes":[{"name":"Over","price":1.9},{"name":"Under","price":1.91}]}]},{"key":"williamhill_us","title":"Caesars","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.59},{"name":"Texas Rangers","price":2.43}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.22},{"name":"Texas Rangers","price":1.69}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.57},{"name":"Texas Rangers","price":2.44}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.23},{"name":"Texas Rangers","price":1.67}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.57},{"name":"Texas Rangers","price":2.45}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.35},{"name":"Texas Rangers","price":1.62}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.6},{"name":"Texas Rangers","price":2.48}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.25},{"name":"Texas Rangers","price":1.69}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.57},{"name":"Texas Rangers","price":2.45}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.25},{"name":"Texas Rangers","price":1.67}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Mariners","price":1.55},{"name":"Texas Rangers","price":2.43}]},{"key":"spreads","outcomes":[{"name":"Seattle Mariners","price":2.2},{"name":"Texas Rangers","price":1.65}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.88}]}]}]', [{"name":"Seattle Mariners","price":"1.58"},{"name":"Texas Rangers","price":"2.46"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-05T00:20:00Z', 'Philadelphia Eagles', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.7},{"name":"Philadelphia Eagles","price":1.29}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.3},{"name":"Philadelphia Eagles","price":1.36}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.89},{"name":"Philadelphia Eagles","price":2.01}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.98}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.3},{"name":"Philadelphia Eagles","price":1.36}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.86},{"name":"Philadelphia Eagles","price":1.96}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.44},{"name":"Philadelphia Eagles","price":1.3}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.6},{"name":"Philadelphia Eagles","price":1.31}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.65},{"name":"Philadelphia Eagles","price":1.3}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.98},{"name":"Philadelphia Eagles","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.4},{"name":"Philadelphia Eagles","price":1.32}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.85},{"name":"Philadelphia Eagles","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.4},{"name":"Philadelphia Eagles","price":1.33}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.4},{"name":"Philadelphia Eagles","price":1.34}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.87},{"name":"Philadelphia Eagles","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]}]', [{"name":"Dallas Cowboys","price":"3.47"},{"name":"Philadelphia Eagles","price":"1.32"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-06T00:00:00Z', 'Los Angeles Chargers', 'Kansas City Chiefs', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.79},{"name":"Los Angeles Chargers","price":2.08}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.95},{"name":"Los Angeles Chargers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.83}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.71},{"name":"Los Angeles Chargers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Los Angeles Chargers","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.71},{"name":"Los Angeles Chargers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Los Angeles Chargers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.7},{"name":"Los Angeles Chargers","price":2.11}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.7},{"name":"Los Angeles Chargers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.69},{"name":"Los Angeles Chargers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Los Angeles Chargers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.68},{"name":"Los Angeles Chargers","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.85},{"name":"Los Angeles Chargers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.92},{"name":"Under","price":1.88}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.67},{"name":"Los Angeles Chargers","price":2.25}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Los Angeles Chargers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.71},{"name":"Los Angeles Chargers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Los Angeles Chargers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Kansas City Chiefs","price":"1.71"},{"name":"Los Angeles Chargers","price":"2.18"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'New Orleans Saints', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.41},{"name":"New Orleans Saints","price":3}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.43},{"name":"New Orleans Saints","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"New Orleans Saints","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.43},{"name":"New Orleans Saints","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.43},{"name":"New Orleans Saints","price":2.94}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.42},{"name":"New Orleans Saints","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.38},{"name":"New Orleans Saints","price":3}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.41},{"name":"New Orleans Saints","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.89},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.89}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.4},{"name":"New Orleans Saints","price":3}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.43},{"name":"New Orleans Saints","price":3}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"1.42"},{"name":"New Orleans Saints","price":"2.96"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'Atlanta Falcons', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.1},{"name":"Tampa Bay Buccaneers","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.96},{"name":"Tampa Bay Buccaneers","price":1.89}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.83}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.05},{"name":"Tampa Bay Buccaneers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"Tampa Bay Buccaneers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.05},{"name":"Tampa Bay Buccaneers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.06},{"name":"Tampa Bay Buccaneers","price":1.75}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2},{"name":"Tampa Bay Buccaneers","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":2},{"name":"Tampa Bay Buccaneers","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.02},{"name":"Tampa Bay Buccaneers","price":1.79}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.92},{"name":"Tampa Bay Buccaneers","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.88}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.05},{"name":"Tampa Bay Buccaneers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"Tampa Bay Buccaneers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.05},{"name":"Tampa Bay Buccaneers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"2.04"},{"name":"Tampa Bay Buccaneers","price":"1.80"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'Jacksonville Jaguars', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.36},{"name":"Jacksonville Jaguars","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.89},{"name":"Jacksonville Jaguars","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.3},{"name":"Jacksonville Jaguars","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":2},{"name":"Jacksonville Jaguars","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.3},{"name":"Jacksonville Jaguars","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":2.05},{"name":"Jacksonville Jaguars","price":1.86}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.98}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.3},{"name":"Jacksonville Jaguars","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":2},{"name":"Jacksonville Jaguars","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.25},{"name":"Jacksonville Jaguars","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.87},{"name":"Jacksonville Jaguars","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.23},{"name":"Jacksonville Jaguars","price":1.64}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"Jacksonville Jaguars","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.16},{"name":"Jacksonville Jaguars","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.93},{"name":"Jacksonville Jaguars","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.93}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.25},{"name":"Jacksonville Jaguars","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":2},{"name":"Jacksonville Jaguars","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.25},{"name":"Jacksonville Jaguars","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":2},{"name":"Jacksonville Jaguars","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]}]', [{"name":"Carolina Panthers","price":"2.27"},{"name":"Jacksonville Jaguars","price":"1.66"}],
  '2025-08-01T04:59:50.961Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'Cleveland Browns', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Cleveland Browns","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Cleveland Browns","price":2.98}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.87},{"name":"Cleveland Browns","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Cleveland Browns","price":3}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.95},{"name":"Cleveland Browns","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.98}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Cleveland Browns","price":3}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Cleveland Browns","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.4},{"name":"Cleveland Browns","price":2.88}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.43},{"name":"Cleveland Browns","price":2.75}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.89},{"name":"Cleveland Browns","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.88}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.4},{"name":"Cleveland Browns","price":3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Cleveland Browns","price":3.03}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.42"},{"name":"Cleveland Browns","price":"2.94"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'Indianapolis Colts', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.87},{"name":"Miami Dolphins","price":1.95}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":2},{"name":"Miami Dolphins","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.86},{"name":"Miami Dolphins","price":1.98}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.98},{"name":"Miami Dolphins","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.95},{"name":"Miami Dolphins","price":1.87}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.95},{"name":"Miami Dolphins","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.95},{"name":"Miami Dolphins","price":1.87}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.93},{"name":"Miami Dolphins","price":1.85}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.87},{"name":"Miami Dolphins","price":1.93}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.93},{"name":"Miami Dolphins","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.89}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2},{"name":"Miami Dolphins","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.87},{"name":"Miami Dolphins","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"1.92"},{"name":"Miami Dolphins","price":"1.90"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'New England Patriots', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.42},{"name":"New England Patriots","price":1.59}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.95},{"name":"New England Patriots","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.35},{"name":"New England Patriots","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.88},{"name":"New England Patriots","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.35},{"name":"New England Patriots","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.85},{"name":"New England Patriots","price":1.97}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.3},{"name":"New England Patriots","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":2},{"name":"New England Patriots","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.83}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.3},{"name":"New England Patriots","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.87},{"name":"New England Patriots","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.2},{"name":"New England Patriots","price":1.63}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.88},{"name":"New England Patriots","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.89}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.25},{"name":"New England Patriots","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.4},{"name":"New England Patriots","price":1.61}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.87},{"name":"New England Patriots","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.34},{"name":"New England Patriots","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.87},{"name":"New England Patriots","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Las Vegas Raiders","price":"2.32"},{"name":"New England Patriots","price":"1.63"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'Washington Commanders', 'New York Giants', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.45},{"name":"Washington Commanders","price":1.33}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.26},{"name":"Washington Commanders","price":1.36}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.26},{"name":"Washington Commanders","price":1.36}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.35},{"name":"Washington Commanders","price":1.34}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.22},{"name":"Washington Commanders","price":1.33}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.4},{"name":"Washington Commanders","price":1.33}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.4},{"name":"Washington Commanders","price":1.3}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.88}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.4},{"name":"Washington Commanders","price":1.33}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.3},{"name":"Washington Commanders","price":1.36}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New York Giants","price":"3.34"},{"name":"Washington Commanders","price":"1.34"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T17:00:00Z', 'New York Jets', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.3},{"name":"Pittsburgh Steelers","price":1.65}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.38},{"name":"Pittsburgh Steelers","price":1.61}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.95},{"name":"Pittsburgh Steelers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.35},{"name":"Pittsburgh Steelers","price":1.65}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.92},{"name":"Pittsburgh Steelers","price":1.99}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.35},{"name":"Pittsburgh Steelers","price":1.65}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.29},{"name":"Pittsburgh Steelers","price":1.6}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.4},{"name":"Pittsburgh Steelers","price":1.59}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.23},{"name":"Pittsburgh Steelers","price":1.61}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.91},{"name":"Pittsburgh Steelers","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.92},{"name":"Under","price":1.88}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.35},{"name":"Pittsburgh Steelers","price":1.62}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":2.34},{"name":"Pittsburgh Steelers","price":1.65}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.83},{"name":"Pittsburgh Steelers","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New York Jets","price":"2.33"},{"name":"Pittsburgh Steelers","price":"1.63"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T20:05:00Z', 'Denver Broncos', 'Tennessee Titans', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.26},{"name":"Tennessee Titans","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.93},{"name":"Tennessee Titans","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.26},{"name":"Tennessee Titans","price":4.06}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.95},{"name":"Tennessee Titans","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.26},{"name":"Tennessee Titans","price":4.06}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.26},{"name":"Tennessee Titans","price":4}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.87},{"name":"Tennessee Titans","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.26},{"name":"Tennessee Titans","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.27},{"name":"Tennessee Titans","price":4}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.27},{"name":"Tennessee Titans","price":4}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.26},{"name":"Tennessee Titans","price":4.08}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.25},{"name":"Tennessee Titans","price":3.75}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.89},{"name":"Tennessee Titans","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.89}]}]}]', [{"name":"Denver Broncos","price":"1.26"},{"name":"Tennessee Titans","price":"3.98"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T20:05:00Z', 'Seattle Seahawks', 'San Francisco 49ers', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.74},{"name":"Seattle Seahawks","price":2.16}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.71},{"name":"Seattle Seahawks","price":2.2}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.95},{"name":"Seattle Seahawks","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.71},{"name":"Seattle Seahawks","price":2.2}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.8},{"name":"Seattle Seahawks","price":2.05}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.89},{"name":"Seattle Seahawks","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.69},{"name":"Seattle Seahawks","price":2.2}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.74},{"name":"Seattle Seahawks","price":2.07}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.74},{"name":"Seattle Seahawks","price":2.08}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.89},{"name":"Seattle Seahawks","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.89}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.8},{"name":"Seattle Seahawks","price":2.05}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.87},{"name":"Seattle Seahawks","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.71},{"name":"Seattle Seahawks","price":2.2}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"San Francisco 49ers","price":"1.74"},{"name":"Seattle Seahawks","price":"2.13"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T20:25:00Z', 'Green Bay Packers', 'Detroit Lions', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.98},{"name":"Green Bay Packers","price":1.86}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.88},{"name":"Green Bay Packers","price":1.94}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.94}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.15},{"name":"Green Bay Packers","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":2},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.15},{"name":"Green Bay Packers","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.95},{"name":"Green Bay Packers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.05},{"name":"Green Bay Packers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2},{"name":"Green Bay Packers","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.97},{"name":"Green Bay Packers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.88},{"name":"Green Bay Packers","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.05},{"name":"Green Bay Packers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.99},{"name":"Green Bay Packers","price":1.79}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.1},{"name":"Green Bay Packers","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"2.05"},{"name":"Green Bay Packers","price":"1.79"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-07T20:25:00Z', 'Los Angeles Rams', 'Houston Texans', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.3},{"name":"Los Angeles Rams","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.96},{"name":"Los Angeles Rams","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.25},{"name":"Los Angeles Rams","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":2},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.25},{"name":"Los Angeles Rams","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.95},{"name":"Los Angeles Rams","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.36},{"name":"Los Angeles Rams","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.25},{"name":"Los Angeles Rams","price":1.67}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.95},{"name":"Los Angeles Rams","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.28},{"name":"Los Angeles Rams","price":1.63}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.83},{"name":"Los Angeles Rams","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.92},{"name":"Under","price":1.88}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.25},{"name":"Los Angeles Rams","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.25},{"name":"Los Angeles Rams","price":1.67}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.25},{"name":"Los Angeles Rams","price":1.69}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.83},{"name":"Los Angeles Rams","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Houston Texans","price":"2.27"},{"name":"Los Angeles Rams","price":"1.66"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-08T00:20:00Z', 'Buffalo Bills', 'Baltimore Ravens', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.98},{"name":"Buffalo Bills","price":1.86}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.87},{"name":"Buffalo Bills","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.98}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.98},{"name":"Buffalo Bills","price":1.85}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":2.02},{"name":"Buffalo Bills","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.88}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.98},{"name":"Buffalo Bills","price":1.85}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.97},{"name":"Buffalo Bills","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":2.02},{"name":"Buffalo Bills","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Buffalo Bills","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"Buffalo Bills","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Buffalo Bills","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.97},{"name":"Buffalo Bills","price":1.81}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.88},{"name":"Buffalo Bills","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.89}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.98},{"name":"Buffalo Bills","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Buffalo Bills","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.98},{"name":"Buffalo Bills","price":1.85}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.87},{"name":"Buffalo Bills","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.95},{"name":"Buffalo Bills","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.99"},{"name":"Buffalo Bills","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-09T00:15:00Z', 'Chicago Bears', 'Minnesota Vikings', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.83},{"name":"Minnesota Vikings","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.93},{"name":"Minnesota Vikings","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.95},{"name":"Minnesota Vikings","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.93}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.83},{"name":"Minnesota Vikings","price":2}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.95},{"name":"Minnesota Vikings","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanatics","title":"Fanatics","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.87},{"name":"Minnesota Vikings","price":1.95}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.85},{"name":"Minnesota Vikings","price":1.93}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.79},{"name":"Minnesota Vikings","price":2}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.88},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.92}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":2},{"name":"Minnesota Vikings","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.85"},{"name":"Minnesota Vikings","price":"1.97"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-12T00:15:00Z', 'Green Bay Packers', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.7},{"name":"Washington Commanders","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.68},{"name":"Washington Commanders","price":2.15}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.87},{"name":"Washington Commanders","price":1.95}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.71},{"name":"Washington Commanders","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Green Bay Packers","price":"1.70"},{"name":"Washington Commanders","price":"2.18"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Baltimore Ravens', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.15},{"name":"Cleveland Browns","price":5.7}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.12},{"name":"Cleveland Browns","price":6.1}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"Cleveland Browns","price":1.83}]}]}]', [{"name":"Baltimore Ravens","price":"1.14"},{"name":"Cleveland Browns","price":"5.90"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'New York Jets', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.24},{"name":"New York Jets","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.24"},{"name":"New York Jets","price":"4.20"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Detroit Lions', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.85},{"name":"Detroit Lions","price":1.44}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.95},{"name":"Detroit Lions","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.71},{"name":"Detroit Lions","price":1.45}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Detroit Lions","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.78"},{"name":"Detroit Lions","price":"1.44"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Cincinnati Bengals', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.41},{"name":"Jacksonville Jaguars","price":3}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.42},{"name":"Jacksonville Jaguars","price":2.83}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.42"},{"name":"Jacksonville Jaguars","price":"2.92"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Dallas Cowboys', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":1.51},{"name":"New York Giants","price":2.64}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":2},{"name":"New York Giants","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":1.52},{"name":"New York Giants","price":2.5}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":2},{"name":"New York Giants","price":1.83}]}]}]', [{"name":"Dallas Cowboys","price":"1.52"},{"name":"New York Giants","price":"2.57"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Tennessee Titans', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.42},{"name":"Tennessee Titans","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":2},{"name":"Tennessee Titans","price":1.83}]}]}]', [{"name":"Los Angeles Rams","price":"1.42"},{"name":"Tennessee Titans","price":"2.95"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Miami Dolphins', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":1.68},{"name":"New England Patriots","price":2.24}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":1.66},{"name":"New England Patriots","price":2.19}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":2},{"name":"New England Patriots","price":1.83}]}]}]', [{"name":"Miami Dolphins","price":"1.67"},{"name":"New England Patriots","price":"2.21"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'New Orleans Saints', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":3.85},{"name":"San Francisco 49ers","price":1.28}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.95},{"name":"San Francisco 49ers","price":1.87}]}]}]', [{"name":"New Orleans Saints","price":"3.85"},{"name":"San Francisco 49ers","price":"1.28"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T17:00:00Z', 'Pittsburgh Steelers', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Pittsburgh Steelers","price":1.74},{"name":"Seattle Seahawks","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Pittsburgh Steelers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Pittsburgh Steelers","price":1.87},{"name":"Seattle Seahawks","price":1.95}]}]}]', [{"name":"Pittsburgh Steelers","price":"1.74"},{"name":"Seattle Seahawks","price":"2.14"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T20:05:00Z', 'Arizona Cardinals', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.49},{"name":"Carolina Panthers","price":2.7}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Carolina Panthers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Carolina Panthers","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"1.49"},{"name":"Carolina Panthers","price":"2.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T20:05:00Z', 'Indianapolis Colts', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.54},{"name":"Indianapolis Colts","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Indianapolis Colts","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Indianapolis Colts","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.54"},{"name":"Indianapolis Colts","price":"2.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-14T20:25:00Z', 'Kansas City Chiefs', 'Philadelphia Eagles', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.93},{"name":"Philadelphia Eagles","price":1.93}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":2},{"name":"Philadelphia Eagles","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.82},{"name":"Philadelphia Eagles","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.82},{"name":"Philadelphia Eagles","price":1.96}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Philadelphia Eagles","price":1.95}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.98},{"name":"Philadelphia Eagles","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Philadelphia Eagles","price":1.95}]}]}]', [{"name":"Kansas City Chiefs","price":"1.86"},{"name":"Philadelphia Eagles","price":"1.97"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-15T00:20:00Z', 'Minnesota Vikings', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.8},{"name":"Minnesota Vikings","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Minnesota Vikings","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"2.80"},{"name":"Minnesota Vikings","price":"1.46"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-15T23:00:00Z', 'Houston Texans', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.8},{"name":"Tampa Bay Buccaneers","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.83},{"name":"Tampa Bay Buccaneers","price":2}]}]}]', [{"name":"Houston Texans","price":"1.80"},{"name":"Tampa Bay Buccaneers","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-16T02:00:00Z', 'Las Vegas Raiders', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":2.36},{"name":"Los Angeles Chargers","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]}]}]', [{"name":"Las Vegas Raiders","price":"2.36"},{"name":"Los Angeles Chargers","price":"1.62"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-19T00:15:00Z', 'Buffalo Bills', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.24},{"name":"Miami Dolphins","price":4.3}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.24"},{"name":"Miami Dolphins","price":"4.30"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Carolina Panthers', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.02},{"name":"Carolina Panthers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.89},{"name":"Carolina Panthers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"Carolina Panthers","price":1.87}]}]}]', [{"name":"Atlanta Falcons","price":"2.02"},{"name":"Carolina Panthers","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Minnesota Vikings', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":2.02},{"name":"Minnesota Vikings","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.87},{"name":"Minnesota Vikings","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.95},{"name":"Minnesota Vikings","price":1.87}]}]}]', [{"name":"Cincinnati Bengals","price":"2.02"},{"name":"Minnesota Vikings","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Cleveland Browns', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.15},{"name":"Green Bay Packers","price":1.38}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":2},{"name":"Green Bay Packers","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.83},{"name":"Green Bay Packers","price":2}]}]}]', [{"name":"Cleveland Browns","price":"3.15"},{"name":"Green Bay Packers","price":"1.38"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Jacksonville Jaguars', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.82},{"name":"Jacksonville Jaguars","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.93},{"name":"Jacksonville Jaguars","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.83},{"name":"Jacksonville Jaguars","price":2}]}]}]', [{"name":"Houston Texans","price":"1.82"},{"name":"Jacksonville Jaguars","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Tennessee Titans', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2.02},{"name":"Tennessee Titans","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2},{"name":"Tennessee Titans","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.95},{"name":"Tennessee Titans","price":1.87}]}]}]', [{"name":"Indianapolis Colts","price":"2.01"},{"name":"Tennessee Titans","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Washington Commanders', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":3.8},{"name":"Washington Commanders","price":1.28}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Washington Commanders","price":1.91}]}]}]', [{"name":"Las Vegas Raiders","price":"3.80"},{"name":"Washington Commanders","price":"1.28"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Philadelphia Eagles', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":2.8},{"name":"Philadelphia Eagles","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.95},{"name":"Philadelphia Eagles","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.95},{"name":"Philadelphia Eagles","price":1.87}]}]}]', [{"name":"Los Angeles Rams","price":"2.80"},{"name":"Philadelphia Eagles","price":"1.46"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'New England Patriots', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":1.82},{"name":"Pittsburgh Steelers","price":2.02}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]}]}]', [{"name":"New England Patriots","price":"1.82"},{"name":"Pittsburgh Steelers","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T17:00:00Z', 'Tampa Bay Buccaneers', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Jets","price":3.7},{"name":"Tampa Bay Buccaneers","price":1.29}]},{"key":"spreads","outcomes":[{"name":"New York Jets","price":1.89},{"name":"Tampa Bay Buccaneers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New York Jets","price":"3.70"},{"name":"Tampa Bay Buccaneers","price":"1.29"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T20:05:00Z', 'Los Angeles Chargers', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":2.05},{"name":"Los Angeles Chargers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":2},{"name":"Los Angeles Chargers","price":1.83}]}]}]', [{"name":"Denver Broncos","price":"2.05"},{"name":"Los Angeles Chargers","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T20:05:00Z', 'Seattle Seahawks', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":3.3},{"name":"Seattle Seahawks","price":1.35}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.95},{"name":"Seattle Seahawks","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.95},{"name":"Seattle Seahawks","price":1.87}]}]}]', [{"name":"New Orleans Saints","price":"3.30"},{"name":"Seattle Seahawks","price":"1.35"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T20:25:00Z', 'San Francisco 49ers', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.64},{"name":"San Francisco 49ers","price":1.51}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"San Francisco 49ers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.5},{"name":"San Francisco 49ers","price":1.56}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"San Francisco 49ers","price":1.87}]}]}]', [{"name":"Arizona Cardinals","price":"2.57"},{"name":"San Francisco 49ers","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-21T20:25:00Z', 'Chicago Bears', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.6},{"name":"Dallas Cowboys","price":2.4}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Dallas Cowboys","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.60"},{"name":"Dallas Cowboys","price":"2.40"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-22T00:20:00Z', 'New York Giants', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.34},{"name":"New York Giants","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"New York Giants","price":1.91}]}]}]', [{"name":"Kansas City Chiefs","price":"1.34"},{"name":"New York Giants","price":"3.40"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-23T00:15:00Z', 'Baltimore Ravens', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.54},{"name":"Detroit Lions","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.87},{"name":"Detroit Lions","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.54"},{"name":"Detroit Lions","price":"2.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-26T00:15:00Z', 'Arizona Cardinals', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.74},{"name":"Seattle Seahawks","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.93},{"name":"Seattle Seahawks","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.71},{"name":"Seattle Seahawks","price":2.15}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"Seattle Seahawks","price":1.87}]}]}]', [{"name":"Arizona Cardinals","price":"1.73"},{"name":"Seattle Seahawks","price":"2.15"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T13:30:00Z', 'Pittsburgh Steelers', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":1.82},{"name":"Pittsburgh Steelers","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":1.79},{"name":"Pittsburgh Steelers","price":1.99}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":1.83},{"name":"Pittsburgh Steelers","price":2}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]}]}]', [{"name":"Minnesota Vikings","price":"1.81"},{"name":"Pittsburgh Steelers","price":"2.00"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'Atlanta Falcons', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.54},{"name":"Washington Commanders","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.87},{"name":"Washington Commanders","price":1.95}]}]}]', [{"name":"Atlanta Falcons","price":"2.54"},{"name":"Washington Commanders","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'Buffalo Bills', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.15},{"name":"New Orleans Saints","price":5.9}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.15"},{"name":"New Orleans Saints","price":"5.90"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'New England Patriots', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.54},{"name":"New England Patriots","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"New England Patriots","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"New England Patriots","price":1.87}]}]}]', [{"name":"Carolina Panthers","price":"2.54"},{"name":"New England Patriots","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'Detroit Lions', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":5.1},{"name":"Detroit Lions","price":1.18}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.89},{"name":"Detroit Lions","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cleveland Browns","price":"5.10"},{"name":"Detroit Lions","price":"1.18"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'Houston Texans', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.38},{"name":"Tennessee Titans","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.43},{"name":"Tennessee Titans","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Tennessee Titans","price":1.91}]}]}]', [{"name":"Houston Texans","price":"1.40"},{"name":"Tennessee Titans","price":"3.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'New York Giants', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":1.56},{"name":"New York Giants","price":2.5}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"New York Giants","price":1.91}]}]}]', [{"name":"Los Angeles Chargers","price":"1.56"},{"name":"New York Giants","price":"2.50"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T17:00:00Z', 'Tampa Bay Buccaneers', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Eagles","price":1.7},{"name":"Tampa Bay Buccaneers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]}]}]', [{"name":"Philadelphia Eagles","price":"1.70"},{"name":"Tampa Bay Buccaneers","price":"2.20"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T20:05:00Z', 'Los Angeles Rams', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":3.4},{"name":"Los Angeles Rams","price":1.34}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Los Angeles Rams","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"3.40"},{"name":"Los Angeles Rams","price":"1.34"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T20:05:00Z', 'San Francisco 49ers', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.9},{"name":"San Francisco 49ers","price":1.43}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.89},{"name":"San Francisco 49ers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.83},{"name":"San Francisco 49ers","price":2}]}]}]', [{"name":"Jacksonville Jaguars","price":"2.90"},{"name":"San Francisco 49ers","price":"1.43"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T20:25:00Z', 'Kansas City Chiefs', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":2.05},{"name":"Kansas City Chiefs","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.89},{"name":"Kansas City Chiefs","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"Kansas City Chiefs","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"Kansas City Chiefs","price":1.83}]}]}]', [{"name":"Baltimore Ravens","price":"2.02"},{"name":"Kansas City Chiefs","price":"1.81"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-28T20:25:00Z', 'Las Vegas Raiders', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.82},{"name":"Las Vegas Raiders","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.82"},{"name":"Las Vegas Raiders","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-29T00:20:00Z', 'Dallas Cowboys', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.02},{"name":"Green Bay Packers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.93},{"name":"Green Bay Packers","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":2},{"name":"Green Bay Packers","price":1.83}]}]}]', [{"name":"Dallas Cowboys","price":"2.02"},{"name":"Green Bay Packers","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-29T23:15:00Z', 'Miami Dolphins', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":1.42},{"name":"New York Jets","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"1.42"},{"name":"New York Jets","price":"2.95"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-09-30T00:15:00Z', 'Denver Broncos', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":2.14},{"name":"Denver Broncos","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Denver Broncos","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.83},{"name":"Denver Broncos","price":2}]}]}]', [{"name":"Cincinnati Bengals","price":"2.14"},{"name":"Denver Broncos","price":"1.74"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-03T00:15:00Z', 'Los Angeles Rams', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.82},{"name":"San Francisco 49ers","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.83},{"name":"San Francisco 49ers","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.87},{"name":"San Francisco 49ers","price":1.95}]}]}]', [{"name":"Los Angeles Rams","price":"1.83"},{"name":"San Francisco 49ers","price":"2.01"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T13:30:00Z', 'Cleveland Browns', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.7},{"name":"Minnesota Vikings","price":1.29}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.95},{"name":"Minnesota Vikings","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.6},{"name":"Minnesota Vikings","price":1.28}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.6},{"name":"Minnesota Vikings","price":1.31}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":2},{"name":"Minnesota Vikings","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.95},{"name":"Minnesota Vikings","price":1.87}]}]}]', [{"name":"Cleveland Browns","price":"3.63"},{"name":"Minnesota Vikings","price":"1.29"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T17:00:00Z', 'Baltimore Ravens', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.28},{"name":"Houston Texans","price":3.85}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.95},{"name":"Houston Texans","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.95},{"name":"Houston Texans","price":1.87}]}]}]', [{"name":"Baltimore Ravens","price":"1.28"},{"name":"Houston Texans","price":"3.85"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T17:00:00Z', 'Carolina Panthers', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.02},{"name":"Miami Dolphins","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.89},{"name":"Miami Dolphins","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"Miami Dolphins","price":1.87}]}]}]', [{"name":"Carolina Panthers","price":"2.02"},{"name":"Miami Dolphins","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T17:00:00Z', 'New York Jets', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":1.74},{"name":"New York Jets","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"1.74"},{"name":"New York Jets","price":"2.14"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T17:00:00Z', 'Philadelphia Eagles', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":2.7},{"name":"Philadelphia Eagles","price":1.49}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"2.70"},{"name":"Philadelphia Eagles","price":"1.49"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T17:00:00Z', 'Indianapolis Colts', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.8},{"name":"Las Vegas Raiders","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.87},{"name":"Las Vegas Raiders","price":1.95}]}]}]', [{"name":"Indianapolis Colts","price":"1.80"},{"name":"Las Vegas Raiders","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T17:00:00Z', 'New Orleans Saints', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":2.02},{"name":"New York Giants","price":1.82}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.95},{"name":"New York Giants","price":1.87}]}]}]', [{"name":"New Orleans Saints","price":"2.02"},{"name":"New York Giants","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T20:05:00Z', 'Arizona Cardinals', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.42},{"name":"Tennessee Titans","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":2},{"name":"Tennessee Titans","price":1.83}]}]}]', [{"name":"Arizona Cardinals","price":"1.42"},{"name":"Tennessee Titans","price":"2.95"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T20:05:00Z', 'Seattle Seahawks', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Seahawks","price":2.02},{"name":"Tampa Bay Buccaneers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Seattle Seahawks","price":1.89},{"name":"Tampa Bay Buccaneers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Seattle Seahawks","price":1.95},{"name":"Tampa Bay Buccaneers","price":1.87}]}]}]', [{"name":"Seattle Seahawks","price":"2.02"},{"name":"Tampa Bay Buccaneers","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T20:25:00Z', 'Cincinnati Bengals', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":2.02},{"name":"Detroit Lions","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.87},{"name":"Detroit Lions","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"2.02"},{"name":"Detroit Lions","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-05T20:25:00Z', 'Los Angeles Chargers', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":1.82},{"name":"Washington Commanders","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.95},{"name":"Washington Commanders","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.87},{"name":"Washington Commanders","price":1.95}]}]}]', [{"name":"Los Angeles Chargers","price":"1.82"},{"name":"Washington Commanders","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-06T00:20:00Z', 'Buffalo Bills', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.25},{"name":"New England Patriots","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.27},{"name":"New England Patriots","price":4}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.26"},{"name":"New England Patriots","price":"4.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-07T00:15:00Z', 'Jacksonville Jaguars', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.8},{"name":"Kansas City Chiefs","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.93},{"name":"Kansas City Chiefs","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.95},{"name":"Kansas City Chiefs","price":1.87}]}]}]', [{"name":"Jacksonville Jaguars","price":"2.80"},{"name":"Kansas City Chiefs","price":"1.46"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-10T00:15:00Z', 'New York Giants', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.7},{"name":"Philadelphia Eagles","price":1.29}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":3.4},{"name":"Philadelphia Eagles","price":1.33}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.95},{"name":"Philadelphia Eagles","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]}]}]', [{"name":"New York Giants","price":"3.55"},{"name":"Philadelphia Eagles","price":"1.31"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T13:30:00Z', 'New York Jets', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.34},{"name":"New York Jets","price":3.35}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.3},{"name":"New York Jets","price":3.65}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.83},{"name":"New York Jets","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.29},{"name":"New York Jets","price":3.46}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.31"},{"name":"New York Jets","price":"3.49"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Indianapolis Colts', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.82},{"name":"Indianapolis Colts","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Indianapolis Colts","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.87},{"name":"Indianapolis Colts","price":1.95}]}]}]', [{"name":"Arizona Cardinals","price":"1.82"},{"name":"Indianapolis Colts","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Baltimore Ravens', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.4},{"name":"Los Angeles Rams","price":3.05}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.89},{"name":"Los Angeles Rams","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"Los Angeles Rams","price":1.83}]}]}]', [{"name":"Baltimore Ravens","price":"1.40"},{"name":"Los Angeles Rams","price":"3.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Carolina Panthers', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.02},{"name":"Dallas Cowboys","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.89},{"name":"Dallas Cowboys","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"Dallas Cowboys","price":1.87}]}]}]', [{"name":"Carolina Panthers","price":"2.02"},{"name":"Dallas Cowboys","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Pittsburgh Steelers', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.35},{"name":"Pittsburgh Steelers","price":1.34}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.6},{"name":"Pittsburgh Steelers","price":1.31}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]}]}]', [{"name":"Cleveland Browns","price":"3.48"},{"name":"Pittsburgh Steelers","price":"1.33"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Jacksonville Jaguars', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":1.83},{"name":"Seattle Seahawks","price":2}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.93},{"name":"Seattle Seahawks","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.87},{"name":"Seattle Seahawks","price":1.95}]}]}]', [{"name":"Jacksonville Jaguars","price":"1.83"},{"name":"Seattle Seahawks","price":"2.00"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Miami Dolphins', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":1.74},{"name":"Miami Dolphins","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.89},{"name":"Miami Dolphins","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.87},{"name":"Miami Dolphins","price":1.95}]}]}]', [{"name":"Los Angeles Chargers","price":"1.74"},{"name":"Miami Dolphins","price":"2.14"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T17:00:00Z', 'Tampa Bay Buccaneers', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":2.1},{"name":"Tampa Bay Buccaneers","price":1.77}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.95},{"name":"Tampa Bay Buccaneers","price":1.87}]}]}]', [{"name":"San Francisco 49ers","price":"2.10"},{"name":"Tampa Bay Buccaneers","price":"1.77"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T20:05:00Z', 'Las Vegas Raiders', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":1.57},{"name":"Tennessee Titans","price":2.45}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.87},{"name":"Tennessee Titans","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.87},{"name":"Tennessee Titans","price":1.95}]}]}]', [{"name":"Las Vegas Raiders","price":"1.57"},{"name":"Tennessee Titans","price":"2.45"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T20:25:00Z', 'Green Bay Packers', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":2.3},{"name":"Green Bay Packers","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Green Bay Packers","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"2.30"},{"name":"Green Bay Packers","price":"1.65"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-12T20:25:00Z', 'New Orleans Saints', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":1.6},{"name":"New Orleans Saints","price":2.4}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"New Orleans Saints","price":1.91}]}]}]', [{"name":"New England Patriots","price":"1.60"},{"name":"New Orleans Saints","price":"2.40"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-13T00:20:00Z', 'Kansas City Chiefs', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.3},{"name":"Kansas City Chiefs","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.87},{"name":"Kansas City Chiefs","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.3},{"name":"Kansas City Chiefs","price":1.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"2.30"},{"name":"Kansas City Chiefs","price":"1.65"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-13T23:15:00Z', 'Atlanta Falcons', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.9},{"name":"Buffalo Bills","price":1.43}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Buffalo Bills","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"2.90"},{"name":"Buffalo Bills","price":"1.43"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-14T00:15:00Z', 'Washington Commanders', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.7},{"name":"Washington Commanders","price":1.49}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.70"},{"name":"Washington Commanders","price":"1.49"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-17T00:15:00Z', 'Cincinnati Bengals', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.44},{"name":"Pittsburgh Steelers","price":2.85}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.5},{"name":"Pittsburgh Steelers","price":2.65}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.47"},{"name":"Pittsburgh Steelers","price":"2.75"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T13:30:00Z', 'Jacksonville Jaguars', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.54},{"name":"Los Angeles Rams","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.68},{"name":"Los Angeles Rams","price":1.5}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.95},{"name":"Los Angeles Rams","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.52},{"name":"Los Angeles Rams","price":1.51}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.5},{"name":"Los Angeles Rams","price":1.56}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"Los Angeles Rams","price":1.91}]}]}]', [{"name":"Jacksonville Jaguars","price":"2.56"},{"name":"Los Angeles Rams","price":"1.53"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T17:00:00Z', 'New York Jets', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.05},{"name":"New York Jets","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.89},{"name":"New York Jets","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Carolina Panthers","price":"2.05"},{"name":"New York Jets","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T17:00:00Z', 'Chicago Bears', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.29},{"name":"New Orleans Saints","price":3.75}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.29"},{"name":"New Orleans Saints","price":"3.75"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T17:00:00Z', 'Cleveland Browns', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":2.05},{"name":"Miami Dolphins","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.95},{"name":"Miami Dolphins","price":1.87}]}]}]', [{"name":"Cleveland Browns","price":"2.05"},{"name":"Miami Dolphins","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T17:00:00Z', 'Kansas City Chiefs', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.24},{"name":"Las Vegas Raiders","price":4.3}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.22},{"name":"Las Vegas Raiders","price":4.33}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]}]}]', [{"name":"Kansas City Chiefs","price":"1.23"},{"name":"Las Vegas Raiders","price":"4.31"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T17:00:00Z', 'Minnesota Vikings', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":2.4},{"name":"Philadelphia Eagles","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.95},{"name":"Philadelphia Eagles","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.95},{"name":"Philadelphia Eagles","price":1.87}]}]}]', [{"name":"Minnesota Vikings","price":"2.40"},{"name":"Philadelphia Eagles","price":"1.60"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T17:00:00Z', 'Tennessee Titans', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":1.82},{"name":"Tennessee Titans","price":2.02}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.87},{"name":"Tennessee Titans","price":1.95}]}]}]', [{"name":"New England Patriots","price":"1.82"},{"name":"Tennessee Titans","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T20:05:00Z', 'Denver Broncos', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.29},{"name":"New York Giants","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.93},{"name":"New York Giants","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"New York Giants","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.29"},{"name":"New York Giants","price":"3.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T20:05:00Z', 'Los Angeles Chargers', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":3.1},{"name":"Los Angeles Chargers","price":1.39}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"3.10"},{"name":"Los Angeles Chargers","price":"1.39"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T20:25:00Z', 'Arizona Cardinals', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.02},{"name":"Green Bay Packers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"Green Bay Packers","price":1.87}]}]}]', [{"name":"Arizona Cardinals","price":"2.02"},{"name":"Green Bay Packers","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-19T20:25:00Z', 'Dallas Cowboys', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.2},{"name":"Washington Commanders","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.1},{"name":"Washington Commanders","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.8},{"name":"Washington Commanders","price":2.05}]}]}]', [{"name":"Dallas Cowboys","price":"2.15"},{"name":"Washington Commanders","price":"1.73"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-20T00:20:00Z', 'San Francisco 49ers', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":3.35},{"name":"San Francisco 49ers","price":1.34}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"San Francisco 49ers","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"3.35"},{"name":"San Francisco 49ers","price":"1.34"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-20T23:00:00Z', 'Detroit Lions', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.52},{"name":"Tampa Bay Buccaneers","price":2.6}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.52"},{"name":"Tampa Bay Buccaneers","price":"2.60"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-21T02:00:00Z', 'Seattle Seahawks', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.05},{"name":"Seattle Seahawks","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.95},{"name":"Seattle Seahawks","price":1.87}]}]}]', [{"name":"Houston Texans","price":"2.05"},{"name":"Seattle Seahawks","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-24T00:15:00Z', 'Los Angeles Chargers', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":1.65},{"name":"Minnesota Vikings","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Minnesota Vikings","price":1.91}]}]}]', [{"name":"Los Angeles Chargers","price":"1.65"},{"name":"Minnesota Vikings","price":"2.30"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'Atlanta Falcons', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.8},{"name":"Miami Dolphins","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"1.80"},{"name":"Miami Dolphins","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'Baltimore Ravens', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.31},{"name":"Chicago Bears","price":3.6}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Chicago Bears","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.31"},{"name":"Chicago Bears","price":"3.60"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'Carolina Panthers', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.32},{"name":"Carolina Panthers","price":3.5}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Carolina Panthers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.32"},{"name":"Carolina Panthers","price":"3.50"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'Cincinnati Bengals', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.28},{"name":"New York Jets","price":3.85}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.28"},{"name":"New York Jets","price":"3.85"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'New England Patriots', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":2.9},{"name":"New England Patriots","price":1.43}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.93},{"name":"New England Patriots","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.83},{"name":"New England Patriots","price":2}]}]}]', [{"name":"Cleveland Browns","price":"2.90"},{"name":"New England Patriots","price":"1.43"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'Houston Texans', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.02},{"name":"San Francisco 49ers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.89},{"name":"San Francisco 49ers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.95},{"name":"San Francisco 49ers","price":1.87}]}]}]', [{"name":"Houston Texans","price":"2.02"},{"name":"San Francisco 49ers","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T17:00:00Z', 'Philadelphia Eagles', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":5},{"name":"Philadelphia Eagles","price":1.19}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":4.8},{"name":"Philadelphia Eagles","price":1.2}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]}]}]', [{"name":"New York Giants","price":"4.90"},{"name":"Philadelphia Eagles","price":"1.19"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T20:05:00Z', 'New Orleans Saints', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":2.9},{"name":"Tampa Bay Buccaneers","price":1.43}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.93},{"name":"Tampa Bay Buccaneers","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":2.8},{"name":"Tampa Bay Buccaneers","price":1.45}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.83},{"name":"Tampa Bay Buccaneers","price":2}]}]}]', [{"name":"New Orleans Saints","price":"2.85"},{"name":"Tampa Bay Buccaneers","price":"1.44"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T20:25:00Z', 'Denver Broncos', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.8},{"name":"Denver Broncos","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Denver Broncos","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Denver Broncos","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"2.80"},{"name":"Denver Broncos","price":"1.46"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-26T20:25:00Z', 'Indianapolis Colts', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.54},{"name":"Tennessee Titans","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.56},{"name":"Tennessee Titans","price":2.5}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Tennessee Titans","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"1.55"},{"name":"Tennessee Titans","price":"2.52"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-27T00:20:00Z', 'Pittsburgh Steelers', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.8},{"name":"Pittsburgh Steelers","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]}]}]', [{"name":"Green Bay Packers","price":"1.80"},{"name":"Pittsburgh Steelers","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-28T00:15:00Z', 'Kansas City Chiefs', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.49},{"name":"Washington Commanders","price":2.7}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.87},{"name":"Washington Commanders","price":1.95}]}]}]', [{"name":"Kansas City Chiefs","price":"1.49"},{"name":"Washington Commanders","price":"2.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-10-31T00:15:00Z', 'Miami Dolphins', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.41},{"name":"Miami Dolphins","price":3}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Miami Dolphins","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.41"},{"name":"Miami Dolphins","price":"3.00"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'New England Patriots', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.4},{"name":"New England Patriots","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"New England Patriots","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"2.40"},{"name":"New England Patriots","price":"1.60"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'Green Bay Packers', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":3.85},{"name":"Green Bay Packers","price":1.28}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Green Bay Packers","price":1.91}]}]}]', [{"name":"Carolina Panthers","price":"3.85"},{"name":"Green Bay Packers","price":"1.28"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'Cincinnati Bengals', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.4},{"name":"Cincinnati Bengals","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.95},{"name":"Cincinnati Bengals","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.40"},{"name":"Cincinnati Bengals","price":"1.60"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'Houston Texans', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.85},{"name":"Houston Texans","price":1.98}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.98},{"name":"Houston Texans","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.87},{"name":"Houston Texans","price":1.95}]}]}]', [{"name":"Denver Broncos","price":"1.85"},{"name":"Houston Texans","price":"1.98"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'Detroit Lions', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.46},{"name":"Minnesota Vikings","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.5},{"name":"Minnesota Vikings","price":2.65}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.48"},{"name":"Minnesota Vikings","price":"2.72"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'Pittsburgh Steelers', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2.54},{"name":"Pittsburgh Steelers","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"2.54"},{"name":"Pittsburgh Steelers","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'Tennessee Titans', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":1.49},{"name":"Tennessee Titans","price":2.7}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Tennessee Titans","price":1.91}]}]}]', [{"name":"Los Angeles Chargers","price":"1.49"},{"name":"Tennessee Titans","price":"2.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T18:00:00Z', 'New York Giants', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":2.54},{"name":"San Francisco 49ers","price":1.54}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"San Francisco 49ers","price":1.91}]}]}]', [{"name":"New York Giants","price":"2.54"},{"name":"San Francisco 49ers","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T21:05:00Z', 'Las Vegas Raiders', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.05},{"name":"Las Vegas Raiders","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.89},{"name":"Las Vegas Raiders","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.95},{"name":"Las Vegas Raiders","price":1.87}]}]}]', [{"name":"Jacksonville Jaguars","price":"2.05"},{"name":"Las Vegas Raiders","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T21:05:00Z', 'Los Angeles Rams', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.23},{"name":"New Orleans Saints","price":4.4}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"New Orleans Saints","price":1.91}]}]}]', [{"name":"Los Angeles Rams","price":"1.23"},{"name":"New Orleans Saints","price":"4.40"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-02T21:25:00Z', 'Buffalo Bills', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.7},{"name":"Kansas City Chiefs","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.87},{"name":"Kansas City Chiefs","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.65},{"name":"Kansas City Chiefs","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.67"},{"name":"Kansas City Chiefs","price":"2.25"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-03T01:20:00Z', 'Washington Commanders', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Seahawks","price":3},{"name":"Washington Commanders","price":1.41}]},{"key":"spreads","outcomes":[{"name":"Seattle Seahawks","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Seattle Seahawks","price":1.87},{"name":"Washington Commanders","price":1.95}]}]}]', [{"name":"Seattle Seahawks","price":"3.00"},{"name":"Washington Commanders","price":"1.41"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-04T01:15:00Z', 'Dallas Cowboys', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2},{"name":"Dallas Cowboys","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Dallas Cowboys","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"Dallas Cowboys","price":1.87}]}]}]', [{"name":"Arizona Cardinals","price":"2.00"},{"name":"Dallas Cowboys","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-07T01:15:00Z', 'Denver Broncos', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.34},{"name":"Las Vegas Raiders","price":3.35}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.89},{"name":"Las Vegas Raiders","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.31},{"name":"Las Vegas Raiders","price":3.6}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.33"},{"name":"Las Vegas Raiders","price":"3.48"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T14:30:00Z', 'Indianapolis Colts', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.87},{"name":"Indianapolis Colts","price":1.95}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.98},{"name":"Indianapolis Colts","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.85},{"name":"Indianapolis Colts","price":2}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"Indianapolis Colts","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.84},{"name":"Indianapolis Colts","price":1.94}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Indianapolis Colts","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"1.85"},{"name":"Indianapolis Colts","price":"1.96"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'Minnesota Vikings', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.54},{"name":"Minnesota Vikings","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.95},{"name":"Minnesota Vikings","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.95},{"name":"Minnesota Vikings","price":1.87}]}]}]', [{"name":"Baltimore Ravens","price":"1.54"},{"name":"Minnesota Vikings","price":"2.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'Miami Dolphins', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.43},{"name":"Miami Dolphins","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.45},{"name":"Miami Dolphins","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.44"},{"name":"Miami Dolphins","price":"2.85"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'Carolina Panthers', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":1.51},{"name":"New Orleans Saints","price":2.64}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"New Orleans Saints","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":1.5},{"name":"New Orleans Saints","price":2.65}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"New Orleans Saints","price":1.87}]}]}]', [{"name":"Carolina Panthers","price":"1.50"},{"name":"New Orleans Saints","price":"2.65"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'Chicago Bears', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.43},{"name":"New York Giants","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.43"},{"name":"New York Giants","price":"2.90"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'New York Jets', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":2.2},{"name":"New York Jets","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cleveland Browns","price":"2.20"},{"name":"New York Jets","price":"1.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'Houston Texans', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.54},{"name":"Jacksonville Jaguars","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.56},{"name":"Jacksonville Jaguars","price":2.5}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Houston Texans","price":"1.55"},{"name":"Jacksonville Jaguars","price":"2.52"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T18:00:00Z', 'Tampa Bay Buccaneers', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":2.8},{"name":"Tampa Bay Buccaneers","price":1.46}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]}]}]', [{"name":"New England Patriots","price":"2.80"},{"name":"Tampa Bay Buccaneers","price":"1.46"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T21:05:00Z', 'Seattle Seahawks', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.02},{"name":"Seattle Seahawks","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2},{"name":"Seattle Seahawks","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"Seattle Seahawks","price":1.87}]}]}]', [{"name":"Arizona Cardinals","price":"2.01"},{"name":"Seattle Seahawks","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T21:25:00Z', 'Washington Commanders', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.05},{"name":"Washington Commanders","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]}]', [{"name":"Detroit Lions","price":"2.05"},{"name":"Washington Commanders","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-09T21:25:00Z', 'San Francisco 49ers', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":2.02},{"name":"San Francisco 49ers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":2},{"name":"San Francisco 49ers","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.95},{"name":"San Francisco 49ers","price":1.87}]}]}]', [{"name":"Los Angeles Rams","price":"2.01"},{"name":"San Francisco 49ers","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-10T01:20:00Z', 'Los Angeles Chargers', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":1.46},{"name":"Pittsburgh Steelers","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]}]}]', [{"name":"Los Angeles Chargers","price":"1.46"},{"name":"Pittsburgh Steelers","price":"2.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-11T01:15:00Z', 'Green Bay Packers', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":2.05},{"name":"Philadelphia Eagles","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":2.02},{"name":"Philadelphia Eagles","price":1.78}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.95},{"name":"Philadelphia Eagles","price":1.87}]}]}]', [{"name":"Green Bay Packers","price":"2.04"},{"name":"Philadelphia Eagles","price":"1.79"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-14T01:15:00Z', 'New England Patriots', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":1.43},{"name":"New York Jets","price":2.9}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New England Patriots","price":"1.43"},{"name":"New York Jets","price":"2.90"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T14:30:00Z', 'Miami Dolphins', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":2.8},{"name":"Washington Commanders","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":2.72},{"name":"Washington Commanders","price":1.44}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":2.65},{"name":"Washington Commanders","price":1.5}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"2.72"},{"name":"Washington Commanders","price":"1.47"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'Atlanta Falcons', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.6},{"name":"Carolina Panthers","price":2.4}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"Carolina Panthers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"1.60"},{"name":"Carolina Panthers","price":"2.40"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'Buffalo Bills', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.43},{"name":"Tampa Bay Buccaneers","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.43"},{"name":"Tampa Bay Buccaneers","price":"2.90"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'Minnesota Vikings', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.2},{"name":"Minnesota Vikings","price":1.7}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.93},{"name":"Minnesota Vikings","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.1},{"name":"Minnesota Vikings","price":1.77}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.15"},{"name":"Minnesota Vikings","price":"1.73"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'Pittsburgh Steelers', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.83},{"name":"Pittsburgh Steelers","price":2}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.93},{"name":"Pittsburgh Steelers","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.83},{"name":"Pittsburgh Steelers","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.83"},{"name":"Pittsburgh Steelers","price":"2.00"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'New York Giants', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.46},{"name":"New York Giants","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Green Bay Packers","price":"1.46"},{"name":"New York Giants","price":"2.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'Tennessee Titans', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.62},{"name":"Tennessee Titans","price":2.36}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.62},{"name":"Tennessee Titans","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Houston Texans","price":"1.62"},{"name":"Tennessee Titans","price":"2.33"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T18:00:00Z', 'Jacksonville Jaguars', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":2.02},{"name":"Los Angeles Chargers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.95},{"name":"Los Angeles Chargers","price":1.87}]}]}]', [{"name":"Jacksonville Jaguars","price":"2.02"},{"name":"Los Angeles Chargers","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T21:05:00Z', 'Arizona Cardinals', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.02},{"name":"San Francisco 49ers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.89},{"name":"San Francisco 49ers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"San Francisco 49ers","price":1.87}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2},{"name":"San Francisco 49ers","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"2.01"},{"name":"San Francisco 49ers","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T21:05:00Z', 'Los Angeles Rams', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.49},{"name":"Seattle Seahawks","price":2.7}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"Seattle Seahawks","price":1.91}]}]}]', [{"name":"Los Angeles Rams","price":"1.49"},{"name":"Seattle Seahawks","price":"2.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T21:25:00Z', 'Cleveland Browns', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.24},{"name":"Cleveland Browns","price":4.3}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.87},{"name":"Cleveland Browns","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.95},{"name":"Cleveland Browns","price":1.87}]}]}]', [{"name":"Baltimore Ravens","price":"1.24"},{"name":"Cleveland Browns","price":"4.30"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-16T21:25:00Z', 'Denver Broncos', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":2.02},{"name":"Kansas City Chiefs","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"2.02"},{"name":"Kansas City Chiefs","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-17T01:20:00Z', 'Philadelphia Eagles', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":2.54},{"name":"Philadelphia Eagles","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"2.54"},{"name":"Philadelphia Eagles","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-18T01:15:00Z', 'Las Vegas Raiders', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":1.8},{"name":"Las Vegas Raiders","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.95},{"name":"Las Vegas Raiders","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"1.80"},{"name":"Las Vegas Raiders","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-21T01:15:00Z', 'Houston Texans', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.54},{"name":"Houston Texans","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Houston Texans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]}]', [{"name":"Buffalo Bills","price":"1.54"},{"name":"Houston Texans","price":"2.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Baltimore Ravens', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.16},{"name":"New York Jets","price":5.55}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.16"},{"name":"New York Jets","price":"5.55"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Chicago Bears', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.74},{"name":"Pittsburgh Steelers","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.74"},{"name":"Pittsburgh Steelers","price":"2.14"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Cincinnati Bengals', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.44},{"name":"New England Patriots","price":2.85}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"New England Patriots","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.44"},{"name":"New England Patriots","price":"2.85"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Detroit Lions', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.24},{"name":"New York Giants","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.24"},{"name":"New York Giants","price":"4.20"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Green Bay Packers', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.54},{"name":"Minnesota Vikings","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.91},{"name":"Minnesota Vikings","price":1.91}]}]}]', [{"name":"Green Bay Packers","price":"1.54"},{"name":"Minnesota Vikings","price":"2.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Kansas City Chiefs', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":4.4},{"name":"Kansas City Chiefs","price":1.23}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"4.40"},{"name":"Kansas City Chiefs","price":"1.23"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T18:00:00Z', 'Tennessee Titans', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Seattle Seahawks","price":1.8},{"name":"Tennessee Titans","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Seattle Seahawks","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Seattle Seahawks","price":1.87},{"name":"Tennessee Titans","price":1.95}]}]}]', [{"name":"Seattle Seahawks","price":"1.80"},{"name":"Tennessee Titans","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T21:05:00Z', 'Arizona Cardinals', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.62},{"name":"Jacksonville Jaguars","price":2.36}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.87},{"name":"Jacksonville Jaguars","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.87},{"name":"Jacksonville Jaguars","price":1.95}]}]}]', [{"name":"Arizona Cardinals","price":"1.62"},{"name":"Jacksonville Jaguars","price":"2.36"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T21:05:00Z', 'Las Vegas Raiders', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":2.54},{"name":"Las Vegas Raiders","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]}]}]', [{"name":"Cleveland Browns","price":"2.54"},{"name":"Las Vegas Raiders","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T21:25:00Z', 'New Orleans Saints', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.77},{"name":"New Orleans Saints","price":2.1}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"New Orleans Saints","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"1.77"},{"name":"New Orleans Saints","price":"2.10"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-23T21:25:00Z', 'Dallas Cowboys', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.8},{"name":"Philadelphia Eagles","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"2.80"},{"name":"Philadelphia Eagles","price":"1.46"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-24T01:20:00Z', 'Los Angeles Rams', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.7},{"name":"Tampa Bay Buccaneers","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.95},{"name":"Tampa Bay Buccaneers","price":1.87}]}]}]', [{"name":"Los Angeles Rams","price":"1.70"},{"name":"Tampa Bay Buccaneers","price":"2.20"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-25T01:15:00Z', 'San Francisco 49ers', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":3.5},{"name":"San Francisco 49ers","price":1.32}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.87},{"name":"San Francisco 49ers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.87},{"name":"San Francisco 49ers","price":1.95}]}]}]', [{"name":"Carolina Panthers","price":"3.50"},{"name":"San Francisco 49ers","price":"1.32"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-27T18:00:00Z', 'Detroit Lions', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.65},{"name":"Green Bay Packers","price":2.3}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.85},{"name":"Green Bay Packers","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.65"},{"name":"Green Bay Packers","price":"2.30"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-27T21:30:00Z', 'Dallas Cowboys', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.1},{"name":"Kansas City Chiefs","price":1.39}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.87},{"name":"Kansas City Chiefs","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3},{"name":"Kansas City Chiefs","price":1.38}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"3.05"},{"name":"Kansas City Chiefs","price":"1.38"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-28T01:20:00Z', 'Baltimore Ravens', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.41},{"name":"Cincinnati Bengals","price":3}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.41"},{"name":"Cincinnati Bengals","price":"3.00"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-28T20:00:00Z', 'Philadelphia Eagles', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":3.6},{"name":"Philadelphia Eagles","price":1.31}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":3.48},{"name":"Philadelphia Eagles","price":1.29}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"3.54"},{"name":"Philadelphia Eagles","price":"1.30"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'Tampa Bay Buccaneers', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.54},{"name":"Tampa Bay Buccaneers","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"2.54"},{"name":"Tampa Bay Buccaneers","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'New York Jets', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.8},{"name":"New York Jets","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"1.80"},{"name":"New York Jets","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'Carolina Panthers', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.54},{"name":"Los Angeles Rams","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Los Angeles Rams","price":1.91}]}]}]', [{"name":"Carolina Panthers","price":"2.54"},{"name":"Los Angeles Rams","price":"1.54"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'Cleveland Browns', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":3.1},{"name":"San Francisco 49ers","price":1.39}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"San Francisco 49ers","price":1.91}]}]}]', [{"name":"Cleveland Browns","price":"3.10"},{"name":"San Francisco 49ers","price":"1.39"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'Indianapolis Colts', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.82},{"name":"Indianapolis Colts","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Indianapolis Colts","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Houston Texans","price":"1.82"},{"name":"Indianapolis Colts","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'Tennessee Titans', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":1.8},{"name":"Tennessee Titans","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.93},{"name":"Tennessee Titans","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.87},{"name":"Tennessee Titans","price":1.95}]}]}]', [{"name":"Jacksonville Jaguars","price":"1.80"},{"name":"Tennessee Titans","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T18:00:00Z', 'Miami Dolphins', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":1.39},{"name":"New Orleans Saints","price":3.1}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"New Orleans Saints","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"1.39"},{"name":"New Orleans Saints","price":"3.10"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T21:05:00Z', 'Seattle Seahawks', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":2.02},{"name":"Seattle Seahawks","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.87},{"name":"Seattle Seahawks","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.95},{"name":"Seattle Seahawks","price":1.87}]}]}]', [{"name":"Minnesota Vikings","price":"2.02"},{"name":"Seattle Seahawks","price":"1.82"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T21:25:00Z', 'Pittsburgh Steelers', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.46},{"name":"Pittsburgh Steelers","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.87},{"name":"Pittsburgh Steelers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.46"},{"name":"Pittsburgh Steelers","price":"2.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-11-30T21:25:00Z', 'Los Angeles Chargers', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":3.3},{"name":"Los Angeles Chargers","price":1.35}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]}]}]', [{"name":"Las Vegas Raiders","price":"3.30"},{"name":"Los Angeles Chargers","price":"1.35"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-01T01:20:00Z', 'Washington Commanders', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":2.14},{"name":"Washington Commanders","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"2.14"},{"name":"Washington Commanders","price":"1.74"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-02T01:15:00Z', 'New England Patriots', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":1.62},{"name":"New York Giants","price":2.36}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.87},{"name":"New York Giants","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New England Patriots","price":"1.62"},{"name":"New York Giants","price":"2.36"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-05T01:15:00Z', 'Detroit Lions', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":3.25},{"name":"Detroit Lions","price":1.36}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.95},{"name":"Detroit Lions","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"3.25"},{"name":"Detroit Lions","price":"1.36"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Atlanta Falcons', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.8},{"name":"Seattle Seahawks","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.89},{"name":"Seattle Seahawks","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]}]', [{"name":"Atlanta Falcons","price":"1.80"},{"name":"Seattle Seahawks","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Baltimore Ravens', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.24},{"name":"Pittsburgh Steelers","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"Pittsburgh Steelers","price":1.83}]}]}]', [{"name":"Baltimore Ravens","price":"1.24"},{"name":"Pittsburgh Steelers","price":"4.20"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Green Bay Packers', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.64},{"name":"Green Bay Packers","price":1.51}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.95},{"name":"Green Bay Packers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]}]', [{"name":"Chicago Bears","price":"2.64"},{"name":"Green Bay Packers","price":"1.51"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Cleveland Browns', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":1.82},{"name":"Tennessee Titans","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.87},{"name":"Tennessee Titans","price":1.95}]}]}]', [{"name":"Cleveland Browns","price":"1.82"},{"name":"Tennessee Titans","price":"2.02"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Jacksonville Jaguars', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2.36},{"name":"Jacksonville Jaguars","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"2.36"},{"name":"Jacksonville Jaguars","price":"1.62"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'New York Jets', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":1.8},{"name":"New York Jets","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"1.80"},{"name":"New York Jets","price":"2.05"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Minnesota Vikings', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":2.05},{"name":"Washington Commanders","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.87},{"name":"Washington Commanders","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.95},{"name":"Washington Commanders","price":1.87}]}]}]', [{"name":"Minnesota Vikings","price":"2.05"},{"name":"Washington Commanders","price":"1.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T18:00:00Z', 'Tampa Bay Buccaneers', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":4.3},{"name":"Tampa Bay Buccaneers","price":1.24}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.89},{"name":"Tampa Bay Buccaneers","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]}]}]', [{"name":"New Orleans Saints","price":"4.30"},{"name":"Tampa Bay Buccaneers","price":"1.24"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T21:05:00Z', 'Las Vegas Raiders', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.56},{"name":"Las Vegas Raiders","price":2.5}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.56"},{"name":"Las Vegas Raiders","price":"2.50"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T21:25:00Z', 'Arizona Cardinals', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2},{"name":"Los Angeles Rams","price":1.83}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.87},{"name":"Los Angeles Rams","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.95},{"name":"Los Angeles Rams","price":1.87}]}]}]', [{"name":"Arizona Cardinals","price":"2.00"},{"name":"Los Angeles Rams","price":"1.83"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-07T21:25:00Z', 'Buffalo Bills', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.42},{"name":"Cincinnati Bengals","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.42"},{"name":"Cincinnati Bengals","price":"2.95"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-08T01:20:00Z', 'Kansas City Chiefs', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":3.3},{"name":"Kansas City Chiefs","price":1.35}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]}]', [{"name":"Houston Texans","price":"3.30"},{"name":"Kansas City Chiefs","price":"1.35"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-09T01:15:00Z', 'Los Angeles Chargers', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Chargers","price":2.14},{"name":"Philadelphia Eagles","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Los Angeles Chargers","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]}]}]', [{"name":"Los Angeles Chargers","price":"2.14"},{"name":"Philadelphia Eagles","price":"1.74"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-12T01:15:00Z', 'Tampa Bay Buccaneers', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":3},{"name":"Tampa Bay Buccaneers","price":1.41}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.93},{"name":"Tampa Bay Buccaneers","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"3.00"},{"name":"Tampa Bay Buccaneers","price":"1.41"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'Houston Texans', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.14},{"name":"Houston Texans","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.87},{"name":"Houston Texans","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"2.14"},{"name":"Houston Texans","price":"1.74"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'Cincinnati Bengals', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.74},{"name":"Cincinnati Bengals","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.74"},{"name":"Cincinnati Bengals","price":"2.14"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'New England Patriots', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.46},{"name":"New England Patriots","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.46"},{"name":"New England Patriots","price":"2.80"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'Chicago Bears', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":1.32},{"name":"Cleveland Browns","price":3.5}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"1.32"},{"name":"Cleveland Browns","price":"3.50"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'Jacksonville Jaguars', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":1.49},{"name":"New York Jets","price":2.7}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Jacksonville Jaguars","price":"1.49"},{"name":"New York Jets","price":"2.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'Kansas City Chiefs', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.49},{"name":"Los Angeles Chargers","price":2.7}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]}]}]', [{"name":"Kansas City Chiefs","price":"1.49"},{"name":"Los Angeles Chargers","price":"2.70"}],
  '2025-08-01T04:59:50.962Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'Philadelphia Eagles', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":5},{"name":"Philadelphia Eagles","price":1.19}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]}]}]', [{"name":"Las Vegas Raiders","price":"5.00"},{"name":"Philadelphia Eagles","price":"1.19"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T18:00:00Z', 'New York Giants', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Giants","price":2.7},{"name":"Washington Commanders","price":1.49}]},{"key":"spreads","outcomes":[{"name":"New York Giants","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New York Giants","price":"2.70"},{"name":"Washington Commanders","price":"1.49"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T21:25:00Z', 'New Orleans Saints', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":1.82},{"name":"New Orleans Saints","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.93},{"name":"New Orleans Saints","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.87},{"name":"New Orleans Saints","price":1.95}]}]}]', [{"name":"Carolina Panthers","price":"1.82"},{"name":"New Orleans Saints","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T21:25:00Z', 'Denver Broncos', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.82},{"name":"Green Bay Packers","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.82"},{"name":"Green Bay Packers","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T21:25:00Z', 'Los Angeles Rams', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.82},{"name":"Los Angeles Rams","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.95},{"name":"Los Angeles Rams","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.82"},{"name":"Los Angeles Rams","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T21:25:00Z', 'Seattle Seahawks', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2.54},{"name":"Seattle Seahawks","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.91},{"name":"Seattle Seahawks","price":1.91}]}]}]', [{"name":"Indianapolis Colts","price":"2.54"},{"name":"Seattle Seahawks","price":"1.54"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-14T21:25:00Z', 'San Francisco 49ers', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.28},{"name":"Tennessee Titans","price":3.85}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Tennessee Titans","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Tennessee Titans","price":1.91}]}]}]', [{"name":"San Francisco 49ers","price":"1.28"},{"name":"Tennessee Titans","price":"3.85"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-15T01:20:00Z', 'Dallas Cowboys', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.02},{"name":"Minnesota Vikings","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.87},{"name":"Minnesota Vikings","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"2.02"},{"name":"Minnesota Vikings","price":"1.82"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-16T01:15:00Z', 'Pittsburgh Steelers', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":2.4},{"name":"Pittsburgh Steelers","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"2.40"},{"name":"Pittsburgh Steelers","price":"1.60"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-19T01:15:00Z', 'Seattle Seahawks', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Los Angeles Rams","price":1.82},{"name":"Seattle Seahawks","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Los Angeles Rams","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Los Angeles Rams","price":"1.82"},{"name":"Seattle Seahawks","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-20T18:00:00Z', 'Chicago Bears', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.05},{"name":"Green Bay Packers","price":1.8}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2},{"name":"Green Bay Packers","price":1.79}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.02"},{"name":"Green Bay Packers","price":"1.79"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-20T20:00:00Z', 'Washington Commanders', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Eagles","price":1.82},{"name":"Washington Commanders","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Eagles","price":1.79},{"name":"Washington Commanders","price":2}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.87},{"name":"Washington Commanders","price":1.95}]}]}]', [{"name":"Philadelphia Eagles","price":"1.81"},{"name":"Washington Commanders","price":"2.01"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'Baltimore Ravens', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.24},{"name":"New England Patriots","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"New England Patriots","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":2},{"name":"New England Patriots","price":1.83}]}]}]', [{"name":"Baltimore Ravens","price":"1.24"},{"name":"New England Patriots","price":"4.20"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'Cleveland Browns', 'Buffalo Bills', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.24},{"name":"Cleveland Browns","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Cleveland Browns","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.24"},{"name":"Cleveland Browns","price":"4.20"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'Carolina Panthers', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.54},{"name":"Tampa Bay Buccaneers","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]}]}]', [{"name":"Carolina Panthers","price":"2.54"},{"name":"Tampa Bay Buccaneers","price":"1.54"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'Dallas Cowboys', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.02},{"name":"Los Angeles Chargers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"2.02"},{"name":"Los Angeles Chargers","price":"1.82"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'Tennessee Titans', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.32},{"name":"Tennessee Titans","price":3.5}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.83},{"name":"Tennessee Titans","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.83},{"name":"Tennessee Titans","price":2}]}]}]', [{"name":"Kansas City Chiefs","price":"1.32"},{"name":"Tennessee Titans","price":"3.50"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'New York Giants', 'Minnesota Vikings', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Minnesota Vikings","price":1.74},{"name":"New York Giants","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Minnesota Vikings","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Minnesota Vikings","price":"1.74"},{"name":"New York Giants","price":"2.14"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T18:00:00Z', 'New Orleans Saints', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":1.8},{"name":"New York Jets","price":2.05}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New Orleans Saints","price":"1.80"},{"name":"New York Jets","price":"2.05"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T21:05:00Z', 'Arizona Cardinals', 'Atlanta Falcons', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":1.54},{"name":"Atlanta Falcons","price":2.54}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Atlanta Falcons","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"1.54"},{"name":"Atlanta Falcons","price":"2.54"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T21:05:00Z', 'Denver Broncos', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.42},{"name":"Jacksonville Jaguars","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Jacksonville Jaguars","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.42"},{"name":"Jacksonville Jaguars","price":"2.95"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T21:25:00Z', 'Detroit Lions', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.39},{"name":"Pittsburgh Steelers","price":3.1}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.39"},{"name":"Pittsburgh Steelers","price":"3.10"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-21T21:25:00Z', 'Houston Texans', 'Las Vegas Raiders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.46},{"name":"Las Vegas Raiders","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Houston Texans","price":"1.46"},{"name":"Las Vegas Raiders","price":"2.80"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-22T01:20:00Z', 'Miami Dolphins', 'Cincinnati Bengals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.82},{"name":"Miami Dolphins","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Miami Dolphins","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Cincinnati Bengals","price":"1.82"},{"name":"Miami Dolphins","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-23T01:15:00Z', 'Indianapolis Colts', 'San Francisco 49ers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":2.4},{"name":"San Francisco 49ers","price":1.6}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.95},{"name":"San Francisco 49ers","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.95},{"name":"San Francisco 49ers","price":1.87}]}]}]', [{"name":"Indianapolis Colts","price":"2.40"},{"name":"San Francisco 49ers","price":"1.60"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-25T18:00:00Z', 'Washington Commanders', 'Dallas Cowboys', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.66},{"name":"Washington Commanders","price":1.51}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.95},{"name":"Washington Commanders","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.7},{"name":"Washington Commanders","price":1.45}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":2.95},{"name":"Washington Commanders","price":1.42}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"Washington Commanders","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]}]', [{"name":"Dallas Cowboys","price":"2.77"},{"name":"Washington Commanders","price":"1.46"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-25T21:30:00Z', 'Minnesota Vikings', 'Detroit Lions', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.75},{"name":"Minnesota Vikings","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.69},{"name":"Minnesota Vikings","price":2.13}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Detroit Lions","price":1.7},{"name":"Minnesota Vikings","price":2.2}]},{"key":"spreads","outcomes":[{"name":"Detroit Lions","price":1.91},{"name":"Minnesota Vikings","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Detroit Lions","price":"1.71"},{"name":"Minnesota Vikings","price":"2.16"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-26T01:15:00Z', 'Kansas City Chiefs', 'Denver Broncos', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":2.7},{"name":"Kansas City Chiefs","price":1.49}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":2.63},{"name":"Kansas City Chiefs","price":1.47}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Kansas City Chiefs","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"2.67"},{"name":"Kansas City Chiefs","price":"1.48"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Cincinnati Bengals', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.54},{"name":"Cincinnati Bengals","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Cincinnati Bengals","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"2.54"},{"name":"Cincinnati Bengals","price":"1.54"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Green Bay Packers', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.8},{"name":"Green Bay Packers","price":2.05}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Green Bay Packers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.87},{"name":"Green Bay Packers","price":1.95}]}]}]', [{"name":"Baltimore Ravens","price":"1.80"},{"name":"Green Bay Packers","price":"2.05"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Carolina Panthers', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":2.02},{"name":"Seattle Seahawks","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.95},{"name":"Seattle Seahawks","price":1.87}]}]}]', [{"name":"Carolina Panthers","price":"2.02"},{"name":"Seattle Seahawks","price":"1.82"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Cleveland Browns', 'Pittsburgh Steelers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cleveland Browns","price":2.14},{"name":"Pittsburgh Steelers","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cleveland Browns","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]}]}]', [{"name":"Cleveland Browns","price":"2.14"},{"name":"Pittsburgh Steelers","price":"1.74"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Los Angeles Chargers', 'Houston Texans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":2.54},{"name":"Los Angeles Chargers","price":1.54}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Houston Texans","price":"2.54"},{"name":"Los Angeles Chargers","price":"1.54"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Indianapolis Colts', 'Jacksonville Jaguars', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Indianapolis Colts","price":1.82},{"name":"Jacksonville Jaguars","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.93},{"name":"Jacksonville Jaguars","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Indianapolis Colts","price":1.87},{"name":"Jacksonville Jaguars","price":1.95}]}]}]', [{"name":"Indianapolis Colts","price":"1.82"},{"name":"Jacksonville Jaguars","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Miami Dolphins', 'Tampa Bay Buccaneers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":2.02},{"name":"Tampa Bay Buccaneers","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"Tampa Bay Buccaneers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"2.02"},{"name":"Tampa Bay Buccaneers","price":"1.82"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'New York Jets', 'New England Patriots', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New England Patriots","price":1.82},{"name":"New York Jets","price":2.02}]},{"key":"spreads","outcomes":[{"name":"New England Patriots","price":1.91},{"name":"New York Jets","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"New England Patriots","price":"1.82"},{"name":"New York Jets","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T18:00:00Z', 'Tennessee Titans', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New Orleans Saints","price":2.45},{"name":"Tennessee Titans","price":1.57}]},{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.87},{"name":"Tennessee Titans","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"New Orleans Saints","price":1.87},{"name":"Tennessee Titans","price":1.95}]}]}]', [{"name":"New Orleans Saints","price":"2.45"},{"name":"Tennessee Titans","price":"1.57"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T21:25:00Z', 'Buffalo Bills', 'Philadelphia Eagles', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.82},{"name":"Philadelphia Eagles","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"Philadelphia Eagles","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.82"},{"name":"Philadelphia Eagles","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-28T21:25:00Z', 'Las Vegas Raiders', 'New York Giants', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Las Vegas Raiders","price":1.74},{"name":"New York Giants","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Las Vegas Raiders","price":1.91},{"name":"New York Giants","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Las Vegas Raiders","price":"1.74"},{"name":"New York Giants","price":"2.14"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-29T01:20:00Z', 'San Francisco 49ers', 'Chicago Bears', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.6},{"name":"San Francisco 49ers","price":1.52}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"San Francisco 49ers","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.60"},{"name":"San Francisco 49ers","price":"1.52"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2025-12-30T01:20:00Z', 'Atlanta Falcons', 'Los Angeles Rams', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":2.36},{"name":"Los Angeles Rams","price":1.62}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"Atlanta Falcons","price":"2.36"},{"name":"Los Angeles Rams","price":"1.62"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Los Angeles Rams', 'Arizona Cardinals', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Arizona Cardinals","price":2.8},{"name":"Los Angeles Rams","price":1.46}]},{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Los Angeles Rams","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Arizona Cardinals","price":1.91},{"name":"Los Angeles Rams","price":1.91}]}]}]', [{"name":"Arizona Cardinals","price":"2.80"},{"name":"Los Angeles Rams","price":"1.46"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Atlanta Falcons', 'New Orleans Saints', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta Falcons","price":1.43},{"name":"New Orleans Saints","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Atlanta Falcons","price":1.95},{"name":"New Orleans Saints","price":1.87}]}]}]', [{"name":"Atlanta Falcons","price":"1.43"},{"name":"New Orleans Saints","price":"2.90"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Pittsburgh Steelers', 'Baltimore Ravens', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Baltimore Ravens","price":1.46},{"name":"Pittsburgh Steelers","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Baltimore Ravens","price":1.91},{"name":"Pittsburgh Steelers","price":1.91}]}]}]', [{"name":"Baltimore Ravens","price":"1.46"},{"name":"Pittsburgh Steelers","price":"2.80"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Buffalo Bills', 'New York Jets', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Buffalo Bills","price":1.24},{"name":"New York Jets","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Buffalo Bills","price":1.91},{"name":"New York Jets","price":1.91}]}]}]', [{"name":"Buffalo Bills","price":"1.24"},{"name":"New York Jets","price":"4.20"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Tampa Bay Buccaneers', 'Carolina Panthers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Carolina Panthers","price":3.4},{"name":"Tampa Bay Buccaneers","price":1.34}]},{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Carolina Panthers","price":1.87},{"name":"Tampa Bay Buccaneers","price":1.95}]}]}]', [{"name":"Carolina Panthers","price":"3.40"},{"name":"Tampa Bay Buccaneers","price":"1.34"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Chicago Bears', 'Detroit Lions', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Bears","price":2.02},{"name":"Detroit Lions","price":1.82}]},{"key":"spreads","outcomes":[{"name":"Chicago Bears","price":1.91},{"name":"Detroit Lions","price":1.91}]}]}]', [{"name":"Chicago Bears","price":"2.02"},{"name":"Detroit Lions","price":"1.82"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Cincinnati Bengals', 'Cleveland Browns', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cincinnati Bengals","price":1.25},{"name":"Cleveland Browns","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":1.91},{"name":"Cleveland Browns","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Cincinnati Bengals","price":2},{"name":"Cleveland Browns","price":1.83}]}]}]', [{"name":"Cincinnati Bengals","price":"1.25"},{"name":"Cleveland Browns","price":"4.10"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'New York Giants', 'Dallas Cowboys', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dallas Cowboys","price":1.82},{"name":"New York Giants","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Dallas Cowboys","price":1.91},{"name":"New York Giants","price":1.91}]}]}]', [{"name":"Dallas Cowboys","price":"1.82"},{"name":"New York Giants","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Minnesota Vikings', 'Green Bay Packers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Green Bay Packers","price":1.82},{"name":"Minnesota Vikings","price":2.02}]},{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.95},{"name":"Minnesota Vikings","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Green Bay Packers","price":1.87},{"name":"Minnesota Vikings","price":1.95}]}]}]', [{"name":"Green Bay Packers","price":"1.82"},{"name":"Minnesota Vikings","price":"2.02"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Houston Texans', 'Indianapolis Colts', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Houston Texans","price":1.46},{"name":"Indianapolis Colts","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Houston Texans","price":1.91},{"name":"Indianapolis Colts","price":1.91}]}]}]', [{"name":"Houston Texans","price":"1.46"},{"name":"Indianapolis Colts","price":"2.80"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Jacksonville Jaguars', 'Tennessee Titans', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Jacksonville Jaguars","price":1.46},{"name":"Tennessee Titans","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"Tennessee Titans","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Jacksonville Jaguars","price":1.91},{"name":"Tennessee Titans","price":1.91}]}]}]', [{"name":"Jacksonville Jaguars","price":"1.46"},{"name":"Tennessee Titans","price":"2.80"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Las Vegas Raiders', 'Kansas City Chiefs', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kansas City Chiefs","price":1.4},{"name":"Las Vegas Raiders","price":3.05}]},{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Kansas City Chiefs","price":1.91},{"name":"Las Vegas Raiders","price":1.91}]}]}]', [{"name":"Kansas City Chiefs","price":"1.40"},{"name":"Las Vegas Raiders","price":"3.05"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'New England Patriots', 'Miami Dolphins', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Miami Dolphins","price":2.14},{"name":"New England Patriots","price":1.74}]},{"key":"spreads","outcomes":[{"name":"Miami Dolphins","price":1.91},{"name":"New England Patriots","price":1.91}]}]}]', [{"name":"Miami Dolphins","price":"2.14"},{"name":"New England Patriots","price":"1.74"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'Philadelphia Eagles', 'Washington Commanders', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Eagles","price":1.46},{"name":"Washington Commanders","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.91},{"name":"Washington Commanders","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"Philadelphia Eagles","price":1.91},{"name":"Washington Commanders","price":1.91}]}]}]', [{"name":"Philadelphia Eagles","price":"1.46"},{"name":"Washington Commanders","price":"2.80"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T18:00:00Z', 'San Francisco 49ers', 'Seattle Seahawks', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Francisco 49ers","price":1.49},{"name":"Seattle Seahawks","price":2.7}]},{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"spreads","outcomes":[{"name":"San Francisco 49ers","price":1.91},{"name":"Seattle Seahawks","price":1.91}]}]}]', [{"name":"San Francisco 49ers","price":"1.49"},{"name":"Seattle Seahawks","price":"2.70"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'american_football', 'NFL', 'americanfootball_nfl', 'NFL',
  '2026-01-04T21:05:00Z', 'Denver Broncos', 'Los Angeles Chargers', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Denver Broncos","price":1.74},{"name":"Los Angeles Chargers","price":2.14}]},{"key":"spreads","outcomes":[{"name":"Denver Broncos","price":1.91},{"name":"Los Angeles Chargers","price":1.91}]}]}]', [{"name":"Denver Broncos","price":"1.74"},{"name":"Los Angeles Chargers","price":"2.14"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-07T00:30:00Z', 'Houston Dynamo', 'LA Galaxy', '[]', NULL,
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-09T23:30:00Z', 'CF Montreal', 'Atlanta United FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":3.1},{"name":"CF Montreal","price":2.15},{"name":"Draw","price":3.5}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":3},{"name":"CF Montreal","price":2.25},{"name":"Draw","price":3.42}]},{"key":"spreads","outcomes":[{"name":"Atlanta United FC","price":1.61},{"name":"CF Montreal","price":2.18}]},{"key":"totals","outcomes":[{"name":"Over","price":1.61},{"name":"Under","price":2.18}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":3.15},{"name":"CF Montreal","price":2.25},{"name":"Draw","price":3.5}]},{"key":"spreads","outcomes":[{"name":"Atlanta United FC","price":1.87},{"name":"CF Montreal","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":3},{"name":"CF Montreal","price":2.2},{"name":"Draw","price":3.6}]},{"key":"totals","outcomes":[{"name":"Over","price":1.65},{"name":"Under","price":2.24}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":2.95},{"name":"CF Montreal","price":2.33},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.61},{"name":"Under","price":2.17}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":3.12},{"name":"CF Montreal","price":2.15},{"name":"Draw","price":3.63}]},{"key":"spreads","outcomes":[{"name":"Atlanta United FC","price":1.95},{"name":"CF Montreal","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":3.12},{"name":"CF Montreal","price":2.15},{"name":"Draw","price":3.63}]},{"key":"spreads","outcomes":[{"name":"Atlanta United FC","price":1.95},{"name":"CF Montreal","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlanta United FC","price":2.9},{"name":"CF Montreal","price":2.15},{"name":"Draw","price":3.35}]}]}]', [{"name":"Atlanta United FC","price":"3.04"},{"name":"CF Montreal","price":"2.20"},{"name":"Draw","price":"3.48"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-09T23:30:00Z', 'New York City FC', 'Columbus Crew SC', '[{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.65},{"name":"New York City FC","price":2.47},{"name":"Draw","price":3.48}]},{"key":"spreads","outcomes":[{"name":"Columbus Crew SC","price":1.52},{"name":"New York City FC","price":2.38}]},{"key":"totals","outcomes":[{"name":"Over","price":1.6},{"name":"Under","price":2.2}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.65},{"name":"New York City FC","price":2.5},{"name":"Draw","price":3.5}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.7},{"name":"New York City FC","price":2.5},{"name":"Draw","price":3.6}]},{"key":"spreads","outcomes":[{"name":"Columbus Crew SC","price":1.98},{"name":"New York City FC","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.7},{"name":"New York City FC","price":2.55},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.62},{"name":"Under","price":2.3}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.7},{"name":"New York City FC","price":2.5},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.65},{"name":"Under","price":2.12}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.61},{"name":"New York City FC","price":2.49},{"name":"Draw","price":3.64}]},{"key":"spreads","outcomes":[{"name":"Columbus Crew SC","price":1.96},{"name":"New York City FC","price":1.86}]},{"key":"totals","outcomes":[{"name":"Over","price":2.01},{"name":"Under","price":1.83}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.61},{"name":"New York City FC","price":2.49},{"name":"Draw","price":3.64}]},{"key":"spreads","outcomes":[{"name":"Columbus Crew SC","price":1.96},{"name":"New York City FC","price":1.86}]},{"key":"totals","outcomes":[{"name":"Over","price":2.01},{"name":"Under","price":1.83}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Columbus Crew SC","price":2.55},{"name":"New York City FC","price":2.4},{"name":"Draw","price":3.45}]}]}]', [{"name":"Columbus Crew SC","price":"2.65"},{"name":"New York City FC","price":"2.49"},{"name":"Draw","price":"3.48"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-09T23:30:00Z', 'New England Revolution', 'D.C. United', '[{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.4},{"name":"New England Revolution","price":1.72},{"name":"Draw","price":3.85}]},{"key":"spreads","outcomes":[{"name":"D.C. United","price":2.04},{"name":"New England Revolution","price":1.69}]},{"key":"totals","outcomes":[{"name":"Over","price":1.64},{"name":"Under","price":2.12}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.5},{"name":"New England Revolution","price":1.69},{"name":"Draw","price":3.9}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.4},{"name":"New England Revolution","price":1.74},{"name":"Draw","price":4}]},{"key":"spreads","outcomes":[{"name":"D.C. United","price":1.89},{"name":"New England Revolution","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4},{"name":"New England Revolution","price":1.73},{"name":"Draw","price":3.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.67},{"name":"Under","price":2.19}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.7},{"name":"New England Revolution","price":1.71},{"name":"Draw","price":3.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.68},{"name":"Under","price":2.06}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.53},{"name":"New England Revolution","price":1.7},{"name":"Draw","price":3.97}]},{"key":"spreads","outcomes":[{"name":"D.C. United","price":1.92},{"name":"New England Revolution","price":1.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.53},{"name":"New England Revolution","price":1.7},{"name":"Draw","price":3.97}]},{"key":"spreads","outcomes":[{"name":"D.C. United","price":1.92},{"name":"New England Revolution","price":1.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"D.C. United","price":4.1},{"name":"New England Revolution","price":1.67},{"name":"Draw","price":3.7}]}]}]', [{"name":"D.C. United","price":"4.40"},{"name":"New England Revolution","price":"1.71"},{"name":"Draw","price":"3.84"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-09T23:30:00Z', 'Philadelphia Union', 'Toronto FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.42},{"name":"Toronto FC","price":6.5},{"name":"Draw","price":4.5}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.46},{"name":"Toronto FC","price":6.2},{"name":"Draw","price":4.4}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Union","price":2.19},{"name":"Toronto FC","price":1.6}]},{"key":"totals","outcomes":[{"name":"Over","price":1.63},{"name":"Under","price":2.15}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.48},{"name":"Toronto FC","price":6.25},{"name":"Draw","price":4.7}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Union","price":2.02},{"name":"Toronto FC","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.44},{"name":"Toronto FC","price":7},{"name":"Draw","price":4.33}]},{"key":"totals","outcomes":[{"name":"Over","price":2.15},{"name":"Under","price":1.69}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.5},{"name":"Toronto FC","price":5.5},{"name":"Draw","price":4.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.66},{"name":"Under","price":2.1}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.45},{"name":"Toronto FC","price":6.65},{"name":"Draw","price":4.5}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Union","price":2.02},{"name":"Toronto FC","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.97}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.45},{"name":"Toronto FC","price":6.65},{"name":"Draw","price":4.5}]},{"key":"spreads","outcomes":[{"name":"Philadelphia Union","price":2.02},{"name":"Toronto FC","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.97}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Philadelphia Union","price":1.42},{"name":"Toronto FC","price":6},{"name":"Draw","price":4.3}]}]}]', [{"name":"Philadelphia Union","price":"1.45"},{"name":"Toronto FC","price":"6.34"},{"name":"Draw","price":"4.42"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T00:30:00Z', 'Austin FC', 'Houston Dynamo', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.1},{"name":"Houston Dynamo","price":3.6},{"name":"Draw","price":3.3}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.09},{"name":"Houston Dynamo","price":3.55},{"name":"Draw","price":3.24}]},{"key":"spreads","outcomes":[{"name":"Austin FC","price":2.03},{"name":"Houston Dynamo","price":1.7}]},{"key":"totals","outcomes":[{"name":"Over","price":2.09},{"name":"Under","price":1.66}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.1},{"name":"Houston Dynamo","price":3.6},{"name":"Draw","price":3.35}]},{"key":"spreads","outcomes":[{"name":"Austin FC","price":1.82},{"name":"Houston Dynamo","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.15},{"name":"Houston Dynamo","price":3.5},{"name":"Draw","price":3.2}]},{"key":"spreads","outcomes":[{"name":"Austin FC","price":2.13},{"name":"Houston Dynamo","price":1.7}]},{"key":"totals","outcomes":[{"name":"Over","price":2.13},{"name":"Under","price":1.7}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.1},{"name":"Houston Dynamo","price":3.45},{"name":"Draw","price":3.15}]},{"key":"totals","outcomes":[{"name":"Over","price":2.12},{"name":"Under","price":1.65}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.11},{"name":"Houston Dynamo","price":3.54},{"name":"Draw","price":3.29}]},{"key":"spreads","outcomes":[{"name":"Austin FC","price":1.83},{"name":"Houston Dynamo","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.11},{"name":"Houston Dynamo","price":3.54},{"name":"Draw","price":3.29}]},{"key":"spreads","outcomes":[{"name":"Austin FC","price":1.83},{"name":"Houston Dynamo","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Austin FC","price":2.05},{"name":"Houston Dynamo","price":3.35},{"name":"Draw","price":3.15}]}]}]', [{"name":"Austin FC","price":"2.10"},{"name":"Houston Dynamo","price":"3.52"},{"name":"Draw","price":"3.25"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T00:30:00Z', 'Chicago Fire', 'Los Angeles FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.6},{"name":"Los Angeles FC","price":2.6},{"name":"Draw","price":3.4}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.56},{"name":"Los Angeles FC","price":2.67},{"name":"Draw","price":3.28}]},{"key":"spreads","outcomes":[{"name":"Chicago Fire","price":2.45},{"name":"Los Angeles FC","price":1.49}]},{"key":"totals","outcomes":[{"name":"Over","price":1.62},{"name":"Under","price":2.16}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.6},{"name":"Los Angeles FC","price":2.7},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Chicago Fire","price":1.87},{"name":"Los Angeles FC","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.62},{"name":"Los Angeles FC","price":2.7},{"name":"Draw","price":3.3}]},{"key":"spreads","outcomes":[{"name":"Chicago Fire","price":1.87},{"name":"Los Angeles FC","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.69},{"name":"Under","price":2.15}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.5},{"name":"Los Angeles FC","price":2.6},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.54},{"name":"Under","price":2.32}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.58},{"name":"Los Angeles FC","price":2.68},{"name":"Draw","price":3.35}]},{"key":"spreads","outcomes":[{"name":"Chicago Fire","price":1.87},{"name":"Los Angeles FC","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.94}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.58},{"name":"Los Angeles FC","price":2.68},{"name":"Draw","price":3.35}]},{"key":"spreads","outcomes":[{"name":"Chicago Fire","price":1.87},{"name":"Los Angeles FC","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.94}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chicago Fire","price":2.5},{"name":"Los Angeles FC","price":2.6},{"name":"Draw","price":3.15}]}]}]', [{"name":"Chicago Fire","price":"2.57"},{"name":"Los Angeles FC","price":"2.65"},{"name":"Draw","price":"3.32"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T00:30:00Z', 'FC Dallas', 'Portland Timbers', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.1},{"name":"Portland Timbers","price":3.3},{"name":"Draw","price":3.5}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.12},{"name":"Portland Timbers","price":3.18},{"name":"Draw","price":3.55}]},{"key":"spreads","outcomes":[{"name":"FC Dallas","price":2.07},{"name":"Portland Timbers","price":1.68}]},{"key":"totals","outcomes":[{"name":"Over","price":1.66},{"name":"Under","price":2.09}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.15},{"name":"Portland Timbers","price":3.2},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"FC Dallas","price":1.87},{"name":"Portland Timbers","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.17},{"name":"Portland Timbers","price":3.26},{"name":"Draw","price":3.48}]},{"key":"totals","outcomes":[{"name":"Over","price":1.67},{"name":"Under","price":2.2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.14},{"name":"Portland Timbers","price":3.25},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.76},{"name":"Under","price":1.94}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.13},{"name":"Portland Timbers","price":3.15},{"name":"Draw","price":3.64}]},{"key":"spreads","outcomes":[{"name":"FC Dallas","price":1.85},{"name":"Portland Timbers","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.13},{"name":"Portland Timbers","price":3.15},{"name":"Draw","price":3.64}]},{"key":"spreads","outcomes":[{"name":"FC Dallas","price":1.85},{"name":"Portland Timbers","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"FC Dallas","price":2.05},{"name":"Portland Timbers","price":3},{"name":"Draw","price":3.4}]}]}]', [{"name":"FC Dallas","price":"2.12"},{"name":"Portland Timbers","price":"3.19"},{"name":"Draw","price":"3.52"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T00:30:00Z', 'St. Louis City SC', 'Nashville SC', '[{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":2},{"name":"St. Louis City SC","price":3.34},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Nashville SC","price":1.96},{"name":"St. Louis City SC","price":1.76}]},{"key":"totals","outcomes":[{"name":"Over","price":1.64},{"name":"Under","price":2.12}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":3.4},{"name":"Draw","price":3.6}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":3.4},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":2},{"name":"St. Louis City SC","price":3.2},{"name":"Draw","price":3.6}]},{"key":"totals","outcomes":[{"name":"Over","price":2.17},{"name":"Under","price":1.68}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":1.97},{"name":"St. Louis City SC","price":3.6},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.68},{"name":"Under","price":2.06}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":3.16},{"name":"Draw","price":3.91}]},{"key":"spreads","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.84},{"name":"Under","price":1.99}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":3.16},{"name":"Draw","price":3.91}]},{"key":"spreads","outcomes":[{"name":"Nashville SC","price":2.05},{"name":"St. Louis City SC","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.84},{"name":"Under","price":1.99}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Nashville SC","price":1.95},{"name":"St. Louis City SC","price":3.15},{"name":"Draw","price":3.6}]}]}]', [{"name":"Nashville SC","price":"2.02"},{"name":"St. Louis City SC","price":"3.30"},{"name":"Draw","price":"3.68"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T00:45:00Z', 'Sporting Kansas City', 'San Diego FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.83},{"name":"Sporting Kansas City","price":3.5},{"name":"Draw","price":3.9}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.92},{"name":"Sporting Kansas City","price":3.5},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"San Diego FC","price":1.88},{"name":"Sporting Kansas City","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":2.2},{"name":"Under","price":1.6}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.95},{"name":"Sporting Kansas City","price":3.55},{"name":"Draw","price":3.95}]},{"key":"spreads","outcomes":[{"name":"San Diego FC","price":1.95},{"name":"Sporting Kansas City","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.92},{"name":"Sporting Kansas City","price":3.6},{"name":"Draw","price":3.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.75},{"name":"Under","price":2.03}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.97},{"name":"Sporting Kansas City","price":3.4},{"name":"Draw","price":3.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.56},{"name":"Under","price":2.25}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.94},{"name":"Sporting Kansas City","price":3.41},{"name":"Draw","price":3.95}]},{"key":"spreads","outcomes":[{"name":"San Diego FC","price":1.94},{"name":"Sporting Kansas City","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":2.03},{"name":"Under","price":1.81}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.94},{"name":"Sporting Kansas City","price":3.41},{"name":"Draw","price":3.95}]},{"key":"spreads","outcomes":[{"name":"San Diego FC","price":1.94},{"name":"Sporting Kansas City","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":2.03},{"name":"Under","price":1.81}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Diego FC","price":1.87},{"name":"Sporting Kansas City","price":3.25},{"name":"Draw","price":3.75}]}]}]', [{"name":"San Diego FC","price":"1.92"},{"name":"Sporting Kansas City","price":"3.45"},{"name":"Draw","price":"3.84"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T02:30:00Z', 'San Jose Earthquakes', 'Vancouver Whitecaps FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.4},{"name":"Vancouver Whitecaps FC","price":2.75},{"name":"Draw","price":3.5}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.39},{"name":"Vancouver Whitecaps FC","price":2.71},{"name":"Draw","price":3.55}]},{"key":"spreads","outcomes":[{"name":"San Jose Earthquakes","price":2.31},{"name":"Vancouver Whitecaps FC","price":1.54}]},{"key":"totals","outcomes":[{"name":"Over","price":1.57},{"name":"Under","price":2.26}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.4},{"name":"Vancouver Whitecaps FC","price":2.75},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"San Jose Earthquakes","price":1.8},{"name":"Vancouver Whitecaps FC","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.46},{"name":"Vancouver Whitecaps FC","price":2.8},{"name":"Draw","price":3.6}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.8}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.35},{"name":"Vancouver Whitecaps FC","price":2.7},{"name":"Draw","price":3.55}]},{"key":"totals","outcomes":[{"name":"Over","price":2.25},{"name":"Under","price":1.56}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.43},{"name":"Vancouver Whitecaps FC","price":2.75},{"name":"Draw","price":3.52}]},{"key":"spreads","outcomes":[{"name":"San Jose Earthquakes","price":1.8},{"name":"Vancouver Whitecaps FC","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.43},{"name":"Vancouver Whitecaps FC","price":2.75},{"name":"Draw","price":3.52}]},{"key":"spreads","outcomes":[{"name":"San Jose Earthquakes","price":1.8},{"name":"Vancouver Whitecaps FC","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Jose Earthquakes","price":2.35},{"name":"Vancouver Whitecaps FC","price":2.65},{"name":"Draw","price":3.35}]}]}]', [{"name":"San Jose Earthquakes","price":"2.40"},{"name":"Vancouver Whitecaps FC","price":"2.73"},{"name":"Draw","price":"3.53"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T22:00:00Z', 'FC Cincinnati', 'Charlotte FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Charlotte FC","price":4.3},{"name":"FC Cincinnati","price":1.71},{"name":"Draw","price":3.8}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Charlotte FC","price":4.4},{"name":"FC Cincinnati","price":1.74},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Charlotte FC","price":2.02},{"name":"FC Cincinnati","price":1.71}]},{"key":"totals","outcomes":[{"name":"Over","price":1.61},{"name":"Under","price":2.18}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Charlotte FC","price":4.5},{"name":"FC Cincinnati","price":1.77},{"name":"Draw","price":3.85}]},{"key":"spreads","outcomes":[{"name":"Charlotte FC","price":1.87},{"name":"FC Cincinnati","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Charlotte FC","price":4.4},{"name":"FC Cincinnati","price":1.76},{"name":"Draw","price":3.85}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.74}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Charlotte FC","price":4.5},{"name":"FC Cincinnati","price":1.76},{"name":"Draw","price":3.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.61},{"name":"Under","price":2.17}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Charlotte FC","price":4},{"name":"FC Cincinnati","price":1.71},{"name":"Draw","price":3.75}]}]}]', [{"name":"Charlotte FC","price":"4.35"},{"name":"FC Cincinnati","price":"1.74"},{"name":"Draw","price":"3.72"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T22:00:00Z', 'Minnesota United FC', 'Colorado Rapids', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rapids","price":4.8},{"name":"Minnesota United FC","price":1.59},{"name":"Draw","price":4.3}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rapids","price":4.9},{"name":"Minnesota United FC","price":1.61},{"name":"Draw","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Colorado Rapids","price":2.23},{"name":"Minnesota United FC","price":1.59}]},{"key":"totals","outcomes":[{"name":"Over","price":2.14},{"name":"Under","price":1.63}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rapids","price":5},{"name":"Minnesota United FC","price":1.62},{"name":"Draw","price":4.3}]},{"key":"spreads","outcomes":[{"name":"Colorado Rapids","price":1.83},{"name":"Minnesota United FC","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rapids","price":4.75},{"name":"Minnesota United FC","price":1.57},{"name":"Draw","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Colorado Rapids","price":1.8},{"name":"Minnesota United FC","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":2.15},{"name":"Under","price":1.69}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rapids","price":4.7},{"name":"Minnesota United FC","price":1.67},{"name":"Draw","price":3.7}]},{"key":"totals","outcomes":[{"name":"Over","price":2.2},{"name":"Under","price":1.6}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Colorado Rapids","price":4.6},{"name":"Minnesota United FC","price":1.56},{"name":"Draw","price":4.1}]}]}]', [{"name":"Colorado Rapids","price":"4.79"},{"name":"Minnesota United FC","price":"1.60"},{"name":"Draw","price":"4.12"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-10T22:00:00Z', 'New York Red Bulls', 'Real Salt Lake', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"New York Red Bulls","price":1.95},{"name":"Real Salt Lake","price":3.7},{"name":"Draw","price":3.6}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"New York Red Bulls","price":1.89},{"name":"Real Salt Lake","price":3.75},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"New York Red Bulls","price":1.85},{"name":"Real Salt Lake","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.65},{"name":"Under","price":2.12}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"New York Red Bulls","price":1.91},{"name":"Real Salt Lake","price":3.8},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"New York Red Bulls","price":1.93},{"name":"Real Salt Lake","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"New York Red Bulls","price":1.91},{"name":"Real Salt Lake","price":3.8},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"New York Red Bulls","price":1.87},{"name":"Real Salt Lake","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.67},{"name":"Under","price":2.19}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"New York Red Bulls","price":1.89},{"name":"Real Salt Lake","price":3.75},{"name":"Draw","price":3.45}]},{"key":"totals","outcomes":[{"name":"Over","price":1.64},{"name":"Under","price":2.12}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"New York Red Bulls","price":1.83},{"name":"Real Salt Lake","price":3.55},{"name":"Draw","price":3.55}]}]}]', [{"name":"New York Red Bulls","price":"1.90"},{"name":"Real Salt Lake","price":"3.73"},{"name":"Draw","price":"3.63"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-11T00:00:00Z', 'Orlando City SC', 'Inter Miami CF', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.2},{"name":"Orlando City SC","price":2.05},{"name":"Draw","price":3.8}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.12},{"name":"Orlando City SC","price":2.09},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Inter Miami CF","price":1.7},{"name":"Orlando City SC","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":2.04},{"name":"Under","price":1.7}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.15},{"name":"Orlando City SC","price":2.1},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Inter Miami CF","price":1.98},{"name":"Orlando City SC","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.1},{"name":"Orlando City SC","price":2.1},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Inter Miami CF","price":1.74},{"name":"Orlando City SC","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":2.19},{"name":"Under","price":1.67}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3},{"name":"Orlando City SC","price":2.07},{"name":"Draw","price":3.8}]},{"key":"totals","outcomes":[{"name":"Over","price":2.12},{"name":"Under","price":1.64}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.18},{"name":"Orlando City SC","price":2.09},{"name":"Draw","price":3.75}]},{"key":"spreads","outcomes":[{"name":"Inter Miami CF","price":2},{"name":"Orlando City SC","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.86}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.18},{"name":"Orlando City SC","price":2.09},{"name":"Draw","price":3.75}]},{"key":"spreads","outcomes":[{"name":"Inter Miami CF","price":2},{"name":"Orlando City SC","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.86}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Inter Miami CF","price":3.05},{"name":"Orlando City SC","price":2},{"name":"Draw","price":3.55}]}]}]', [{"name":"Inter Miami CF","price":"3.12"},{"name":"Orlando City SC","price":"2.07"},{"name":"Draw","price":"3.69"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'MLS', 'soccer_usa_mls', 'MLS',
  '2025-08-11T02:00:00Z', 'LA Galaxy', 'Seattle Sounders FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"LA Galaxy","price":2.3},{"name":"Seattle Sounders FC","price":2.85},{"name":"Draw","price":3.5}]}]},{"key":"mybookieag","title":"MyBookie.ag","markets":[{"key":"h2h","outcomes":[{"name":"LA Galaxy","price":2.25},{"name":"Seattle Sounders FC","price":2.86},{"name":"Draw","price":3.6}]},{"key":"spreads","outcomes":[{"name":"LA Galaxy","price":2.19},{"name":"Seattle Sounders FC","price":1.61}]},{"key":"totals","outcomes":[{"name":"Over","price":1.57},{"name":"Under","price":2.26}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"LA Galaxy","price":2.3},{"name":"Seattle Sounders FC","price":2.9},{"name":"Draw","price":3.75}]},{"key":"spreads","outcomes":[{"name":"LA Galaxy","price":2},{"name":"Seattle Sounders FC","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"LA Galaxy","price":2.25},{"name":"Seattle Sounders FC","price":2.75},{"name":"Draw","price":3.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.81}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"LA Galaxy","price":2.28},{"name":"Seattle Sounders FC","price":3},{"name":"Draw","price":3.25}]},{"key":"totals","outcomes":[{"name":"Over","price":1.65},{"name":"Under","price":2.12}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"LA Galaxy","price":2.2},{"name":"Seattle Sounders FC","price":2.7},{"name":"Draw","price":3.6}]}]}]', [{"name":"LA Galaxy","price":"2.26"},{"name":"Seattle Sounders FC","price":"2.84"},{"name":"Draw","price":"3.53"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'KLEAGUE', 'soccer_korea_kleague1', 'K League 1',
  '2025-08-02T10:00:00Z', 'Ulsan Hyundai FC', 'Suwon FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":4.5},{"name":"Ulsan Hyundai FC","price":1.69},{"name":"Draw","price":3.9}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":4.3},{"name":"Ulsan Hyundai FC","price":1.71},{"name":"Draw","price":3.8}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":4.25},{"name":"Ulsan Hyundai FC","price":1.69},{"name":"Draw","price":3.85}]},{"key":"spreads","outcomes":[{"name":"Suwon FC","price":1.85},{"name":"Ulsan Hyundai FC","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.91}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":4.33},{"name":"Ulsan Hyundai FC","price":1.74},{"name":"Draw","price":3.8}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":4.1},{"name":"Ulsan Hyundai FC","price":1.67},{"name":"Draw","price":3.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.6},{"name":"Under","price":2.14}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":3.65},{"name":"Ulsan Hyundai FC","price":1.74},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Suwon FC","price":1.91},{"name":"Ulsan Hyundai FC","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.03}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Suwon FC","price":3.65},{"name":"Ulsan Hyundai FC","price":1.74},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Suwon FC","price":1.91},{"name":"Ulsan Hyundai FC","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.03}]}]}]', [{"name":"Suwon FC","price":"4.11"},{"name":"Ulsan Hyundai FC","price":"1.71"},{"name":"Draw","price":"3.81"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'KLEAGUE', 'soccer_korea_kleague1', 'K League 1',
  '2025-08-08T10:30:00Z', 'FC Seoul', 'Daegu FC', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Daegu FC","price":8},{"name":"FC Seoul","price":1.37},{"name":"Draw","price":4.6}]}]}]', [{"name":"Daegu FC","price":"8.00"},{"name":"FC Seoul","price":"1.37"},{"name":"Draw","price":"4.60"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'KLEAGUE', 'soccer_korea_kleague1', 'K League 1',
  '2025-08-08T10:30:00Z', 'Jeonbuk Hyundai Motors', 'FC Anyang', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"FC Anyang","price":5.9},{"name":"Jeonbuk Hyundai Motors","price":1.54},{"name":"Draw","price":4}]}]}]', [{"name":"FC Anyang","price":"5.90"},{"name":"Jeonbuk Hyundai Motors","price":"1.54"},{"name":"Draw","price":"4.00"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-09T09:00:00Z', 'Tokyo Verdy', 'Yokohama F Marinos', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Tokyo Verdy","price":2.35},{"name":"Yokohama F Marinos","price":3},{"name":"Draw","price":3.2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Tokyo Verdy","price":2.35},{"name":"Yokohama F Marinos","price":2.8},{"name":"Draw","price":3.35}]}]}]', [{"name":"Tokyo Verdy","price":"2.35"},{"name":"Yokohama F Marinos","price":"2.90"},{"name":"Draw","price":"3.28"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-09T09:00:00Z', 'Yokohama FC', 'Urawa Red Diamonds', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Urawa Red Diamonds","price":2.45},{"name":"Yokohama FC","price":2.8},{"name":"Draw","price":3.2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Urawa Red Diamonds","price":2.5},{"name":"Yokohama FC","price":2.65},{"name":"Draw","price":3.3}]}]}]', [{"name":"Urawa Red Diamonds","price":"2.48"},{"name":"Yokohama FC","price":"2.72"},{"name":"Draw","price":"3.25"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-09T10:00:00Z', 'Kawasaki Frontale', 'Avispa Fukuoka', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Avispa Fukuoka","price":4},{"name":"Kawasaki Frontale","price":1.87},{"name":"Draw","price":3.4}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Avispa Fukuoka","price":3.85},{"name":"Kawasaki Frontale","price":1.87},{"name":"Draw","price":3.5}]}]}]', [{"name":"Avispa Fukuoka","price":"3.92"},{"name":"Kawasaki Frontale","price":"1.87"},{"name":"Draw","price":"3.45"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-10T09:30:00Z', 'Hiroshima Sanfrecce FC', 'Shimizu S Pulse', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Hiroshima Sanfrecce FC","price":1.67},{"name":"Shimizu S Pulse","price":5.2},{"name":"Draw","price":3.6}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Hiroshima Sanfrecce FC","price":1.67},{"name":"Shimizu S Pulse","price":5},{"name":"Draw","price":3.55}]}]}]', [{"name":"Hiroshima Sanfrecce FC","price":"1.67"},{"name":"Shimizu S Pulse","price":"5.10"},{"name":"Draw","price":"3.58"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-10T10:00:00Z', 'FC Machida Zelvia', 'Vissel Kobe', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"FC Machida Zelvia","price":2.75},{"name":"Vissel Kobe","price":2.65},{"name":"Draw","price":3}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"FC Machida Zelvia","price":2.7},{"name":"Vissel Kobe","price":2.55},{"name":"Draw","price":3.1}]}]}]', [{"name":"FC Machida Zelvia","price":"2.73"},{"name":"Vissel Kobe","price":"2.60"},{"name":"Draw","price":"3.05"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-10T10:00:00Z', 'FC Tokyo', 'Kashima Antlers', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"FC Tokyo","price":2.6},{"name":"Kashima Antlers","price":2.65},{"name":"Draw","price":3.1}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"FC Tokyo","price":2.65},{"name":"Kashima Antlers","price":2.55},{"name":"Draw","price":3.25}]}]}]', [{"name":"FC Tokyo","price":"2.63"},{"name":"Kashima Antlers","price":"2.60"},{"name":"Draw","price":"3.17"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-10T10:00:00Z', 'Gamba Osaka', 'Fagiano Okayama', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Fagiano Okayama","price":4.4},{"name":"Gamba Osaka","price":1.83},{"name":"Draw","price":3.4}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Fagiano Okayama","price":4.2},{"name":"Gamba Osaka","price":1.83},{"name":"Draw","price":3.35}]}]}]', [{"name":"Fagiano Okayama","price":"4.30"},{"name":"Gamba Osaka","price":"1.83"},{"name":"Draw","price":"3.38"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-10T10:00:00Z', 'Kashiwa Reysol', 'Shonan Bellmare', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Kashiwa Reysol","price":1.48},{"name":"Shonan Bellmare","price":6.5},{"name":"Draw","price":4.1}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kashiwa Reysol","price":1.5},{"name":"Shonan Bellmare","price":5.5},{"name":"Draw","price":4.2}]}]}]', [{"name":"Kashiwa Reysol","price":"1.49"},{"name":"Shonan Bellmare","price":"6.00"},{"name":"Draw","price":"4.15"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-10T10:00:00Z', 'Nagoya Grampus', 'Kyoto Purple Sanga', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Kyoto Purple Sanga","price":3},{"name":"Nagoya Grampus","price":2.45},{"name":"Draw","price":3}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Kyoto Purple Sanga","price":2.95},{"name":"Nagoya Grampus","price":2.35},{"name":"Draw","price":3.1}]}]}]', [{"name":"Kyoto Purple Sanga","price":"2.98"},{"name":"Nagoya Grampus","price":"2.40"},{"name":"Draw","price":"3.05"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'JLEAGUE', 'soccer_japan_j_league', 'J League',
  '2025-08-11T10:00:00Z', 'Cerezo Osaka', 'Albirex Niigata', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Albirex Niigata","price":5.1},{"name":"Cerezo Osaka","price":1.59},{"name":"Draw","price":3.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Albirex Niigata","price":4.6},{"name":"Cerezo Osaka","price":1.62},{"name":"Draw","price":4}]}]}]', [{"name":"Albirex Niigata","price":"4.85"},{"name":"Cerezo Osaka","price":"1.60"},{"name":"Draw","price":"3.90"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-23T16:30:00Z', 'Genoa', 'Lecce', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":1.92},{"name":"Lecce","price":3.85},{"name":"Draw","price":3.15}]},{"key":"totals","outcomes":[{"name":"Over","price":2.17},{"name":"Under","price":1.61}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":2.05},{"name":"Lecce","price":3.9},{"name":"Draw","price":3.2}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":2.05},{"name":"Lecce","price":3.88},{"name":"Draw","price":3.09}]},{"key":"spreads","outcomes":[{"name":"Genoa","price":2.05},{"name":"Lecce","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":2.05},{"name":"Lecce","price":3.88},{"name":"Draw","price":3.09}]},{"key":"spreads","outcomes":[{"name":"Genoa","price":2.05},{"name":"Lecce","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":2.05},{"name":"Lecce","price":3.8},{"name":"Draw","price":3.25}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":2.07},{"name":"Lecce","price":4.1},{"name":"Draw","price":3.05}]},{"key":"spreads","outcomes":[{"name":"Genoa","price":2.08},{"name":"Lecce","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Genoa","price":1.95},{"name":"Lecce","price":3.65},{"name":"Draw","price":3}]}]}]', [{"name":"Genoa","price":"2.02"},{"name":"Lecce","price":"3.87"},{"name":"Draw","price":"3.12"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-23T16:30:00Z', 'Sassuolo', 'Napoli', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.44},{"name":"Sassuolo","price":5.6},{"name":"Draw","price":4.25}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.85}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.42},{"name":"Sassuolo","price":7},{"name":"Draw","price":4.4}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.46},{"name":"Sassuolo","price":6.55},{"name":"Draw","price":4.32}]},{"key":"spreads","outcomes":[{"name":"Napoli","price":1.79},{"name":"Sassuolo","price":2.07}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.46},{"name":"Sassuolo","price":6.55},{"name":"Draw","price":4.32}]},{"key":"spreads","outcomes":[{"name":"Napoli","price":1.79},{"name":"Sassuolo","price":2.07}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.5},{"name":"Sassuolo","price":6.75},{"name":"Draw","price":4.33}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.47},{"name":"Sassuolo","price":6.75},{"name":"Draw","price":4.4}]},{"key":"spreads","outcomes":[{"name":"Napoli","price":1.78},{"name":"Sassuolo","price":2.08}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Napoli","price":1.43},{"name":"Sassuolo","price":6},{"name":"Draw","price":4}]}]}]', [{"name":"Napoli","price":"1.45"},{"name":"Sassuolo","price":"6.46"},{"name":"Draw","price":"4.29"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-23T18:45:00Z', 'AC Milan', 'Cremonese', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.38},{"name":"Cremonese","price":6.25},{"name":"Draw","price":4.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.61},{"name":"Under","price":2.18}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.32},{"name":"Cremonese","price":8},{"name":"Draw","price":4.8}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.38},{"name":"Cremonese","price":7.5},{"name":"Draw","price":4.85}]},{"key":"spreads","outcomes":[{"name":"AC Milan","price":1.83},{"name":"Cremonese","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.04}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.38},{"name":"Cremonese","price":7.5},{"name":"Draw","price":4.85}]},{"key":"spreads","outcomes":[{"name":"AC Milan","price":1.83},{"name":"Cremonese","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.04}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.36},{"name":"Cremonese","price":7.75},{"name":"Draw","price":5}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.38},{"name":"Cremonese","price":7.75},{"name":"Draw","price":5}]},{"key":"spreads","outcomes":[{"name":"AC Milan","price":1.83},{"name":"Cremonese","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"AC Milan","price":1.34},{"name":"Cremonese","price":7},{"name":"Draw","price":4.6}]}]}]', [{"name":"AC Milan","price":"1.36"},{"name":"Cremonese","price":"7.39"},{"name":"Draw","price":"4.79"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-23T18:45:00Z', 'AS Roma', 'Bologna', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.06},{"name":"Bologna","price":3.5},{"name":"Draw","price":3.1}]},{"key":"totals","outcomes":[{"name":"Over","price":2.1},{"name":"Under","price":1.66}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.1},{"name":"Bologna","price":3.6},{"name":"Draw","price":3.3}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.08},{"name":"Bologna","price":3.6},{"name":"Draw","price":3.22}]},{"key":"spreads","outcomes":[{"name":"AS Roma","price":1.81},{"name":"Bologna","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.94}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.08},{"name":"Bologna","price":3.6},{"name":"Draw","price":3.22}]},{"key":"spreads","outcomes":[{"name":"AS Roma","price":1.81},{"name":"Bologna","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.94}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.05},{"name":"Bologna","price":3.6},{"name":"Draw","price":3.4}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.11},{"name":"Bologna","price":3.65},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"AS Roma","price":1.8},{"name":"Bologna","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"AS Roma","price":2.05},{"name":"Bologna","price":3.4},{"name":"Draw","price":3.1}]}]}]', [{"name":"AS Roma","price":"2.08"},{"name":"Bologna","price":"3.56"},{"name":"Draw","price":"3.23"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-24T16:30:00Z', 'Cagliari', 'Fiorentina', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":3.1},{"name":"Fiorentina","price":2.3},{"name":"Draw","price":3.3}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":2.9},{"name":"Fiorentina","price":2.2},{"name":"Draw","price":3.15}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":3},{"name":"Fiorentina","price":2.2},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.72}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":3.02},{"name":"Fiorentina","price":2.32},{"name":"Draw","price":3.26}]},{"key":"spreads","outcomes":[{"name":"Cagliari","price":1.84},{"name":"Fiorentina","price":1.99}]},{"key":"totals","outcomes":[{"name":"Over","price":1.79},{"name":"Under","price":2.06}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":3.02},{"name":"Fiorentina","price":2.32},{"name":"Draw","price":3.26}]},{"key":"spreads","outcomes":[{"name":"Cagliari","price":1.84},{"name":"Fiorentina","price":1.99}]},{"key":"totals","outcomes":[{"name":"Over","price":1.79},{"name":"Under","price":2.06}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":3},{"name":"Fiorentina","price":2.3},{"name":"Draw","price":3.3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Cagliari","price":3.15},{"name":"Fiorentina","price":2.32},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Cagliari","price":1.85},{"name":"Fiorentina","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]}]', [{"name":"Cagliari","price":"3.03"},{"name":"Fiorentina","price":"2.28"},{"name":"Draw","price":"3.25"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-24T16:30:00Z', 'Como', 'Lazio', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.55},{"name":"Lazio","price":2.8},{"name":"Draw","price":3.2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.45},{"name":"Lazio","price":2.6},{"name":"Draw","price":3.2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.55},{"name":"Lazio","price":2.65},{"name":"Draw","price":3.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.77}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.51},{"name":"Lazio","price":2.75},{"name":"Draw","price":3.26}]},{"key":"spreads","outcomes":[{"name":"Como","price":1.83},{"name":"Lazio","price":2.01}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.51},{"name":"Lazio","price":2.75},{"name":"Draw","price":3.26}]},{"key":"spreads","outcomes":[{"name":"Como","price":1.83},{"name":"Lazio","price":2.01}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.6},{"name":"Lazio","price":2.7},{"name":"Draw","price":3.3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Como","price":2.57},{"name":"Lazio","price":2.8},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Como","price":1.83},{"name":"Lazio","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]}]', [{"name":"Como","price":"2.53"},{"name":"Lazio","price":"2.72"},{"name":"Draw","price":"3.22"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-24T18:45:00Z', 'Atalanta BC', 'Pisa', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.37},{"name":"Pisa","price":7.5},{"name":"Draw","price":4.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.37},{"name":"Pisa","price":6.5},{"name":"Draw","price":4.5}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.4},{"name":"Pisa","price":6},{"name":"Draw","price":4.5}]},{"key":"totals","outcomes":[{"name":"Over","price":1.56},{"name":"Under","price":2.25}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.39},{"name":"Pisa","price":7.05},{"name":"Draw","price":4.77}]},{"key":"spreads","outcomes":[{"name":"Atalanta BC","price":1.88},{"name":"Pisa","price":1.94}]},{"key":"totals","outcomes":[{"name":"Over","price":2.03},{"name":"Under","price":1.81}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.39},{"name":"Pisa","price":7.05},{"name":"Draw","price":4.77}]},{"key":"spreads","outcomes":[{"name":"Atalanta BC","price":1.88},{"name":"Pisa","price":1.94}]},{"key":"totals","outcomes":[{"name":"Over","price":2.03},{"name":"Under","price":1.81}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.4},{"name":"Pisa","price":7.25},{"name":"Draw","price":4.8}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atalanta BC","price":1.4},{"name":"Pisa","price":7.25},{"name":"Draw","price":4.95}]},{"key":"spreads","outcomes":[{"name":"Atalanta BC","price":1.87},{"name":"Pisa","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]}]', [{"name":"Atalanta BC","price":"1.39"},{"name":"Pisa","price":"6.94"},{"name":"Draw","price":"4.73"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-24T18:45:00Z', 'Juventus', 'Parma', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.37},{"name":"Parma","price":8},{"name":"Draw","price":4.6}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.38},{"name":"Parma","price":6.5},{"name":"Draw","price":4.4}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.4},{"name":"Parma","price":6.4},{"name":"Draw","price":4.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.71},{"name":"Under","price":2.02}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.41},{"name":"Parma","price":7.05},{"name":"Draw","price":4.6}]},{"key":"spreads","outcomes":[{"name":"Juventus","price":1.94},{"name":"Parma","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.41},{"name":"Parma","price":7.05},{"name":"Draw","price":4.6}]},{"key":"spreads","outcomes":[{"name":"Juventus","price":1.94},{"name":"Parma","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.4},{"name":"Parma","price":7.5},{"name":"Draw","price":4.8}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Juventus","price":1.43},{"name":"Parma","price":7},{"name":"Draw","price":4.7}]},{"key":"spreads","outcomes":[{"name":"Juventus","price":1.95},{"name":"Parma","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]}]', [{"name":"Juventus","price":"1.40"},{"name":"Parma","price":"7.07"},{"name":"Draw","price":"4.57"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-25T16:30:00Z', 'Udinese', 'Hellas Verona', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.65},{"name":"Udinese","price":1.97},{"name":"Draw","price":3.15}]},{"key":"totals","outcomes":[{"name":"Over","price":2.12},{"name":"Under","price":1.65}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.6},{"name":"Udinese","price":2.1},{"name":"Draw","price":3.3}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.7},{"name":"Udinese","price":2.13},{"name":"Draw","price":3.02}]},{"key":"spreads","outcomes":[{"name":"Hellas Verona","price":2},{"name":"Udinese","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.7},{"name":"Udinese","price":2.13},{"name":"Draw","price":3.02}]},{"key":"spreads","outcomes":[{"name":"Hellas Verona","price":2},{"name":"Udinese","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.6},{"name":"Udinese","price":2.1},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.8},{"name":"Udinese","price":2.17},{"name":"Draw","price":3}]},{"key":"spreads","outcomes":[{"name":"Hellas Verona","price":2},{"name":"Udinese","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Hellas Verona","price":3.45},{"name":"Udinese","price":2.1},{"name":"Draw","price":3}]}]}]', [{"name":"Hellas Verona","price":"3.64"},{"name":"Udinese","price":"2.10"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'SERIEA', 'soccer_italy_serie_a', 'Serie A - Italy',
  '2025-08-25T18:45:00Z', 'Inter Milan', 'Torino', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.37},{"name":"Torino","price":7.5},{"name":"Draw","price":4.8}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.4},{"name":"Torino","price":6.5},{"name":"Draw","price":4.6}]},{"key":"totals","outcomes":[{"name":"Over","price":1.64},{"name":"Under","price":2.12}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.39},{"name":"Torino","price":7.05},{"name":"Draw","price":4.77}]},{"key":"spreads","outcomes":[{"name":"Inter Milan","price":1.95},{"name":"Torino","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.86},{"name":"Under","price":1.96}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.39},{"name":"Torino","price":7.05},{"name":"Draw","price":4.77}]},{"key":"spreads","outcomes":[{"name":"Inter Milan","price":1.95},{"name":"Torino","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.86},{"name":"Under","price":1.96}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.4},{"name":"Torino","price":7.5},{"name":"Draw","price":4.8}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.41},{"name":"Torino","price":7.25},{"name":"Draw","price":4.85}]},{"key":"spreads","outcomes":[{"name":"Inter Milan","price":1.95},{"name":"Torino","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Inter Milan","price":1.37},{"name":"Torino","price":6.5},{"name":"Draw","price":4.4}]}]}]', [{"name":"Inter Milan","price":"1.39"},{"name":"Torino","price":"7.05"},{"name":"Draw","price":"4.71"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-02T19:00:00Z', 'Sport Recife', 'Bahia', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.4},{"name":"Sport Recife","price":3.1},{"name":"Draw","price":3.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.45},{"name":"Sport Recife","price":3},{"name":"Draw","price":3.3}]},{"key":"spreads","outcomes":[{"name":"Bahia","price":2.1},{"name":"Sport Recife","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.83}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.45},{"name":"Sport Recife","price":2.95},{"name":"Draw","price":3.2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.4},{"name":"Sport Recife","price":3},{"name":"Draw","price":3.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.5},{"name":"Sport Recife","price":2.88},{"name":"Draw","price":3.4}]},{"key":"totals","outcomes":[{"name":"Over","price":2.28},{"name":"Under","price":1.64}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.4},{"name":"Sport Recife","price":3.1},{"name":"Draw","price":3.22}]},{"key":"spreads","outcomes":[{"name":"Bahia","price":2.05},{"name":"Sport Recife","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.85}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.4},{"name":"Sport Recife","price":3.1},{"name":"Draw","price":3.22}]},{"key":"spreads","outcomes":[{"name":"Bahia","price":2.05},{"name":"Sport Recife","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.85}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.42},{"name":"Sport Recife","price":3.06},{"name":"Draw","price":3.21}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.83}]}]}]', [{"name":"Bahia","price":"2.43"},{"name":"Sport Recife","price":"3.02"},{"name":"Draw","price":"3.22"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-02T21:30:00Z', 'Mirassol', 'Vasco da Gama', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.95},{"name":"Vasco da Gama","price":4.2},{"name":"Draw","price":3.3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.95},{"name":"Vasco da Gama","price":4.3},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Mirassol","price":1.95},{"name":"Vasco da Gama","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.95},{"name":"Vasco da Gama","price":4.2},{"name":"Draw","price":3.2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.91},{"name":"Vasco da Gama","price":4.6},{"name":"Draw","price":3.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.97},{"name":"Vasco da Gama","price":4.5},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.32},{"name":"Under","price":1.63}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.89},{"name":"Vasco da Gama","price":4.8},{"name":"Draw","price":3.17}]},{"key":"spreads","outcomes":[{"name":"Mirassol","price":1.89},{"name":"Vasco da Gama","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.89},{"name":"Vasco da Gama","price":4.8},{"name":"Draw","price":3.17}]},{"key":"spreads","outcomes":[{"name":"Mirassol","price":1.89},{"name":"Vasco da Gama","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Mirassol","price":1.91},{"name":"Vasco da Gama","price":4.2},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Mirassol","price":1.92},{"name":"Vasco da Gama","price":1.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.85}]}]}]', [{"name":"Mirassol","price":"1.93"},{"name":"Vasco da Gama","price":"4.45"},{"name":"Draw","price":"3.21"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T00:00:00Z', 'Fluminense', 'Grêmio', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.74},{"name":"Grêmio","price":5.2},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.8},{"name":"Grêmio","price":4.7},{"name":"Draw","price":3.5}]},{"key":"spreads","outcomes":[{"name":"Fluminense","price":1.83},{"name":"Grêmio","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.8},{"name":"Grêmio","price":4.75},{"name":"Draw","price":3.4}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.87},{"name":"Grêmio","price":4.6},{"name":"Draw","price":3.5}]},{"key":"totals","outcomes":[{"name":"Over","price":2.43},{"name":"Under","price":1.57}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.8},{"name":"Grêmio","price":4.7},{"name":"Draw","price":3.5}]},{"key":"spreads","outcomes":[{"name":"Fluminense","price":1.83},{"name":"Grêmio","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.89}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.8},{"name":"Grêmio","price":4.6},{"name":"Draw","price":3.35}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.82},{"name":"Grêmio","price":4.85},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Fluminense","price":1.82},{"name":"Grêmio","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Fluminense","price":1.82},{"name":"Grêmio","price":4.85},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Fluminense","price":1.82},{"name":"Grêmio","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]}]', [{"name":"Fluminense","price":"1.81"},{"name":"Grêmio","price":"4.78"},{"name":"Draw","price":"3.41"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T19:00:00Z', 'Botafogo', 'Cruzeiro', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.1},{"name":"Cruzeiro","price":3.8},{"name":"Draw","price":3.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.15},{"name":"Cruzeiro","price":3.65},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Botafogo","price":1.83},{"name":"Cruzeiro","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.1},{"name":"Cruzeiro","price":3.6},{"name":"Draw","price":3.3}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.1},{"name":"Cruzeiro","price":3.75},{"name":"Draw","price":3.05}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.1},{"name":"Cruzeiro","price":3.85},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":2.5},{"name":"Under","price":1.55}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.05},{"name":"Cruzeiro","price":3.95},{"name":"Draw","price":3.23}]},{"key":"spreads","outcomes":[{"name":"Botafogo","price":2.05},{"name":"Cruzeiro","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.05},{"name":"Cruzeiro","price":3.95},{"name":"Draw","price":3.23}]},{"key":"spreads","outcomes":[{"name":"Botafogo","price":2.05},{"name":"Cruzeiro","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.09},{"name":"Cruzeiro","price":3.86},{"name":"Draw","price":3.19}]},{"key":"spreads","outcomes":[{"name":"Botafogo","price":2},{"name":"Cruzeiro","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.92}]}]}]', [{"name":"Botafogo","price":"2.09"},{"name":"Cruzeiro","price":"3.80"},{"name":"Draw","price":"3.21"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T19:00:00Z', 'Corinthians', 'Fortaleza', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.8},{"name":"Fortaleza","price":5.1},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.83},{"name":"Fortaleza","price":4.6},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Corinthians","price":1.87},{"name":"Fortaleza","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.85},{"name":"Fortaleza","price":4.5},{"name":"Draw","price":3.3}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.92},{"name":"Fortaleza","price":4.3},{"name":"Draw","price":3.55}]},{"key":"totals","outcomes":[{"name":"Over","price":2.45},{"name":"Under","price":1.56}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.77},{"name":"Fortaleza","price":4.8},{"name":"Draw","price":3.3}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.81},{"name":"Fortaleza","price":4.96},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Corinthians","price":1.81},{"name":"Fortaleza","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.04}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":1.81},{"name":"Fortaleza","price":4.96},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Corinthians","price":1.81},{"name":"Fortaleza","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.04}]}]}]', [{"name":"Corinthians","price":"1.83"},{"name":"Fortaleza","price":"4.75"},{"name":"Draw","price":"3.36"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T21:30:00Z', 'Atletico Mineiro', 'Bragantino-SP', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.95},{"name":"Bragantino-SP","price":4.2},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.91},{"name":"Bragantino-SP","price":4.1},{"name":"Draw","price":3.45}]},{"key":"spreads","outcomes":[{"name":"Atletico Mineiro","price":1.95},{"name":"Bragantino-SP","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.91},{"name":"Bragantino-SP","price":4.1},{"name":"Draw","price":3.25}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.88},{"name":"Bragantino-SP","price":4.4},{"name":"Draw","price":3.55}]},{"key":"totals","outcomes":[{"name":"Over","price":2.3},{"name":"Under","price":1.63}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.93},{"name":"Bragantino-SP","price":4.29},{"name":"Draw","price":3.33}]},{"key":"spreads","outcomes":[{"name":"Atletico Mineiro","price":1.93},{"name":"Bragantino-SP","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.93},{"name":"Bragantino-SP","price":4.29},{"name":"Draw","price":3.33}]},{"key":"spreads","outcomes":[{"name":"Atletico Mineiro","price":1.93},{"name":"Bragantino-SP","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":1.91},{"name":"Bragantino-SP","price":4.1},{"name":"Draw","price":3.45}]},{"key":"spreads","outcomes":[{"name":"Atletico Mineiro","price":1.87},{"name":"Bragantino-SP","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.8}]}]}]', [{"name":"Atletico Mineiro","price":"1.92"},{"name":"Bragantino-SP","price":"4.21"},{"name":"Draw","price":"3.37"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T21:30:00Z', 'Ceará', 'Flamengo', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.3},{"name":"Flamengo","price":1.95},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.2},{"name":"Flamengo","price":1.95},{"name":"Draw","price":3.3}]},{"key":"spreads","outcomes":[{"name":"Ceará","price":1.85},{"name":"Flamengo","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.2},{"name":"Flamengo","price":1.95},{"name":"Draw","price":3.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.5},{"name":"Flamengo","price":1.91},{"name":"Draw","price":3.4}]},{"key":"totals","outcomes":[{"name":"Over","price":2.55},{"name":"Under","price":1.53}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.34},{"name":"Flamengo","price":1.99},{"name":"Draw","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Ceará","price":1.84},{"name":"Flamengo","price":1.99}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.97}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.34},{"name":"Flamengo","price":1.99},{"name":"Draw","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Ceará","price":1.84},{"name":"Flamengo","price":1.99}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.97}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":4.2},{"name":"Flamengo","price":1.95},{"name":"Draw","price":3.3}]},{"key":"spreads","outcomes":[{"name":"Ceará","price":1.85},{"name":"Flamengo","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.87}]}]}]', [{"name":"Ceará","price":"4.30"},{"name":"Flamengo","price":"1.96"},{"name":"Draw","price":"3.23"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T22:30:00Z', 'Vitoria', 'Palmeiras', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.83},{"name":"Vitoria","price":4.6},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.87},{"name":"Vitoria","price":4.6},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Palmeiras","price":1.87},{"name":"Vitoria","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.85},{"name":"Vitoria","price":4.6},{"name":"Draw","price":3.4}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.87},{"name":"Vitoria","price":4.5},{"name":"Draw","price":3.2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.83},{"name":"Vitoria","price":5},{"name":"Draw","price":3.45}]},{"key":"totals","outcomes":[{"name":"Over","price":2.6},{"name":"Under","price":1.5}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.9},{"name":"Vitoria","price":4.66},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Palmeiras","price":1.9},{"name":"Vitoria","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.9},{"name":"Vitoria","price":4.66},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Palmeiras","price":1.9},{"name":"Vitoria","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Palmeiras","price":1.87},{"name":"Vitoria","price":4.6},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Palmeiras","price":1.87},{"name":"Vitoria","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.89}]}]}]', [{"name":"Palmeiras","price":"1.87"},{"name":"Vitoria","price":"4.65"},{"name":"Draw","price":"3.32"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-03T23:30:00Z', 'Internacional', 'Sao Paulo', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.83},{"name":"Sao Paulo","price":4.4},{"name":"Draw","price":3.2}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.95},{"name":"Sao Paulo","price":4.1},{"name":"Draw","price":3.25}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.91},{"name":"Sao Paulo","price":4.2},{"name":"Draw","price":3.2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.93},{"name":"Sao Paulo","price":4.35},{"name":"Draw","price":3.45}]},{"key":"totals","outcomes":[{"name":"Over","price":2.55},{"name":"Under","price":1.51}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.96},{"name":"Sao Paulo","price":4.25},{"name":"Draw","price":3.27}]},{"key":"spreads","outcomes":[{"name":"Internacional","price":1.96},{"name":"Sao Paulo","price":1.86}]},{"key":"totals","outcomes":[{"name":"Over","price":1.9},{"name":"Under","price":1.92}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.96},{"name":"Sao Paulo","price":4.25},{"name":"Draw","price":3.27}]},{"key":"spreads","outcomes":[{"name":"Internacional","price":1.96},{"name":"Sao Paulo","price":1.86}]},{"key":"totals","outcomes":[{"name":"Over","price":1.9},{"name":"Under","price":1.92}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Internacional","price":1.95},{"name":"Sao Paulo","price":4.3},{"name":"Draw","price":3.27}]},{"key":"spreads","outcomes":[{"name":"Internacional","price":1.89},{"name":"Sao Paulo","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.87}]}]}]', [{"name":"Internacional","price":"1.93"},{"name":"Sao Paulo","price":"4.26"},{"name":"Draw","price":"3.27"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-04T23:00:00Z', 'Santos', 'Juventude', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":8},{"name":"Santos","price":1.37},{"name":"Draw","price":4.4}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":7.5},{"name":"Santos","price":1.43},{"name":"Draw","price":4.6}]},{"key":"spreads","outcomes":[{"name":"Juventude","price":1.85},{"name":"Santos","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":7.5},{"name":"Santos","price":1.44},{"name":"Draw","price":4.4}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":8},{"name":"Santos","price":1.38},{"name":"Draw","price":4.4}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":8.48},{"name":"Santos","price":1.4},{"name":"Draw","price":4.56}]},{"key":"spreads","outcomes":[{"name":"Juventude","price":1.87},{"name":"Santos","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":8.48},{"name":"Santos","price":1.4},{"name":"Draw","price":4.56}]},{"key":"spreads","outcomes":[{"name":"Juventude","price":1.87},{"name":"Santos","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Juventude","price":7.5},{"name":"Santos","price":1.43},{"name":"Draw","price":4.7}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.87}]}]}]', [{"name":"Juventude","price":"7.92"},{"name":"Santos","price":"1.41"},{"name":"Draw","price":"4.52"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-09T21:30:00Z', 'Bragantino-SP', 'Internacional', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Bragantino-SP","price":2.2},{"name":"Internacional","price":3.5},{"name":"Draw","price":3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Bragantino-SP","price":2.3},{"name":"Internacional","price":3.35},{"name":"Draw","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Bragantino-SP","price":1.95},{"name":"Internacional","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]}]', [{"name":"Bragantino-SP","price":"2.25"},{"name":"Internacional","price":"3.42"},{"name":"Draw","price":"3.08"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-09T21:30:00Z', 'Flamengo', 'Mirassol', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Flamengo","price":1.37},{"name":"Mirassol","price":8.5},{"name":"Draw","price":4.4}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Flamengo","price":1.41},{"name":"Mirassol","price":7.75},{"name":"Draw","price":4.7}]},{"key":"spreads","outcomes":[{"name":"Flamengo","price":1.95},{"name":"Mirassol","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Flamengo","price":1.4},{"name":"Mirassol","price":8},{"name":"Draw","price":4.6}]}]}]', [{"name":"Flamengo","price":"1.39"},{"name":"Mirassol","price":"8.08"},{"name":"Draw","price":"4.57"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-09T21:30:00Z', 'Sao Paulo', 'Vitoria', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Sao Paulo","price":1.48},{"name":"Vitoria","price":7.5},{"name":"Draw","price":3.8}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Sao Paulo","price":1.53},{"name":"Vitoria","price":7.25},{"name":"Draw","price":3.8}]}]}]', [{"name":"Sao Paulo","price":"1.50"},{"name":"Vitoria","price":"7.38"},{"name":"Draw","price":"3.80"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-09T23:30:00Z', 'Fortaleza', 'Botafogo', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.5},{"name":"Fortaleza","price":2.95},{"name":"Draw","price":3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.45},{"name":"Fortaleza","price":3.05},{"name":"Draw","price":3.2}]},{"key":"spreads","outcomes":[{"name":"Botafogo","price":2.08},{"name":"Fortaleza","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Botafogo","price":2.5},{"name":"Fortaleza","price":2.95},{"name":"Draw","price":3.1}]}]}]', [{"name":"Botafogo","price":"2.48"},{"name":"Fortaleza","price":"2.98"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-10T00:00:00Z', 'Bahia', 'Fluminense', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.05},{"name":"Fluminense","price":4.1},{"name":"Draw","price":3.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.05},{"name":"Fluminense","price":4},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Bahia","price":2.05},{"name":"Fluminense","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Bahia","price":2.05},{"name":"Fluminense","price":3.9},{"name":"Draw","price":3.2}]}]}]', [{"name":"Bahia","price":"2.05"},{"name":"Fluminense","price":"4.00"},{"name":"Draw","price":"3.18"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-10T19:00:00Z', 'Vasco da Gama', 'Atletico Mineiro', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":3.4},{"name":"Vasco da Gama","price":2.2},{"name":"Draw","price":3.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":3.4},{"name":"Vasco da Gama","price":2.25},{"name":"Draw","price":3.2}]},{"key":"spreads","outcomes":[{"name":"Atletico Mineiro","price":1.89},{"name":"Vasco da Gama","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.78},{"name":"Under","price":2.08}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Atletico Mineiro","price":3.4},{"name":"Vasco da Gama","price":2.3},{"name":"Draw","price":3.1}]}]}]', [{"name":"Atletico Mineiro","price":"3.40"},{"name":"Vasco da Gama","price":"2.25"},{"name":"Draw","price":"3.13"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-10T19:00:00Z', 'Palmeiras', 'Ceará', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":8.5},{"name":"Palmeiras","price":1.37},{"name":"Draw","price":4.4}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Ceará","price":8},{"name":"Palmeiras","price":1.41},{"name":"Draw","price":4.7}]},{"key":"spreads","outcomes":[{"name":"Ceará","price":1.87},{"name":"Palmeiras","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]}]', [{"name":"Ceará","price":"8.25"},{"name":"Palmeiras","price":"1.39"},{"name":"Draw","price":"4.55"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-10T21:30:00Z', 'Cruzeiro', 'Santos', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Cruzeiro","price":1.48},{"name":"Santos","price":7},{"name":"Draw","price":3.9}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Cruzeiro","price":1.51},{"name":"Santos","price":7},{"name":"Draw","price":4}]},{"key":"spreads","outcomes":[{"name":"Cruzeiro","price":1.91},{"name":"Santos","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.82}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Cruzeiro","price":1.53},{"name":"Santos","price":7},{"name":"Draw","price":3.9}]}]}]', [{"name":"Cruzeiro","price":"1.51"},{"name":"Santos","price":"7.00"},{"name":"Draw","price":"3.93"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BRASILEIRAO', 'soccer_brazil_campeonato', 'Brazil Série A',
  '2025-08-11T23:00:00Z', 'Juventude', 'Corinthians', '[{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":2.55},{"name":"Juventude","price":2.9},{"name":"Draw","price":3.2}]},{"key":"spreads","outcomes":[{"name":"Corinthians","price":1.8},{"name":"Juventude","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":2.5},{"name":"Juventude","price":2.95},{"name":"Draw","price":3.1}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Corinthians","price":2.5},{"name":"Juventude","price":2.95},{"name":"Draw","price":3}]}]}]', [{"name":"Corinthians","price":"2.52"},{"name":"Juventude","price":"2.93"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.963Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-07T20:00:00Z', 'Godoy Cruz', 'Gimnasia La Plata', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Gimnasia La Plata","price":4.1},{"name":"Godoy Cruz","price":2},{"name":"Draw","price":3}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Gimnasia La Plata","price":4.4},{"name":"Godoy Cruz","price":1.91},{"name":"Draw","price":3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.57},{"name":"Under","price":2.25}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Gimnasia La Plata","price":4.1},{"name":"Godoy Cruz","price":1.95},{"name":"Draw","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Gimnasia La Plata","price":1.77},{"name":"Godoy Cruz","price":2.1}]},{"key":"totals","outcomes":[{"name":"Over","price":2.15},{"name":"Under","price":1.71}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Gimnasia La Plata","price":3.9},{"name":"Godoy Cruz","price":2.05},{"name":"Draw","price":3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.54},{"name":"Under","price":2.25}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Gimnasia La Plata","price":4.1},{"name":"Godoy Cruz","price":2},{"name":"Draw","price":2.9}]}]}]', [{"name":"Gimnasia La Plata","price":"4.12"},{"name":"Godoy Cruz","price":"1.98"},{"name":"Draw","price":"2.97"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-07T22:00:00Z', 'San Lorenzo', 'Velez Sarsfield BA', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Lorenzo","price":2.45},{"name":"Velez Sarsfield BA","price":3.3},{"name":"Draw","price":2.75}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"San Lorenzo","price":2.3},{"name":"Velez Sarsfield BA","price":3.2},{"name":"Draw","price":2.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.67},{"name":"Under","price":2.07}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"San Lorenzo","price":2.35},{"name":"Velez Sarsfield BA","price":3.15},{"name":"Draw","price":2.85}]},{"key":"spreads","outcomes":[{"name":"San Lorenzo","price":2.1},{"name":"Velez Sarsfield BA","price":1.77}]},{"key":"totals","outcomes":[{"name":"Over","price":1.76},{"name":"Under","price":2.11}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"San Lorenzo","price":2.4},{"name":"Velez Sarsfield BA","price":3.2},{"name":"Draw","price":2.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.67},{"name":"Under","price":2.05}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"San Lorenzo","price":2.5},{"name":"Velez Sarsfield BA","price":3.25},{"name":"Draw","price":2.65}]}]}]', [{"name":"San Lorenzo","price":"2.40"},{"name":"Velez Sarsfield BA","price":"3.22"},{"name":"Draw","price":"2.82"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-08T00:00:00Z', 'Estudiantes', 'Independiente Rivadavia', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Estudiantes","price":1.8},{"name":"Independiente Rivadavia","price":4.8},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Estudiantes","price":1.76},{"name":"Independiente Rivadavia","price":4.5},{"name":"Draw","price":3.35}]},{"key":"spreads","outcomes":[{"name":"Estudiantes","price":1.8},{"name":"Independiente Rivadavia","price":2.05}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Estudiantes","price":1.79},{"name":"Independiente Rivadavia","price":4.3},{"name":"Draw","price":3.4}]},{"key":"totals","outcomes":[{"name":"Over","price":2.3},{"name":"Under","price":1.55}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Estudiantes","price":1.77},{"name":"Independiente Rivadavia","price":4.8},{"name":"Draw","price":3.3}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Estudiantes","price":1.77},{"name":"Independiente Rivadavia","price":4.6},{"name":"Draw","price":3.3}]}]}]', [{"name":"Estudiantes","price":"1.78"},{"name":"Independiente Rivadavia","price":"4.60"},{"name":"Draw","price":"3.31"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-08T22:00:00Z', 'CA Tigre BA', 'Atlético Huracán', '[{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Huracán","price":3.1},{"name":"CA Tigre BA","price":2.45},{"name":"Draw","price":2.8}]},{"key":"spreads","outcomes":[{"name":"Atlético Huracán","price":1.78},{"name":"CA Tigre BA","price":2.08}]},{"key":"totals","outcomes":[{"name":"Over","price":2.18},{"name":"Under","price":1.7}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Huracán","price":3.1},{"name":"CA Tigre BA","price":2.45},{"name":"Draw","price":2.85}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Huracán","price":3.05},{"name":"CA Tigre BA","price":2.5},{"name":"Draw","price":2.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.51},{"name":"Under","price":2.38}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Huracán","price":3.2},{"name":"CA Tigre BA","price":2.45},{"name":"Draw","price":2.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.57},{"name":"Under","price":2.25}]}]}]', [{"name":"Atlético Huracán","price":"3.11"},{"name":"CA Tigre BA","price":"2.46"},{"name":"Draw","price":"2.82"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T00:00:00Z', 'Newells Old Boys', 'Central Córdoba', '[{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Central Córdoba","price":3.65},{"name":"Newells Old Boys","price":2.05},{"name":"Draw","price":3.1}]},{"key":"spreads","outcomes":[{"name":"Central Córdoba","price":2},{"name":"Newells Old Boys","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":2.47},{"name":"Under","price":1.56}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Central Córdoba","price":3.7},{"name":"Newells Old Boys","price":2.05},{"name":"Draw","price":3.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Central Córdoba","price":4.2},{"name":"Newells Old Boys","price":1.85},{"name":"Draw","price":3.25}]},{"key":"totals","outcomes":[{"name":"Over","price":2.23},{"name":"Under","price":1.57}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Central Córdoba","price":3.8},{"name":"Newells Old Boys","price":2.05},{"name":"Draw","price":3.1}]}]}]', [{"name":"Central Córdoba","price":"3.84"},{"name":"Newells Old Boys","price":"2.00"},{"name":"Draw","price":"3.14"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T00:15:00Z', 'Lanus', 'Talleres', '[{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Lanus","price":2.05},{"name":"Talleres","price":3.8},{"name":"Draw","price":2.95}]},{"key":"spreads","outcomes":[{"name":"Lanus","price":1.85},{"name":"Talleres","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Lanus","price":2.1},{"name":"Talleres","price":3.8},{"name":"Draw","price":3}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Lanus","price":2},{"name":"Talleres","price":4},{"name":"Draw","price":3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.56},{"name":"Under","price":2.25}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Lanus","price":2.1},{"name":"Talleres","price":3.75},{"name":"Draw","price":3}]}]}]', [{"name":"Lanus","price":"2.06"},{"name":"Talleres","price":"3.84"},{"name":"Draw","price":"2.99"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T17:30:00Z', 'San Martin de San Juan', 'Sarmiento de Junin', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Martin de San Juan","price":2.45},{"name":"Sarmiento de Junin","price":3.2},{"name":"Draw","price":2.85}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"San Martin de San Juan","price":2.4},{"name":"Sarmiento de Junin","price":3.2},{"name":"Draw","price":2.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.56},{"name":"Under","price":2.25}]}]}]', [{"name":"San Martin de San Juan","price":"2.42"},{"name":"Sarmiento de Junin","price":"3.20"},{"name":"Draw","price":"2.83"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T19:30:00Z', 'Boca Juniors', 'Racing Club', '[{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Boca Juniors","price":2},{"name":"Racing Club","price":3.7},{"name":"Draw","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Boca Juniors","price":2.02},{"name":"Racing Club","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":2.32},{"name":"Under","price":1.62}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Boca Juniors","price":2},{"name":"Racing Club","price":3.9},{"name":"Draw","price":3.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Boca Juniors","price":2.06},{"name":"Racing Club","price":3.45},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.23},{"name":"Under","price":1.57}]}]}]', [{"name":"Boca Juniors","price":"2.02"},{"name":"Racing Club","price":"3.68"},{"name":"Draw","price":"3.15"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T21:30:00Z', 'Independiente', 'River Plate', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Independiente","price":2.75},{"name":"River Plate","price":2.65},{"name":"Draw","price":3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Independiente","price":2.7},{"name":"River Plate","price":2.55},{"name":"Draw","price":3.05}]},{"key":"spreads","outcomes":[{"name":"Independiente","price":1.98},{"name":"River Plate","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":2.52},{"name":"Under","price":1.54}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Independiente","price":2.7},{"name":"River Plate","price":2.6},{"name":"Draw","price":3.05}]},{"key":"totals","outcomes":[{"name":"Over","price":2.43},{"name":"Under","price":1.49}]}]}]', [{"name":"Independiente","price":"2.72"},{"name":"River Plate","price":"2.60"},{"name":"Draw","price":"3.03"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T23:45:00Z', 'Atlético Tucuman', 'Rosario Central', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Tucuman","price":3.1},{"name":"Rosario Central","price":2.3},{"name":"Draw","price":3.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Tucuman","price":3},{"name":"Rosario Central","price":2.25},{"name":"Draw","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Atlético Tucuman","price":1.83},{"name":"Rosario Central","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.4},{"name":"Under","price":1.59}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Tucuman","price":3},{"name":"Rosario Central","price":2.3},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.35},{"name":"Under","price":1.51}]}]}]', [{"name":"Atlético Tucuman","price":"3.03"},{"name":"Rosario Central","price":"2.28"},{"name":"Draw","price":"3.15"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-09T23:45:00Z', 'Belgrano de Cordoba', 'Banfield', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Banfield","price":3.5},{"name":"Belgrano de Cordoba","price":2.2},{"name":"Draw","price":3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Banfield","price":3.45},{"name":"Belgrano de Cordoba","price":2.15},{"name":"Draw","price":3.05}]},{"key":"spreads","outcomes":[{"name":"Banfield","price":1.93},{"name":"Belgrano de Cordoba","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":2.55},{"name":"Under","price":1.53}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Banfield","price":3.5},{"name":"Belgrano de Cordoba","price":2.12},{"name":"Draw","price":3.1}]},{"key":"totals","outcomes":[{"name":"Over","price":2.43},{"name":"Under","price":1.49}]}]}]', [{"name":"Banfield","price":"3.48"},{"name":"Belgrano de Cordoba","price":"2.16"},{"name":"Draw","price":"3.05"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-10T18:00:00Z', 'Barracas Central', 'Aldosivi Mar del Plata', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Aldosivi Mar del Plata","price":4.1},{"name":"Barracas Central","price":1.91},{"name":"Draw","price":3.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Aldosivi Mar del Plata","price":4.1},{"name":"Barracas Central","price":1.91},{"name":"Draw","price":3.15}]},{"key":"spreads","outcomes":[{"name":"Aldosivi Mar del Plata","price":1.87},{"name":"Barracas Central","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":2.34},{"name":"Under","price":1.62}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Aldosivi Mar del Plata","price":4},{"name":"Barracas Central","price":1.91},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":2.25},{"name":"Under","price":1.56}]}]}]', [{"name":"Aldosivi Mar del Plata","price":"4.07"},{"name":"Barracas Central","price":"1.91"},{"name":"Draw","price":"3.15"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-10T20:00:00Z', 'Instituto de Córdoba', 'Platense', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Instituto de Córdoba","price":2.15},{"name":"Platense","price":3.7},{"name":"Draw","price":3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Instituto de Córdoba","price":2.1},{"name":"Platense","price":3.6},{"name":"Draw","price":3}]},{"key":"spreads","outcomes":[{"name":"Instituto de Córdoba","price":1.85},{"name":"Platense","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.56},{"name":"Under","price":2.47}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Instituto de Córdoba","price":2.12},{"name":"Platense","price":3.5},{"name":"Draw","price":3.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.51},{"name":"Under","price":2.38}]}]}]', [{"name":"Instituto de Córdoba","price":"2.12"},{"name":"Platense","price":"3.60"},{"name":"Draw","price":"3.03"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-10T23:00:00Z', 'Argentinos Juniors', 'Union Santa Fe', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Argentinos Juniors","price":1.87},{"name":"Union Santa Fe","price":4.3},{"name":"Draw","price":3.2}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Argentinos Juniors","price":1.88},{"name":"Union Santa Fe","price":4.1},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Argentinos Juniors","price":1.93},{"name":"Union Santa Fe","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.56},{"name":"Under","price":2.47}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Argentinos Juniors","price":1.91},{"name":"Union Santa Fe","price":4},{"name":"Draw","price":3.2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.51},{"name":"Under","price":2.4}]}]}]', [{"name":"Argentinos Juniors","price":"1.89"},{"name":"Union Santa Fe","price":"4.13"},{"name":"Draw","price":"3.22"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-11T22:00:00Z', 'Defensa y Justicia', 'Deportivo Riestra', '[{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Defensa y Justicia","price":2.15},{"name":"Deportivo Riestra","price":3.6},{"name":"Draw","price":2.9}]},{"key":"spreads","outcomes":[{"name":"Defensa y Justicia","price":1.87},{"name":"Deportivo Riestra","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.62},{"name":"Under","price":2.34}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Defensa y Justicia","price":2.15},{"name":"Deportivo Riestra","price":3.5},{"name":"Draw","price":2.9}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Defensa y Justicia","price":2.12},{"name":"Deportivo Riestra","price":3.6},{"name":"Draw","price":3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.57},{"name":"Under","price":2.25}]}]}]', [{"name":"Defensa y Justicia","price":"2.14"},{"name":"Deportivo Riestra","price":"3.57"},{"name":"Draw","price":"2.93"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Aldosivi Mar del Plata', 'Belgrano de Cordoba', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Aldosivi Mar del Plata","price":2.15},{"name":"Belgrano de Cordoba","price":3.2},{"name":"Draw","price":3.2}]}]}]', [{"name":"Aldosivi Mar del Plata","price":"2.15"},{"name":"Belgrano de Cordoba","price":"3.20"},{"name":"Draw","price":"3.20"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Atlético Huracán', 'Argentinos Juniors', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Argentinos Juniors","price":3.3},{"name":"Atlético Huracán","price":2.25},{"name":"Draw","price":2.85}]}]}]', [{"name":"Argentinos Juniors","price":"3.30"},{"name":"Atlético Huracán","price":"2.25"},{"name":"Draw","price":"2.85"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Sarmiento de Junin', 'Atlético Tucuman', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Tucuman","price":3.4},{"name":"Sarmiento de Junin","price":2.15},{"name":"Draw","price":2.95}]}]}]', [{"name":"Atlético Tucuman","price":"3.40"},{"name":"Sarmiento de Junin","price":"2.15"},{"name":"Draw","price":"2.95"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Banfield', 'Estudiantes', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Banfield","price":2.55},{"name":"Estudiantes","price":2.8},{"name":"Draw","price":2.9}]}]}]', [{"name":"Banfield","price":"2.55"},{"name":"Estudiantes","price":"2.80"},{"name":"Draw","price":"2.90"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Central Córdoba', 'Barracas Central', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Barracas Central","price":3.2},{"name":"Central Córdoba","price":2.2},{"name":"Draw","price":3.1}]}]}]', [{"name":"Barracas Central","price":"3.20"},{"name":"Central Córdoba","price":"2.20"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Independiente Rivadavia', 'Boca Juniors', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Boca Juniors","price":2.5},{"name":"Independiente Rivadavia","price":2.75},{"name":"Draw","price":3}]}]}]', [{"name":"Boca Juniors","price":"2.50"},{"name":"Independiente Rivadavia","price":"2.75"},{"name":"Draw","price":"3.00"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Racing Club', 'CA Tigre BA', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"CA Tigre BA","price":4},{"name":"Racing Club","price":1.91},{"name":"Draw","price":3.1}]}]}]', [{"name":"CA Tigre BA","price":"4.00"},{"name":"Racing Club","price":"1.91"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Defensa y Justicia', 'Newells Old Boys', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Defensa y Justicia","price":2.1},{"name":"Newells Old Boys","price":3.4},{"name":"Draw","price":3}]}]}]', [{"name":"Defensa y Justicia","price":"2.10"},{"name":"Newells Old Boys","price":"3.40"},{"name":"Draw","price":"3.00"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Rosario Central', 'Deportivo Riestra', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Deportivo Riestra","price":5.7},{"name":"Rosario Central","price":1.67},{"name":"Draw","price":3.2}]}]}]', [{"name":"Deportivo Riestra","price":"5.70"},{"name":"Rosario Central","price":"1.67"},{"name":"Draw","price":"3.20"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Gimnasia La Plata', 'Lanus', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Gimnasia La Plata","price":2.4},{"name":"Lanus","price":3.2},{"name":"Draw","price":2.75}]}]}]', [{"name":"Gimnasia La Plata","price":"2.40"},{"name":"Lanus","price":"3.20"},{"name":"Draw","price":"2.75"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'River Plate', 'Godoy Cruz', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Godoy Cruz","price":6.5},{"name":"River Plate","price":1.51},{"name":"Draw","price":3.6}]}]}]', [{"name":"Godoy Cruz","price":"6.50"},{"name":"River Plate","price":"1.51"},{"name":"Draw","price":"3.60"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Velez Sarsfield BA', 'Independiente', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Independiente","price":2.95},{"name":"Velez Sarsfield BA","price":2.45},{"name":"Draw","price":2.9}]}]}]', [{"name":"Independiente","price":"2.95"},{"name":"Velez Sarsfield BA","price":"2.45"},{"name":"Draw","price":"2.90"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Instituto de Córdoba', 'Union Santa Fe', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Instituto de Córdoba","price":1.91},{"name":"Union Santa Fe","price":4.2},{"name":"Draw","price":3.1}]}]}]', [{"name":"Instituto de Córdoba","price":"1.91"},{"name":"Union Santa Fe","price":"4.20"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Platense', 'San Lorenzo', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Platense","price":2.5},{"name":"San Lorenzo","price":3},{"name":"Draw","price":2.8}]}]}]', [{"name":"Platense","price":"2.50"},{"name":"San Lorenzo","price":"3.00"},{"name":"Draw","price":"2.80"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'ARGENTINA_PRIMERA', 'soccer_argentina_primera_division', 'Primera División - Argentina',
  '2025-08-17T20:00:00Z', 'Talleres', 'San Martin de San Juan', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"San Martin de San Juan","price":4.9},{"name":"Talleres","price":1.77},{"name":"Draw","price":3.1}]}]}]', [{"name":"San Martin de San Juan","price":"4.90"},{"name":"Talleres","price":"1.77"},{"name":"Draw","price":"3.10"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-02T10:00:00Z', 'Yunnan Yukun', 'Shanghai Shenhua FC', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.56},{"name":"Yunnan Yukun","price":5},{"name":"Draw","price":4.7}]},{"key":"totals","outcomes":[{"name":"Over","price":2.2},{"name":"Under","price":1.68}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.53},{"name":"Yunnan Yukun","price":5.1},{"name":"Draw","price":4.4}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.57},{"name":"Yunnan Yukun","price":5},{"name":"Draw","price":4.1}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.57},{"name":"Yunnan Yukun","price":5.2},{"name":"Draw","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Shanghai Shenhua FC","price":1.98},{"name":"Yunnan Yukun","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.56},{"name":"Yunnan Yukun","price":5.04},{"name":"Draw","price":4.26}]},{"key":"spreads","outcomes":[{"name":"Shanghai Shenhua FC","price":1.88},{"name":"Yunnan Yukun","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.87}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.49},{"name":"Yunnan Yukun","price":4.9},{"name":"Draw","price":4.05}]},{"key":"spreads","outcomes":[{"name":"Shanghai Shenhua FC","price":1.93},{"name":"Yunnan Yukun","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Shanghai Shenhua FC","price":1.49},{"name":"Yunnan Yukun","price":4.9},{"name":"Draw","price":4.05}]},{"key":"spreads","outcomes":[{"name":"Shanghai Shenhua FC","price":1.93},{"name":"Yunnan Yukun","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]}]', [{"name":"Shanghai Shenhua FC","price":"1.54"},{"name":"Yunnan Yukun","price":"5.02"},{"name":"Draw","price":"4.25"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-02T11:35:00Z', 'Chengdu Rongcheng FC', 'Shandong Luneng Taishan FC', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.5},{"name":"Shandong Luneng Taishan FC","price":5.25},{"name":"Draw","price":5.1}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.88}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.48},{"name":"Shandong Luneng Taishan FC","price":5.2},{"name":"Draw","price":4.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.57},{"name":"Shandong Luneng Taishan FC","price":4.6},{"name":"Draw","price":4.6}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.57},{"name":"Shandong Luneng Taishan FC","price":4.65},{"name":"Draw","price":4.65}]},{"key":"spreads","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.93},{"name":"Shandong Luneng Taishan FC","price":1.89}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.54},{"name":"Shandong Luneng Taishan FC","price":4.78},{"name":"Draw","price":4.61}]},{"key":"spreads","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.85},{"name":"Shandong Luneng Taishan FC","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.91}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.51},{"name":"Shandong Luneng Taishan FC","price":4.65},{"name":"Draw","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.85},{"name":"Shandong Luneng Taishan FC","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":2.1},{"name":"Under","price":1.77}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.51},{"name":"Shandong Luneng Taishan FC","price":4.65},{"name":"Draw","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Chengdu Rongcheng FC","price":1.85},{"name":"Shandong Luneng Taishan FC","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":2.1},{"name":"Under","price":1.77}]}]}]', [{"name":"Chengdu Rongcheng FC","price":"1.53"},{"name":"Shandong Luneng Taishan FC","price":"4.83"},{"name":"Draw","price":"4.57"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-02T11:35:00Z', 'Qingdao West Coast FC', 'Henan FC', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.2},{"name":"Qingdao West Coast FC","price":2.95},{"name":"Draw","price":3.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.66},{"name":"Under","price":2.23}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.25},{"name":"Qingdao West Coast FC","price":2.95},{"name":"Draw","price":3.5}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.2},{"name":"Qingdao West Coast FC","price":3},{"name":"Draw","price":3.45}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.22},{"name":"Qingdao West Coast FC","price":3},{"name":"Draw","price":3.55}]},{"key":"spreads","outcomes":[{"name":"Henan FC","price":1.95},{"name":"Qingdao West Coast FC","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.17},{"name":"Qingdao West Coast FC","price":3.02},{"name":"Draw","price":3.54}]},{"key":"totals","outcomes":[{"name":"Over","price":1.88},{"name":"Under","price":1.87}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.16},{"name":"Qingdao West Coast FC","price":2.84},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Henan FC","price":1.91},{"name":"Qingdao West Coast FC","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.86},{"name":"Under","price":1.96}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Henan FC","price":2.16},{"name":"Qingdao West Coast FC","price":2.84},{"name":"Draw","price":3.25}]},{"key":"spreads","outcomes":[{"name":"Henan FC","price":1.91},{"name":"Qingdao West Coast FC","price":1.91}]},{"key":"totals","outcomes":[{"name":"Over","price":1.86},{"name":"Under","price":1.96}]}]}]', [{"name":"Henan FC","price":"2.19"},{"name":"Qingdao West Coast FC","price":"2.94"},{"name":"Draw","price":"3.48"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-02T12:00:00Z', 'Meizhou Hakka', 'Shanghai SIPG FC', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":5.5},{"name":"Shanghai SIPG FC","price":1.45},{"name":"Draw","price":5.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.02}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":7},{"name":"Shanghai SIPG FC","price":1.32},{"name":"Draw","price":5.3}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":7},{"name":"Shanghai SIPG FC","price":1.36},{"name":"Draw","price":5}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":7},{"name":"Shanghai SIPG FC","price":1.37},{"name":"Draw","price":5.15}]},{"key":"spreads","outcomes":[{"name":"Meizhou Hakka","price":1.83},{"name":"Shanghai SIPG FC","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":6.76},{"name":"Shanghai SIPG FC","price":1.35},{"name":"Draw","price":5.17}]},{"key":"spreads","outcomes":[{"name":"Meizhou Hakka","price":1.85},{"name":"Shanghai SIPG FC","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.89}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":6},{"name":"Shanghai SIPG FC","price":1.36},{"name":"Draw","price":4.7}]},{"key":"spreads","outcomes":[{"name":"Meizhou Hakka","price":1.86},{"name":"Shanghai SIPG FC","price":1.96}]},{"key":"totals","outcomes":[{"name":"Over","price":1.86},{"name":"Under","price":1.96}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Meizhou Hakka","price":6},{"name":"Shanghai SIPG FC","price":1.36},{"name":"Draw","price":4.7}]},{"key":"spreads","outcomes":[{"name":"Meizhou Hakka","price":1.86},{"name":"Shanghai SIPG FC","price":1.96}]},{"key":"totals","outcomes":[{"name":"Over","price":1.86},{"name":"Under","price":1.96}]}]}]', [{"name":"Meizhou Hakka","price":"6.47"},{"name":"Shanghai SIPG FC","price":"1.37"},{"name":"Draw","price":"5.06"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-03T11:00:00Z', 'Dalian Yingbo', 'Qingdao Hainiu FC', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Dalian Yingbo","price":1.76},{"name":"Qingdao Hainiu FC","price":4.4},{"name":"Draw","price":3.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.85}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Dalian Yingbo","price":1.61},{"name":"Qingdao Hainiu FC","price":5.4},{"name":"Draw","price":3.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Dalian Yingbo","price":1.62},{"name":"Qingdao Hainiu FC","price":5.25},{"name":"Draw","price":3.75}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Dalian Yingbo","price":1.63},{"name":"Qingdao Hainiu FC","price":5.4},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Dalian Yingbo","price":1.82},{"name":"Qingdao Hainiu FC","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.98},{"name":"Under","price":1.85}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Dalian Yingbo","price":1.63},{"name":"Qingdao Hainiu FC","price":5.4},{"name":"Draw","price":3.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.85}]}]}]', [{"name":"Dalian Yingbo","price":"1.65"},{"name":"Qingdao Hainiu FC","price":"5.17"},{"name":"Draw","price":"3.81"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-03T11:35:00Z', 'Beijing FC', 'Tianjin Jinmen Tiger FC', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Beijing FC","price":1.4},{"name":"Tianjin Jinmen Tiger FC","price":7},{"name":"Draw","price":5.25}]},{"key":"totals","outcomes":[{"name":"Over","price":2.28},{"name":"Under","price":1.65}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Beijing FC","price":1.4},{"name":"Tianjin Jinmen Tiger FC","price":6.5},{"name":"Draw","price":4.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Beijing FC","price":1.38},{"name":"Tianjin Jinmen Tiger FC","price":6.5},{"name":"Draw","price":4.8}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Beijing FC","price":1.39},{"name":"Tianjin Jinmen Tiger FC","price":6.75},{"name":"Draw","price":4.95}]},{"key":"spreads","outcomes":[{"name":"Beijing FC","price":1.87},{"name":"Tianjin Jinmen Tiger FC","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Beijing FC","price":1.39},{"name":"Tianjin Jinmen Tiger FC","price":6.75},{"name":"Draw","price":4.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.89}]}]}]', [{"name":"Beijing FC","price":"1.39"},{"name":"Tianjin Jinmen Tiger FC","price":"6.70"},{"name":"Draw","price":"4.95"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-03T11:35:00Z', 'Wuhan Three Towns', 'Changchun Yatai', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Changchun Yatai","price":4.4},{"name":"Wuhan Three Towns","price":1.71},{"name":"Draw","price":3.9}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Changchun Yatai","price":4},{"name":"Wuhan Three Towns","price":1.74},{"name":"Draw","price":3.95}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Changchun Yatai","price":4.15},{"name":"Wuhan Three Towns","price":1.74},{"name":"Draw","price":4}]},{"key":"spreads","outcomes":[{"name":"Changchun Yatai","price":1.87},{"name":"Wuhan Three Towns","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Changchun Yatai","price":4.3},{"name":"Wuhan Three Towns","price":1.7},{"name":"Draw","price":4.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.57},{"name":"Under","price":2.38}]}]},{"key":"betus","title":"BetUS","markets":[{"key":"h2h","outcomes":[{"name":"Changchun Yatai","price":4.15},{"name":"Wuhan Three Towns","price":1.74},{"name":"Draw","price":4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.83},{"name":"Under","price":1.91}]}]}]', [{"name":"Changchun Yatai","price":"4.20"},{"name":"Wuhan Three Towns","price":"1.73"},{"name":"Draw","price":"4.03"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'CSL', 'soccer_china_superleague', 'Super League - China',
  '2025-08-03T12:00:00Z', 'Shenzhen Peng City FC', 'Zhejiang', '[{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Shenzhen Peng City FC","price":3.15},{"name":"Zhejiang","price":2.12},{"name":"Draw","price":3.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.76},{"name":"Under","price":2.07}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Shenzhen Peng City FC","price":3.3},{"name":"Zhejiang","price":2.05},{"name":"Draw","price":3.5}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Shenzhen Peng City FC","price":3.25},{"name":"Zhejiang","price":2.1},{"name":"Draw","price":3.4}]}]}]', [{"name":"Shenzhen Peng City FC","price":"3.23"},{"name":"Zhejiang","price":"2.09"},{"name":"Draw","price":"3.57"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-15T17:00:00Z', 'Girona', 'Rayo Vallecano', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Girona","price":2.3},{"name":"Rayo Vallecano","price":3.2},{"name":"Draw","price":3.2}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Girona","price":2.25},{"name":"Rayo Vallecano","price":2.95},{"name":"Draw","price":3.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Girona","price":2.07},{"name":"Rayo Vallecano","price":3.15},{"name":"Draw","price":3.1}]},{"key":"totals","outcomes":[{"name":"Over","price":2},{"name":"Under","price":1.7}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Girona","price":2.32},{"name":"Rayo Vallecano","price":3.2},{"name":"Draw","price":3.2}]},{"key":"spreads","outcomes":[{"name":"Girona","price":1.98},{"name":"Rayo Vallecano","price":1.85}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Girona","price":2.3},{"name":"Rayo Vallecano","price":3.1},{"name":"Draw","price":3.25}]}]}]', [{"name":"Girona","price":"2.25"},{"name":"Rayo Vallecano","price":"3.12"},{"name":"Draw","price":"3.17"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-15T19:30:00Z', 'Villarreal', 'Oviedo', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Oviedo","price":8.5},{"name":"Villarreal","price":1.32},{"name":"Draw","price":4.6}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Oviedo","price":7.5},{"name":"Villarreal","price":1.29},{"name":"Draw","price":4.25}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":1.87}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Oviedo","price":8.25},{"name":"Villarreal","price":1.38},{"name":"Draw","price":4.8}]},{"key":"spreads","outcomes":[{"name":"Oviedo","price":1.95},{"name":"Villarreal","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Oviedo","price":8.75},{"name":"Villarreal","price":1.36},{"name":"Draw","price":4.75}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Oviedo","price":8},{"name":"Villarreal","price":1.33},{"name":"Draw","price":4.3}]}]}]', [{"name":"Oviedo","price":"8.20"},{"name":"Villarreal","price":"1.34"},{"name":"Draw","price":"4.54"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-16T15:00:00Z', 'Alavés', 'Levante', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Alavés","price":2.15},{"name":"Levante","price":3.4},{"name":"Draw","price":3.2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Alavés","price":2.1},{"name":"Levante","price":3.3},{"name":"Draw","price":2.9}]},{"key":"totals","outcomes":[{"name":"Over","price":1.45},{"name":"Under","price":2.45}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Alavés","price":2.22},{"name":"Levante","price":3.65},{"name":"Draw","price":3.05}]},{"key":"spreads","outcomes":[{"name":"Alavés","price":1.87},{"name":"Levante","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Alavés","price":2.15},{"name":"Levante","price":3.3},{"name":"Draw","price":2.95}]}]}]', [{"name":"Alavés","price":"2.16"},{"name":"Levante","price":"3.41"},{"name":"Draw","price":"3.02"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-16T17:30:00Z', 'Mallorca', 'Barcelona', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Barcelona","price":1.56},{"name":"Mallorca","price":4.8},{"name":"Draw","price":3.95}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Barcelona","price":1.57},{"name":"Mallorca","price":5.4},{"name":"Draw","price":4.1}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Barcelona","price":1.41},{"name":"Mallorca","price":5.1},{"name":"Draw","price":4.2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.62},{"name":"Under","price":2.14}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Barcelona","price":1.6},{"name":"Mallorca","price":5.25},{"name":"Draw","price":4.2}]},{"key":"spreads","outcomes":[{"name":"Barcelona","price":2.02},{"name":"Mallorca","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Barcelona","price":1.61},{"name":"Mallorca","price":5.25},{"name":"Draw","price":4.2}]}]}]', [{"name":"Barcelona","price":"1.55"},{"name":"Mallorca","price":"5.16"},{"name":"Draw","price":"4.13"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-16T19:30:00Z', 'Valencia', 'Real Sociedad', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Real Sociedad","price":2.8},{"name":"Valencia","price":2.6},{"name":"Draw","price":2.75}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Real Sociedad","price":2.95},{"name":"Valencia","price":2.7},{"name":"Draw","price":2.8}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Real Sociedad","price":2.8},{"name":"Valencia","price":2.6},{"name":"Draw","price":2.75}]},{"key":"totals","outcomes":[{"name":"Over","price":1.6},{"name":"Under","price":2.17}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Real Sociedad","price":3},{"name":"Valencia","price":2.78},{"name":"Draw","price":2.76}]},{"key":"spreads","outcomes":[{"name":"Real Sociedad","price":2},{"name":"Valencia","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Real Sociedad","price":2.95},{"name":"Valencia","price":2.7},{"name":"Draw","price":2.9}]}]}]', [{"name":"Real Sociedad","price":"2.90"},{"name":"Valencia","price":"2.68"},{"name":"Draw","price":"2.79"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-17T15:00:00Z', 'Celta Vigo', 'Getafe', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Celta Vigo","price":1.56},{"name":"Getafe","price":5.5},{"name":"Draw","price":3.55}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Celta Vigo","price":1.59},{"name":"Getafe","price":6},{"name":"Draw","price":3.6}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Celta Vigo","price":1.67},{"name":"Getafe","price":4.5},{"name":"Draw","price":3.15}]},{"key":"totals","outcomes":[{"name":"Over","price":2.33},{"name":"Under","price":1.5}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Celta Vigo","price":1.63},{"name":"Getafe","price":6},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"Celta Vigo","price":1.82},{"name":"Getafe","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":2.05}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Celta Vigo","price":1.61},{"name":"Getafe","price":6.25},{"name":"Draw","price":3.7}]}]}]', [{"name":"Celta Vigo","price":"1.61"},{"name":"Getafe","price":"5.65"},{"name":"Draw","price":"3.53"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-17T17:30:00Z', 'Athletic Bilbao', 'Sevilla', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Athletic Bilbao","price":1.62},{"name":"Sevilla","price":4.9},{"name":"Draw","price":3.5}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Athletic Bilbao","price":1.61},{"name":"Sevilla","price":5.5},{"name":"Draw","price":3.5}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Athletic Bilbao","price":1.55},{"name":"Sevilla","price":4.9},{"name":"Draw","price":3.45}]},{"key":"totals","outcomes":[{"name":"Over","price":2.1},{"name":"Under","price":1.63}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Athletic Bilbao","price":1.65},{"name":"Sevilla","price":5.6},{"name":"Draw","price":3.7}]},{"key":"spreads","outcomes":[{"name":"Athletic Bilbao","price":1.85},{"name":"Sevilla","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.93},{"name":"Under","price":1.89}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Athletic Bilbao","price":1.69},{"name":"Sevilla","price":5.25},{"name":"Draw","price":3.6}]}]}]', [{"name":"Athletic Bilbao","price":"1.62"},{"name":"Sevilla","price":"5.23"},{"name":"Draw","price":"3.55"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-17T19:30:00Z', 'Espanyol', 'Atlético Madrid', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Madrid","price":1.48},{"name":"Espanyol","price":6},{"name":"Draw","price":3.8}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Madrid","price":1.48},{"name":"Espanyol","price":6.5},{"name":"Draw","price":3.9}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Madrid","price":1.51},{"name":"Espanyol","price":5},{"name":"Draw","price":3.5}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.67}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Atlético Madrid","price":1.52},{"name":"Espanyol","price":6.75},{"name":"Draw","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Atlético Madrid","price":1.89},{"name":"Espanyol","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]}]', [{"name":"Atlético Madrid","price":"1.50"},{"name":"Espanyol","price":"6.06"},{"name":"Draw","price":"3.82"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-18T19:00:00Z', 'Elche CF', 'Real Betis', '[{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Elche CF","price":3.4},{"name":"Real Betis","price":2},{"name":"Draw","price":3.2}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Elche CF","price":3.45},{"name":"Real Betis","price":1.94},{"name":"Draw","price":3.05}]},{"key":"totals","outcomes":[{"name":"Over","price":1.96},{"name":"Under","price":1.72}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Elche CF","price":3.6},{"name":"Real Betis","price":2.1},{"name":"Draw","price":3.3}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Elche CF","price":3.65},{"name":"Real Betis","price":2.07},{"name":"Draw","price":3.4}]},{"key":"spreads","outcomes":[{"name":"Elche CF","price":2.08},{"name":"Real Betis","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":2.05},{"name":"Under","price":1.8}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Elche CF","price":3.5},{"name":"Real Betis","price":2.1},{"name":"Draw","price":3.4}]}]}]', [{"name":"Elche CF","price":"3.52"},{"name":"Real Betis","price":"2.04"},{"name":"Draw","price":"3.27"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'LALIGA', 'soccer_spain_la_liga', 'La Liga - Spain',
  '2025-08-19T19:00:00Z', 'Real Madrid', 'CA Osasuna', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"CA Osasuna","price":10.5},{"name":"Real Madrid","price":1.21},{"name":"Draw","price":6}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"CA Osasuna","price":8.5},{"name":"Real Madrid","price":1.17},{"name":"Draw","price":5.4}]},{"key":"totals","outcomes":[{"name":"Over","price":1.53},{"name":"Under","price":2.3}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"CA Osasuna","price":12},{"name":"Real Madrid","price":1.24},{"name":"Draw","price":6.25}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"CA Osasuna","price":11},{"name":"Real Madrid","price":1.24},{"name":"Draw","price":6.25}]},{"key":"spreads","outcomes":[{"name":"CA Osasuna","price":1.87},{"name":"Real Madrid","price":1.95}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]}]', [{"name":"CA Osasuna","price":"10.50"},{"name":"Real Madrid","price":"1.22"},{"name":"Draw","price":"5.97"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-22T18:30:00Z', 'Bayern Munich', 'RB Leipzig', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.29},{"name":"RB Leipzig","price":9.25},{"name":"Draw","price":6}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.28},{"name":"RB Leipzig","price":7},{"name":"Draw","price":5.5}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.23},{"name":"RB Leipzig","price":6.75},{"name":"Draw","price":5.25}]},{"key":"totals","outcomes":[{"name":"Over","price":1.79},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.24},{"name":"RB Leipzig","price":8.5},{"name":"Draw","price":6}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.27},{"name":"RB Leipzig","price":8.25},{"name":"Draw","price":6.15}]},{"key":"spreads","outcomes":[{"name":"Bayern Munich","price":1.93},{"name":"RB Leipzig","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.84},{"name":"Under","price":1.99}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.27},{"name":"RB Leipzig","price":8.25},{"name":"Draw","price":6.15}]},{"key":"spreads","outcomes":[{"name":"Bayern Munich","price":1.93},{"name":"RB Leipzig","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.84},{"name":"Under","price":1.99}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Bayern Munich","price":1.28},{"name":"RB Leipzig","price":8.5},{"name":"Draw","price":6.25}]},{"key":"spreads","outcomes":[{"name":"Bayern Munich","price":1.95},{"name":"RB Leipzig","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]}]', [{"name":"Bayern Munich","price":"1.27"},{"name":"RB Leipzig","price":"8.07"},{"name":"Draw","price":"5.90"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-23T13:30:00Z', '1. FC Heidenheim', 'VfL Wolfsburg', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.8},{"name":"VfL Wolfsburg","price":2.38},{"name":"Draw","price":3.5}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.7},{"name":"VfL Wolfsburg","price":2.3},{"name":"Draw","price":3.25}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.48},{"name":"VfL Wolfsburg","price":2.45},{"name":"Draw","price":3.15}]},{"key":"totals","outcomes":[{"name":"Over","price":1.68},{"name":"Under","price":2.06}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.9},{"name":"VfL Wolfsburg","price":2.3},{"name":"Draw","price":3.4}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.85},{"name":"VfL Wolfsburg","price":2.37},{"name":"Draw","price":3.38}]},{"key":"spreads","outcomes":[{"name":"1. FC Heidenheim","price":2.08},{"name":"VfL Wolfsburg","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.85},{"name":"VfL Wolfsburg","price":2.37},{"name":"Draw","price":3.38}]},{"key":"spreads","outcomes":[{"name":"1. FC Heidenheim","price":2.08},{"name":"VfL Wolfsburg","price":1.78}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Heidenheim","price":2.9},{"name":"VfL Wolfsburg","price":2.39},{"name":"Draw","price":3.45}]},{"key":"spreads","outcomes":[{"name":"1. FC Heidenheim","price":1.78},{"name":"VfL Wolfsburg","price":2.08}]},{"key":"totals","outcomes":[{"name":"Over","price":1.91},{"name":"Under","price":1.91}]}]}]', [{"name":"1. FC Heidenheim","price":"2.78"},{"name":"VfL Wolfsburg","price":"2.37"},{"name":"Draw","price":"3.36"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-23T13:30:00Z', 'SC Freiburg', 'Augsburg', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4.33},{"name":"SC Freiburg","price":1.8},{"name":"Draw","price":3.7}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4.2},{"name":"SC Freiburg","price":1.71},{"name":"Draw","price":3.6}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4},{"name":"SC Freiburg","price":1.65},{"name":"Draw","price":3.45}]},{"key":"totals","outcomes":[{"name":"Over","price":1.8},{"name":"Under","price":1.91}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4.5},{"name":"SC Freiburg","price":1.71},{"name":"Draw","price":3.6}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4.4},{"name":"SC Freiburg","price":1.74},{"name":"Draw","price":3.74}]},{"key":"spreads","outcomes":[{"name":"Augsburg","price":1.85},{"name":"SC Freiburg","price":1.97}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4.4},{"name":"SC Freiburg","price":1.74},{"name":"Draw","price":3.74}]},{"key":"spreads","outcomes":[{"name":"Augsburg","price":1.85},{"name":"SC Freiburg","price":1.97}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Augsburg","price":4.5},{"name":"SC Freiburg","price":1.76},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Augsburg","price":1.85},{"name":"SC Freiburg","price":1.98}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]}]', [{"name":"Augsburg","price":"4.33"},{"name":"SC Freiburg","price":"1.73"},{"name":"Draw","price":"3.66"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-23T13:30:00Z', 'Bayer Leverkusen', 'TSG Hoffenheim', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.43},{"name":"TSG Hoffenheim","price":6.5},{"name":"Draw","price":5}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.42},{"name":"TSG Hoffenheim","price":5.5},{"name":"Draw","price":4.6}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.38},{"name":"TSG Hoffenheim","price":5.3},{"name":"Draw","price":4.5}]},{"key":"totals","outcomes":[{"name":"Over","price":2.02},{"name":"Under","price":1.71}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.38},{"name":"TSG Hoffenheim","price":6.5},{"name":"Draw","price":4.8}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.43},{"name":"TSG Hoffenheim","price":5.86},{"name":"Draw","price":4.97}]},{"key":"spreads","outcomes":[{"name":"Bayer Leverkusen","price":1.94},{"name":"TSG Hoffenheim","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.43},{"name":"TSG Hoffenheim","price":5.86},{"name":"Draw","price":4.97}]},{"key":"spreads","outcomes":[{"name":"Bayer Leverkusen","price":1.94},{"name":"TSG Hoffenheim","price":1.88}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Bayer Leverkusen","price":1.46},{"name":"TSG Hoffenheim","price":5.75},{"name":"Draw","price":5}]},{"key":"spreads","outcomes":[{"name":"Bayer Leverkusen","price":1.95},{"name":"TSG Hoffenheim","price":1.87}]},{"key":"totals","outcomes":[{"name":"Over","price":1.87},{"name":"Under","price":1.95}]}]}]', [{"name":"Bayer Leverkusen","price":"1.42"},{"name":"TSG Hoffenheim","price":"5.90"},{"name":"Draw","price":"4.83"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-23T13:30:00Z', 'Eintracht Frankfurt', 'Werder Bremen', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.87},{"name":"Werder Bremen","price":3.8},{"name":"Draw","price":3.8}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.77},{"name":"Werder Bremen","price":3.65},{"name":"Draw","price":3.7}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.73},{"name":"Werder Bremen","price":3.55},{"name":"Draw","price":3.55}]},{"key":"totals","outcomes":[{"name":"Over","price":1.54},{"name":"Under","price":2.3}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.77},{"name":"Werder Bremen","price":4},{"name":"Draw","price":3.8}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.81},{"name":"Werder Bremen","price":3.84},{"name":"Draw","price":3.88}]},{"key":"spreads","outcomes":[{"name":"Eintracht Frankfurt","price":1.81},{"name":"Werder Bremen","price":2.03}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.88}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.81},{"name":"Werder Bremen","price":3.84},{"name":"Draw","price":3.88}]},{"key":"spreads","outcomes":[{"name":"Eintracht Frankfurt","price":1.81},{"name":"Werder Bremen","price":2.03}]},{"key":"totals","outcomes":[{"name":"Over","price":1.94},{"name":"Under","price":1.88}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Eintracht Frankfurt","price":1.84},{"name":"Werder Bremen","price":3.9},{"name":"Draw","price":3.95}]},{"key":"spreads","outcomes":[{"name":"Eintracht Frankfurt","price":1.83},{"name":"Werder Bremen","price":2}]},{"key":"totals","outcomes":[{"name":"Over","price":1.95},{"name":"Under","price":1.87}]}]}]', [{"name":"Eintracht Frankfurt","price":"1.80"},{"name":"Werder Bremen","price":"3.80"},{"name":"Draw","price":"3.79"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-23T13:30:00Z', 'Union Berlin', 'VfB Stuttgart', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":3.25},{"name":"VfB Stuttgart","price":2.1},{"name":"Draw","price":3.7}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":3.15},{"name":"VfB Stuttgart","price":2},{"name":"Draw","price":3.45}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":2.9},{"name":"VfB Stuttgart","price":2.06},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.65},{"name":"Under","price":2.12}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":3.4},{"name":"VfB Stuttgart","price":2.05},{"name":"Draw","price":3.6}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":3.3},{"name":"VfB Stuttgart","price":2.04},{"name":"Draw","price":3.61}]},{"key":"spreads","outcomes":[{"name":"Union Berlin","price":2.04},{"name":"VfB Stuttgart","price":1.81}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":3.3},{"name":"VfB Stuttgart","price":2.04},{"name":"Draw","price":3.61}]},{"key":"spreads","outcomes":[{"name":"Union Berlin","price":2.04},{"name":"VfB Stuttgart","price":1.81}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Union Berlin","price":3.35},{"name":"VfB Stuttgart","price":2.08},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"Union Berlin","price":2.05},{"name":"VfB Stuttgart","price":1.8}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]}]', [{"name":"Union Berlin","price":"3.24"},{"name":"VfB Stuttgart","price":"2.05"},{"name":"Draw","price":"3.56"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-23T16:30:00Z', 'FC St. Pauli', 'Borussia Dortmund', '[{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.74},{"name":"FC St. Pauli","price":4.4},{"name":"Draw","price":3.9}]}]},{"key":"draftkings","title":"DraftKings","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.67},{"name":"FC St. Pauli","price":4.2},{"name":"Draw","price":3.85}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.56},{"name":"FC St. Pauli","price":4.25},{"name":"Draw","price":3.65}]},{"key":"totals","outcomes":[{"name":"Over","price":1.66},{"name":"Under","price":2.1}]}]},{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.69},{"name":"FC St. Pauli","price":4.5},{"name":"Draw","price":3.9}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.69},{"name":"FC St. Pauli","price":4.38},{"name":"Draw","price":4}]},{"key":"spreads","outcomes":[{"name":"Borussia Dortmund","price":1.9},{"name":"FC St. Pauli","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.69},{"name":"FC St. Pauli","price":4.38},{"name":"Draw","price":4}]},{"key":"spreads","outcomes":[{"name":"Borussia Dortmund","price":1.9},{"name":"FC St. Pauli","price":1.92}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Dortmund","price":1.7},{"name":"FC St. Pauli","price":4.5},{"name":"Draw","price":4.1}]},{"key":"spreads","outcomes":[{"name":"Borussia Dortmund","price":1.89},{"name":"FC St. Pauli","price":1.93}]},{"key":"totals","outcomes":[{"name":"Over","price":1.89},{"name":"Under","price":1.93}]}]}]', [{"name":"Borussia Dortmund","price":"1.68"},{"name":"FC St. Pauli","price":"4.37"},{"name":"Draw","price":"3.91"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-24T13:30:00Z', 'FSV Mainz 05', '1. FC Köln', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Köln","price":4.3},{"name":"FSV Mainz 05","price":1.77},{"name":"Draw","price":3.6}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Köln","price":4.3},{"name":"FSV Mainz 05","price":1.78},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"1. FC Köln","price":1.81},{"name":"FSV Mainz 05","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.03}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Köln","price":4.3},{"name":"FSV Mainz 05","price":1.78},{"name":"Draw","price":3.65}]},{"key":"spreads","outcomes":[{"name":"1. FC Köln","price":1.81},{"name":"FSV Mainz 05","price":2.04}]},{"key":"totals","outcomes":[{"name":"Over","price":1.81},{"name":"Under","price":2.03}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Köln","price":4.3},{"name":"FSV Mainz 05","price":1.79},{"name":"Draw","price":3.75}]},{"key":"spreads","outcomes":[{"name":"1. FC Köln","price":1.82},{"name":"FSV Mainz 05","price":2.02}]},{"key":"totals","outcomes":[{"name":"Over","price":1.82},{"name":"Under","price":2.02}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Köln","price":4.1},{"name":"FSV Mainz 05","price":1.85},{"name":"Draw","price":3.7}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"1. FC Köln","price":3.55},{"name":"FSV Mainz 05","price":1.8},{"name":"Draw","price":3.3}]},{"key":"totals","outcomes":[{"name":"Over","price":1.79},{"name":"Under","price":1.92}]}]}]', [{"name":"1. FC Köln","price":"4.14"},{"name":"FSV Mainz 05","price":"1.80"},{"name":"Draw","price":"3.61"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();


INSERT INTO "OddsCaches" (
  "id", "mainCategory", "subCategory", "sportKey", "sportTitle", 
  "commenceTime", "homeTeam", "awayTeam", "bookmakers", "officialOdds", 
  "lastUpdated", "market", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'soccer', 'BUNDESLIGA', 'soccer_germany_bundesliga', 'Bundesliga - Germany',
  '2025-08-24T15:30:00Z', 'Borussia Monchengladbach', 'Hamburger SV', '[{"key":"fanduel","title":"FanDuel","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Monchengladbach","price":2.05},{"name":"Hamburger SV","price":3.3},{"name":"Draw","price":3.7}]}]},{"key":"lowvig","title":"LowVig.ag","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Monchengladbach","price":2},{"name":"Hamburger SV","price":3.25},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Borussia Monchengladbach","price":2},{"name":"Hamburger SV","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.97}]}]},{"key":"betonlineag","title":"BetOnline.ag","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Monchengladbach","price":2},{"name":"Hamburger SV","price":3.25},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Borussia Monchengladbach","price":2},{"name":"Hamburger SV","price":1.83}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.97}]}]},{"key":"bovada","title":"Bovada","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Monchengladbach","price":2.03},{"name":"Hamburger SV","price":3.35},{"name":"Draw","price":3.8}]},{"key":"spreads","outcomes":[{"name":"Borussia Monchengladbach","price":2.02},{"name":"Hamburger SV","price":1.82}]},{"key":"totals","outcomes":[{"name":"Over","price":1.85},{"name":"Under","price":1.98}]}]},{"key":"betmgm","title":"BetMGM","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Monchengladbach","price":2},{"name":"Hamburger SV","price":3.4},{"name":"Draw","price":3.8}]}]},{"key":"betrivers","title":"BetRivers","markets":[{"key":"h2h","outcomes":[{"name":"Borussia Monchengladbach","price":1.96},{"name":"Hamburger SV","price":3.05},{"name":"Draw","price":3.45}]},{"key":"totals","outcomes":[{"name":"Over","price":2.28},{"name":"Under","price":1.56}]}]}]', [{"name":"Borussia Monchengladbach","price":"2.01"},{"name":"Hamburger SV","price":"3.27"},{"name":"Draw","price":"3.73"}],
  '2025-08-01T04:59:50.964Z', 'h2h', NOW(), NOW()
)
ON CONFLICT ("sportKey", "homeTeam", "awayTeam", "commenceTime") 
DO UPDATE SET
  "bookmakers" = EXCLUDED."bookmakers",
  "officialOdds" = EXCLUDED."officialOdds",
  "lastUpdated" = EXCLUDED."lastUpdated",
  "updatedAt" = NOW();

COMMIT;

-- 실행 결과 확인
SELECT 
  "mainCategory", 
  "subCategory", 
  COUNT(*) as game_count,
  MIN("lastUpdated") as earliest_update,
  MAX("lastUpdated") as latest_update
FROM "OddsCaches" 
WHERE "lastUpdated" >= '2025-08-01'
GROUP BY "mainCategory", "subCategory"
ORDER BY game_count DESC;
