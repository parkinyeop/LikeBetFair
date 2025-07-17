import GameResult from '../models/gameResultModel.js';

// 팀명 기반 정확한 리그 매핑
const teamLeagueMap = {
  // K리그1 팀들
  'FC Seoul': { main: 'soccer', sub: 'KLEAGUE1' },
  'Ulsan HD': { main: 'soccer', sub: 'KLEAGUE1' },
  'Jeonbuk Hyundai Motors': { main: 'soccer', sub: 'KLEAGUE1' },
  'Pohang Steelers': { main: 'soccer', sub: 'KLEAGUE1' },
  'Daegu FC': { main: 'soccer', sub: 'KLEAGUE1' },
  'Gangwon FC': { main: 'soccer', sub: 'KLEAGUE1' },
  'Gwangju FC': { main: 'soccer', sub: 'KLEAGUE1' },
  'Incheon United': { main: 'soccer', sub: 'KLEAGUE1' },
  'Jeju United': { main: 'soccer', sub: 'KLEAGUE1' },
  'Suwon FC': { main: 'soccer', sub: 'KLEAGUE1' },
  'Seoul E-Land': { main: 'soccer', sub: 'KLEAGUE1' },
  'Gimcheon Sangmu': { main: 'soccer', sub: 'KLEAGUE1' },



  // KBO 팀들
  'LG Twins': { main: 'baseball', sub: 'KBO' },
  'KT Wiz': { main: 'baseball', sub: 'KBO' },
  'SSG Landers': { main: 'baseball', sub: 'KBO' },
  'NC Dinos': { main: 'baseball', sub: 'KBO' },
  'Doosan Bears': { main: 'baseball', sub: 'KBO' },
  'Kia Tigers': { main: 'baseball', sub: 'KBO' },
  'Samsung Lions': { main: 'baseball', sub: 'KBO' },
  'Lotte Giants': { main: 'baseball', sub: 'KBO' },
  'Hanwha Eagles': { main: 'baseball', sub: 'KBO' },
  'Kiwoom Heroes': { main: 'baseball', sub: 'KBO' },

  // MLB 팀들
  'New York Yankees': { main: 'baseball', sub: 'MLB' },
  'Los Angeles Dodgers': { main: 'baseball', sub: 'MLB' },
  'Boston Red Sox': { main: 'baseball', sub: 'MLB' },
  'Chicago Cubs': { main: 'baseball', sub: 'MLB' },
  'San Francisco Giants': { main: 'baseball', sub: 'MLB' },
  'Philadelphia Phillies': { main: 'baseball', sub: 'MLB' },
  'Atlanta Braves': { main: 'baseball', sub: 'MLB' },
  'Miami Marlins': { main: 'baseball', sub: 'MLB' },
  'Washington Nationals': { main: 'baseball', sub: 'MLB' },
  'Pittsburgh Pirates': { main: 'baseball', sub: 'MLB' },
  'Cincinnati Reds': { main: 'baseball', sub: 'MLB' },
  'Milwaukee Brewers': { main: 'baseball', sub: 'MLB' },
  'St. Louis Cardinals': { main: 'baseball', sub: 'MLB' },
  'Chicago White Sox': { main: 'baseball', sub: 'MLB' },
  'Detroit Tigers': { main: 'baseball', sub: 'MLB' },
  'Cleveland Guardians': { main: 'baseball', sub: 'MLB' },
  'Kansas City Royals': { main: 'baseball', sub: 'MLB' },
  'Minnesota Twins': { main: 'baseball', sub: 'MLB' },
  'Texas Rangers': { main: 'baseball', sub: 'MLB' },
  'Los Angeles Angels': { main: 'baseball', sub: 'MLB' },
  'Seattle Mariners': { main: 'baseball', sub: 'MLB' },
  'Houston Astros': { main: 'baseball', sub: 'MLB' },
  'Athletics': { main: 'baseball', sub: 'MLB' },
  'San Diego Padres': { main: 'baseball', sub: 'MLB' },
  'Colorado Rockies': { main: 'baseball', sub: 'MLB' },
  'Arizona Diamondbacks': { main: 'baseball', sub: 'MLB' },
  'Tampa Bay Rays': { main: 'baseball', sub: 'MLB' },
  'Baltimore Orioles': { main: 'baseball', sub: 'MLB' },
  'Toronto Blue Jays': { main: 'baseball', sub: 'MLB' },
  'New York Mets': { main: 'baseball', sub: 'MLB' },

  // NBA 팀들
  'Los Angeles Lakers': { main: 'basketball', sub: 'NBA' },
  'Golden State Warriors': { main: 'basketball', sub: 'NBA' },
  'Boston Celtics': { main: 'basketball', sub: 'NBA' },
  'Miami Heat': { main: 'basketball', sub: 'NBA' },
  'Philadelphia 76ers': { main: 'basketball', sub: 'NBA' },
  'Oklahoma City Thunder': { main: 'basketball', sub: 'NBA' },

  // KBL 팀들 (Korean Basketball League)
  'Seoul SK Knights': { main: 'basketball', sub: 'KBL' },
  'Changwon LG Sakers': { main: 'basketball', sub: 'KBL' },
  'Ulsan Hyundai Mobis Phoebus': { main: 'basketball', sub: 'KBL' },
  'Suwon KT Sonicboom': { main: 'basketball', sub: 'KBL' },
  'Seoul Samsung Thunders': { main: 'basketball', sub: 'KBL' },
  'Jeonju KCC Egis': { main: 'basketball', sub: 'KBL' },
  'Wonju DB Promy': { main: 'basketball', sub: 'KBL' },
  'Daegu KOGAS Pegasus': { main: 'basketball', sub: 'KBL' },
  'Anyang JungKwanJang': { main: 'basketball', sub: 'KBL' },
  'Goyang Sono': { main: 'basketball', sub: 'KBL' },

  // MLS 팀들
  'Los Angeles FC': { main: 'soccer', sub: 'MLS' },
  'Seattle Sounders FC': { main: 'soccer', sub: 'MLS' },
  'New York City FC': { main: 'soccer', sub: 'MLS' },
  'Atlanta United': { main: 'soccer', sub: 'MLS' },
  'Inter Miami': { main: 'soccer', sub: 'MLS' },
  'Columbus Crew': { main: 'soccer', sub: 'MLS' },
  'Toronto FC': { main: 'soccer', sub: 'MLS' },
  'Portland Timbers': { main: 'soccer', sub: 'MLS' },
  'Chicago Fire': { main: 'soccer', sub: 'MLS' },
  'FC Dallas': { main: 'soccer', sub: 'MLS' },
  'Vancouver Whitecaps': { main: 'soccer', sub: 'MLS' },
  'Philadelphia Union': { main: 'soccer', sub: 'MLS' },
  'New England Revolution': { main: 'soccer', sub: 'MLS' },

  // 라리가 팀들
  'Real Madrid': { main: 'soccer', sub: 'LALIGA' },
  'Barcelona': { main: 'soccer', sub: 'LALIGA' },
  'Atletico Madrid': { main: 'soccer', sub: 'LALIGA' },
  'Ath Madrid': { main: 'soccer', sub: 'LALIGA' },
  'Athletic Bilbao': { main: 'soccer', sub: 'LALIGA' },
  'Ath Bilbao': { main: 'soccer', sub: 'LALIGA' },
  'Real Sociedad': { main: 'soccer', sub: 'LALIGA' },
  'Villarreal': { main: 'soccer', sub: 'LALIGA' },
  'Real Betis': { main: 'soccer', sub: 'LALIGA' },
  'Sevilla': { main: 'soccer', sub: 'LALIGA' },
  'Valencia': { main: 'soccer', sub: 'LALIGA' },
  'Celta Vigo': { main: 'soccer', sub: 'LALIGA' },
  'Getafe': { main: 'soccer', sub: 'LALIGA' },
  'Osasuna': { main: 'soccer', sub: 'LALIGA' },
  'Rayo Vallecano': { main: 'soccer', sub: 'LALIGA' },
  'Mallorca': { main: 'soccer', sub: 'LALIGA' },
  'Las Palmas': { main: 'soccer', sub: 'LALIGA' },
  'Girona': { main: 'soccer', sub: 'LALIGA' },
  'Alaves': { main: 'soccer', sub: 'LALIGA' },
  'Espanyol': { main: 'soccer', sub: 'LALIGA' },
  'Cadiz': { main: 'soccer', sub: 'LALIGA' },
  'Granada': { main: 'soccer', sub: 'LALIGA' },
  'Almeria': { main: 'soccer', sub: 'LALIGA' },
  'Leganes': { main: 'soccer', sub: 'LALIGA' },
  'Valladolid': { main: 'soccer', sub: 'LALIGA' },

  // 분데스리가 팀들
  'Bayern Munich': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Borussia Dortmund': { main: 'soccer', sub: 'BUNDESLIGA' },
  'RB Leipzig': { main: 'soccer', sub: 'BUNDESLIGA' },
  'RasenBallsport Leipzig': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Bayer Leverkusen': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Eintracht Frankfurt': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Ein Frankfurt': { main: 'soccer', sub: 'BUNDESLIGA' },
  'VfB Stuttgart': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Borussia Mönchengladbach': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Mönchengladbach': { main: 'soccer', sub: 'BUNDESLIGA' },
  'VfL Wolfsburg': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Freiburg': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Hoffenheim': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Union Berlin': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Werder Bremen': { main: 'soccer', sub: 'BUNDESLIGA' },
  'FC Augsburg': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Mainz': { main: 'soccer', sub: 'BUNDESLIGA' },
  'VfL Bochum': { main: 'soccer', sub: 'BUNDESLIGA' },
  'FC Koln': { main: 'soccer', sub: 'BUNDESLIGA' },
  'FC Heidenheim': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Holstein Kiel': { main: 'soccer', sub: 'BUNDESLIGA' },
  'St Pauli': { main: 'soccer', sub: 'BUNDESLIGA' },
  'Darmstadt': { main: 'soccer', sub: 'BUNDESLIGA' },

  // 아르헨티나 프리메라 디비시온 팀들
  'River Plate': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Boca Juniors': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Racing Club': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Independiente': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'San Lorenzo': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Estudiantes de La Plata': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Vélez Sarsfield': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Talleres de Córdoba': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Lanús': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Argentinos Juniors': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Defensa y Justicia': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Atlético Tucumán': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Gimnasia y Esgrima de La Plata': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Newell\'s Old Boys': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Rosario Central': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Huracán': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Tigre': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Unión': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Godoy Cruz': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Platense': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Banfield': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Instituto': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Belgrano': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Central Córdoba de Santiago del Estero': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Deportivo Riestra': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Independiente Rivadavia': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Sarmiento': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Barracas Central': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'Aldosivi': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },
  'San Martín de San Juan': { main: 'soccer', sub: 'ARGENTINA_PRIMERA' },

  // 브라질 세리에 A 팀들
  'Palmeiras': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Flamengo': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Atlético Mineiro': { main: 'soccer', sub: 'BRASILEIRAO' },
  'São Paulo': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Fluminense': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Corinthians': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Internacional': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Grêmio': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Santos': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Vasco da Gama': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Botafogo': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Cruzeiro': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Bahia': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Fortaleza': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Bragantino': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Athletico Paranaense': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Ceará': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Sport Club do Recife': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Vitória': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Juventude': { main: 'soccer', sub: 'BRASILEIRAO' },
  'Mirassol': { main: 'soccer', sub: 'BRASILEIRAO' },

  // 중국 슈퍼리그 팀들
  'Shanghai Port': { main: 'soccer', sub: 'CSL' },
  'Shanghai Shenhua': { main: 'soccer', sub: 'CSL' },
  'Beijing Guoan': { main: 'soccer', sub: 'CSL' },
  'Shandong Taishan': { main: 'soccer', sub: 'CSL' },
  'Guangzhou FC': { main: 'soccer', sub: 'CSL' },
  'Tianjin Jinmen Tiger': { main: 'soccer', sub: 'CSL' },
  'Changchun Yatai': { main: 'soccer', sub: 'CSL' },
  'Dalian Yingbo': { main: 'soccer', sub: 'CSL' },
  'Henan FC': { main: 'soccer', sub: 'CSL' },
  'Wuhan Three Towns': { main: 'soccer', sub: 'CSL' },
  'Chengdu Rongcheng': { main: 'soccer', sub: 'CSL' },
  'Zhejiang Professional': { main: 'soccer', sub: 'CSL' },
  'Shenzhen Peng City': { main: 'soccer', sub: 'CSL' },
  'Meizhou Hakka': { main: 'soccer', sub: 'CSL' },
  'Qingdao Hainiu': { main: 'soccer', sub: 'CSL' },
  'Qingdao West Coast': { main: 'soccer', sub: 'CSL' },
  'Yunnan Yukun': { main: 'soccer', sub: 'CSL' },

  // NFL 팀들 (National Football League)
  // NFC East
  'Philadelphia Eagles': { main: 'american_football', sub: 'NFL' },
  'Dallas Cowboys': { main: 'american_football', sub: 'NFL' },
  'New York Giants': { main: 'american_football', sub: 'NFL' },
  'Washington Commanders': { main: 'american_football', sub: 'NFL' },
  
  // NFC North
  'Detroit Lions': { main: 'american_football', sub: 'NFL' },
  'Green Bay Packers': { main: 'american_football', sub: 'NFL' },
  'Chicago Bears': { main: 'american_football', sub: 'NFL' },
  'Minnesota Vikings': { main: 'american_football', sub: 'NFL' },
  
  // NFC South
  'Atlanta Falcons': { main: 'american_football', sub: 'NFL' },
  'New Orleans Saints': { main: 'american_football', sub: 'NFL' },
  'Tampa Bay Buccaneers': { main: 'american_football', sub: 'NFL' },
  'Carolina Panthers': { main: 'american_football', sub: 'NFL' },
  
  // NFC West
  'San Francisco 49ers': { main: 'american_football', sub: 'NFL' },
  'Seattle Seahawks': { main: 'american_football', sub: 'NFL' },
  'Los Angeles Rams': { main: 'american_football', sub: 'NFL' },
  'Arizona Cardinals': { main: 'american_football', sub: 'NFL' },
  
  // AFC East
  'Buffalo Bills': { main: 'american_football', sub: 'NFL' },
  'Miami Dolphins': { main: 'american_football', sub: 'NFL' },
  'New England Patriots': { main: 'american_football', sub: 'NFL' },
  'New York Jets': { main: 'american_football', sub: 'NFL' },
  
  // AFC North
  'Baltimore Ravens': { main: 'american_football', sub: 'NFL' },
  'Pittsburgh Steelers': { main: 'american_football', sub: 'NFL' },
  'Cleveland Browns': { main: 'american_football', sub: 'NFL' },
  'Cincinnati Bengals': { main: 'american_football', sub: 'NFL' },
  
  // AFC South
  'Houston Texans': { main: 'american_football', sub: 'NFL' },
  'Indianapolis Colts': { main: 'american_football', sub: 'NFL' },
  'Tennessee Titans': { main: 'american_football', sub: 'NFL' },
  'Jacksonville Jaguars': { main: 'american_football', sub: 'NFL' },
  
  // AFC West
  'Kansas City Chiefs': { main: 'american_football', sub: 'NFL' },
  'Las Vegas Raiders': { main: 'american_football', sub: 'NFL' },
  'Los Angeles Chargers': { main: 'american_football', sub: 'NFL' },
  'Denver Broncos': { main: 'american_football', sub: 'NFL' },
};

