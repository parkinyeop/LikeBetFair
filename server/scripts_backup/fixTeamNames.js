import GameResult from '../models/gameResultModel.js';
import { normalizeTeamName } from '../normalizeUtils.js';

// === 표준 팀명 매핑 ===
const teamNameMap = {
  // KBO
  'Kiwoom He': 'Kiwoom Heroes',
  'Hanwha Ea': 'Hanwha Eagles',
  'KT Wiz': 'KT Wiz',
  'NC Dinos': 'NC Dinos',
  'Kia Tiger': 'Kia Tigers',
  'SSG Lande': 'SSG Landers',
  'Lotte Gia': 'Lotte Giants',
  'Doosan Be': 'Doosan Bears',
  'LG Twins': 'LG Twins',
  'Samsung L': 'Samsung Lions',
  // MLB (예시, 필요시 추가)
  'Los Angel': 'Los Angeles Angels',
  'San Diego': 'San Diego Padres',
  'Philadelp': 'Philadelphia Phillies',
  'Cincinnat': 'Cincinnati Reds',
  'Pittsburg': 'Pittsburgh Pirates',
  'Texas Ran': 'Texas Rangers',
  'Chicago W': 'Chicago White Sox',
  'Toronto B': 'Toronto Blue Jays',
  'Detroit T': 'Detroit Tigers',
  'New York': 'New York Yankees', // ambiguous, 실제로는 구분 필요
  // ... 필요시 추가 ...
};

async function fixTeamNames() {
  let updated = 0;
  const allGames = await GameResult.findAll();
  for (const game of allGames) {
    // 매핑 우선, 없으면 normalizeTeamName 적용
    let newHome = teamNameMap[game.homeTeam] || game.homeTeam;
    let newAway = teamNameMap[game.awayTeam] || game.awayTeam;
    // normalizeTeamName 적용(예: 공백/특수문자 제거)
    newHome = newHome.trim();
    newAway = newAway.trim();
    if (newHome !== game.homeTeam || newAway !== game.awayTeam) {
      await game.update({ homeTeam: newHome, awayTeam: newAway });
      updated++;
      console.log(`[UPDATE] ${game.homeTeam} vs ${game.awayTeam} → ${newHome} vs ${newAway}`);
    }
  }
  console.log(`총 ${updated}건의 팀명이 표준화되었습니다.`);
}

fixTeamNames().catch(e => { console.error(e); process.exit(1); }); 