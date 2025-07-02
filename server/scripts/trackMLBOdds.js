import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.ODDS_API_KEY;
const SPORT_KEY = 'baseball_mlb';
const REGIONS = 'us';
const MARKETS = 'h2h'; // head to head (승패)
const ODDS_FORMAT = 'decimal';

// 팀명 정규화 함수
function normalizeTeamName(teamName) {
    const normalizations = {
        'Toronto Blue Jays': ['Toronto', 'Blue Jays', 'Jays', 'TOR'],
        'New York Yankees': ['Yankees', 'NY Yankees', 'NYY', 'New York']
    };
    
    for (const [standard, variations] of Object.entries(normalizations)) {
        if (variations.some(variation => 
            teamName.toLowerCase().includes(variation.toLowerCase()) ||
            variation.toLowerCase().includes(teamName.toLowerCase())
        )) {
            return standard;
        }
    }
    return teamName;
}

// 배당율 데이터를 파일에 저장
function saveOddsData(data) {
    const timestamp = new Date().toISOString();
    const filename = `mlb_odds_tracking_${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(process.cwd(), 'logs', filename);
    
    let existingData = [];
    if (fs.existsSync(filepath)) {
        try {
            existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (error) {
            console.log('기존 파일 읽기 실패, 새로 생성합니다.');
        }
    }
    
    existingData.push({
        timestamp,
        ...data
    });
    
    fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2));
    console.log(`📊 배당율 데이터 저장됨: ${filepath}`);
}

// MLB 배당율 가져오기
async function fetchMLBOdds() {
    try {
        console.log(`🔄 [${new Date().toLocaleString('ko-KR')}] MLB 배당율 수집 시작...`);
        
        const url = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS}&oddsFormat=${ODDS_FORMAT}&dateFormat=iso`;
        
        const response = await axios.get(url);
        const data = response.data;
        console.log(`📡 API 응답: ${data.length}개 경기 발견`);
        
        // 토론토 블루제이스 vs 뉴욕 양키스 경기 찾기
        const targetGame = data.find(game => {
            const homeTeam = normalizeTeamName(game.home_team);
            const awayTeam = normalizeTeamName(game.away_team);
            
            return (
                (homeTeam === 'Toronto Blue Jays' && awayTeam === 'New York Yankees') ||
                (homeTeam === 'New York Yankees' && awayTeam === 'Toronto Blue Jays')
            );
        });
        
        if (!targetGame) {
            console.log('❌ 토론토 블루제이스 vs 뉴욕 양키스 경기를 찾을 수 없습니다.');
            console.log('📋 현재 available 경기들:');
            data.slice(0, 5).forEach(game => {
                console.log(`   ${game.away_team} @ ${game.home_team} (${new Date(game.commence_time).toLocaleString('ko-KR')})`);
            });
            return null;
        }
        
        console.log(`✅ 경기 발견: ${targetGame.away_team} @ ${targetGame.home_team}`);
        console.log(`🕐 경기 시간: ${new Date(targetGame.commence_time).toLocaleString('ko-KR')}`);
        
        // 배당율 추출
        const oddsData = {
            gameId: targetGame.id,
            homeTeam: targetGame.home_team,
            awayTeam: targetGame.away_team,
            commenceTime: targetGame.commence_time,
            bookmakers: []
        };
        
        targetGame.bookmakers.forEach(bookmaker => {
            const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h');
            if (h2hMarket) {
                const homeOdds = h2hMarket.outcomes.find(outcome => outcome.name === targetGame.home_team);
                const awayOdds = h2hMarket.outcomes.find(outcome => outcome.name === targetGame.away_team);
                
                oddsData.bookmakers.push({
                    name: bookmaker.title,
                    homeOdds: homeOdds ? homeOdds.price : null,
                    awayOdds: awayOdds ? awayOdds.price : null,
                    lastUpdate: bookmaker.last_update
                });
            }
        });
        
        // 평균 배당율 계산
        const homeOddsArray = oddsData.bookmakers.map(b => b.homeOdds).filter(o => o !== null);
        const awayOddsArray = oddsData.bookmakers.map(b => b.awayOdds).filter(o => o !== null);
        
        oddsData.averageOdds = {
            home: homeOddsArray.length > 0 ? (homeOddsArray.reduce((a, b) => a + b, 0) / homeOddsArray.length).toFixed(3) : null,
            away: awayOddsArray.length > 0 ? (awayOddsArray.reduce((a, b) => a + b, 0) / awayOddsArray.length).toFixed(3) : null
        };
        
        console.log(`📊 평균 배당율:`);
        console.log(`   ${targetGame.home_team}: ${oddsData.averageOdds.home}`);
        console.log(`   ${targetGame.away_team}: ${oddsData.averageOdds.away}`);
        console.log(`📈 북메이커 수: ${oddsData.bookmakers.length}개`);
        
        // 데이터 저장
        saveOddsData(oddsData);
        
        return oddsData;
        
    } catch (error) {
        console.error('❌ 배당율 수집 중 오류:', error);
        
        // 오류도 기록
        saveOddsData({
            error: error.message,
            gameId: null,
            homeTeam: 'Toronto Blue Jays',
            awayTeam: 'New York Yankees'
        });
        
        return null;
    }
}

// 매시간 실행을 위한 스케줄러
function startHourlyTracking() {
    console.log('🚀 MLB 배당율 추적 시작');
    console.log('📅 대상 경기: 토론토 블루제이스 vs 뉴욕 양키스');
    console.log('⏰ 매시간 정각에 배당율 수집');
    console.log('📁 저장 위치: server/logs/mlb_odds_tracking_YYYY-MM-DD.json');
    
    // 즉시 한 번 실행
    fetchMLBOdds();
    
    // 매시간 정각에 실행 (3600000ms = 1시간)
    setInterval(() => {
        fetchMLBOdds();
    }, 3600000);
    
    console.log('✅ 스케줄러 설정 완료. Ctrl+C로 종료할 수 있습니다.');
}

// 단일 실행 모드
if (process.argv.includes('--once')) {
    console.log('🔍 단일 실행 모드: 현재 배당율만 확인');
    fetchMLBOdds().then(() => {
        process.exit(0);
    });
} else {
    // 연속 추적 모드
    startHourlyTracking();
}

// 종료 시그널 처리
process.on('SIGINT', () => {
    console.log('\n⏹️  배당율 추적을 종료합니다.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  배당율 추적을 종료합니다.');
    process.exit(0);
}); 