// 일본 야구팀들 (NPB)
const npbTeams = [
  'Yomiuri Giants', 'Hanshin Tigers', 'Chunichi Dragons', 'Hiroshima Toyo Carp',
  'Tokyo Yakult Swallows', 'Yokohama DeNA BayStars', 'Fukuoka SoftBank Hawks',
  'Chiba Lotte Marines', 'Tohoku Rakuten Golden Eagles', 'Saitama Seibu Lions',
  'Orix Buffaloes', 'Hokkaido Nippon-Ham Fighters'
];

// 대만 야구팀들 (CPBL)
const cpblTeams = [
  'Uni-President Lions', 'CTBC Brothers', 'Fubon Guardians', 'Rakuten Monkeys',
  'TSG Hawks', 'Wei Chuan Dragons'
];

// 팀명으로 리그 판별하는 함수
function determineLeagueByTeam(homeTeam, awayTeam) {
  // 정확한 매핑이 있는 경우
  if (teamLeagueMap[homeTeam]) return teamLeagueMap[homeTeam];
  if (teamLeagueMap[awayTeam]) return teamLeagueMap[awayTeam];
  
  // NPB (일본 야구)
  if (npbTeams.includes(homeTeam) || npbTeams.includes(awayTeam)) {
    return { main: 'baseball', sub: 'NPB' };
  }
  
  // CPBL (대만 야구)
  if (cpblTeams.includes(homeTeam) || cpblTeams.includes(awayTeam)) {
    return { main: 'baseball', sub: 'CPBL' };
  }
  
  // 마이너리그/기타 야구
  if (homeTeam.includes('Bulls') || homeTeam.includes('Knights') || 
      homeTeam.includes('Clippers') || homeTeam.includes('Bees') ||
      awayTeam.includes('Bulls') || awayTeam.includes('Knights') ||
      awayTeam.includes('Clippers') || awayTeam.includes('Bees')) {
    return { main: 'baseball', sub: 'MINOR_LEAGUE' };
  }
  
  // 기타 분류할 수 없는 경우
  return { main: 'unknown', sub: 'UNKNOWN' };
}

