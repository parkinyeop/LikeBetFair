import GameResult from '../models/gameResultModel.js';
import fs from 'fs';
import createScriptSequelize from '../config/scriptDatabase.js';

// 스크립트 전용 Sequelize 인스턴스 생성
const sequelize = createScriptSequelize();

// === 팀명 표준화 매핑 ===
const teamNameMap = {
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
  // MLB 등 추가 필요시 여기에
};

async function fixTeamNames() {
  let updated = 0;
  const allGames = await GameResult.findAll();
  for (const game of allGames) {
    let newHome = teamNameMap[game.homeTeam] || game.homeTeam;
    let newAway = teamNameMap[game.awayTeam] || game.awayTeam;
    if (newHome !== game.homeTeam || newAway !== game.awayTeam) {
      await game.update({ homeTeam: newHome, awayTeam: newAway });
      updated++;
      console.log(`[UPDATE] ${game.homeTeam} vs ${game.awayTeam} → ${newHome} vs ${newAway}`);
    }
  }
  console.log(`총 ${updated}건의 팀명이 표준화되었습니다.`);
  
  // 데이터베이스 연결 종료
  await sequelize.close();
}

// ... 기존 main 함수/로직 아래에 호출 추가 ...
fixTeamNames().catch(async (e) => { 
  console.error(e); 
  await sequelize.close();
  process.exit(1); 
}); 