async function fixSubCategoryMapping() {
  console.log('DB의 잘못된 subCategory 매핑을 수정합니다...');
  
  const allGames = await GameResult.findAll();
  let updated = 0;
  let deleted = 0;
  
  for (const game of allGames) {
    const correctMapping = determineLeagueByTeam(game.homeTeam, game.awayTeam);
    
    // 기존 매핑과 다른 경우에만 업데이트
    if (game.mainCategory !== correctMapping.main || game.subCategory !== correctMapping.sub) {
      if (correctMapping.main === 'unknown') {
        // 분류할 수 없는 경기는 삭제
        await GameResult.destroy({ where: { id: game.id } });
        deleted++;
        console.log(`[삭제] ${game.homeTeam} vs ${game.awayTeam} (분류 불가)`);
      } else {
        // 올바른 카테고리로 업데이트
        await GameResult.update(
          { 
            mainCategory: correctMapping.main, 
            subCategory: correctMapping.sub 
          },
          { where: { id: game.id } }
        );
        updated++;
        console.log(`[수정] ${game.homeTeam} vs ${game.awayTeam} | ${game.mainCategory}/${game.subCategory} → ${correctMapping.main}/${correctMapping.sub}`);
      }
    }
  }
  
  console.log(`\n완료: ${updated}건 수정, ${deleted}건 삭제`);
  
  // 수정 후 현황 확인
  console.log('\n=== 수정 후 카테고리 현황 ===');
  const updatedResults = await GameResult.findAll({
    attributes: ['subCategory', 'mainCategory']
  });
  
  const stats = {};
  updatedResults.forEach(r => {
    const key = `${r.subCategory}|${r.mainCategory}`;
    stats[key] = (stats[key] || 0) + 1;
  });
  
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => {
      const [sub, main] = key.split('|');
      console.log(`${sub.padEnd(20)} | ${main.padEnd(12)} | ${count}경기`);
    });
}

fixSubCategoryMapping().catch(e => {
  console.error('에러:', e);
  process.exit(1);
}); 