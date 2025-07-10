import User from './models/userModel.js';
import Bet from './models/betModel.js';
import sequelize from './models/db.js';
import GameResult from './models/gameResultModel.js';
import { Op } from 'sequelize';

function normalizeTeamName(name) {
  // 북메이커 이름 등 제거, 공백 정리, 소문자화
  if (!name) return '';
  return name.replace(/(FanDuel|DraftKings|BetRivers)$/i, '').trim().toLowerCase();
}

async function checkPendingBets() {
  try {
    const user = await User.findOne({ where: { email: 'parkinyeop@naver.com' } });
    if (!user) {
      console.log('사용자를 찾을 수 없습니다.');
      return;
    }
    console.log('=== 사용자 정보 ===');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Username:', user.username);

    const pendingBets = await Bet.findAll({
      where: { userId: user.id, status: 'pending' },
      order: [['createdAt', 'DESC']]
    });

    console.log('\n=== 미정산 베팅 목록 ===');
    console.log('총 미정산 베팅 수:', pendingBets.length);

    for (const [index, bet] of pendingBets.entries()) {
      console.log(`\n${index + 1}. 베팅 ID: ${bet.id}`);
      console.log(`   금액: ${bet.stake}원`);
      console.log(`   상태: ${bet.status}`);
      console.log(`   생성일: ${bet.createdAt}`);
      if (bet.selections && Array.isArray(bet.selections)) {
        for (const [selIndex, selection] of bet.selections.entries()) {
          console.log(`     ${selIndex + 1}. ${selection.desc || '설명 없음'}`);
          console.log(`        팀: ${selection.team || '팀명 없음'}`);
          console.log(`        마켓: ${selection.market || '마켓 없음'}`);
          console.log(`        결과: ${selection.result || '결과 없음'}`);
          console.log(`        경기시간: ${selection.commence_time || '시간 없음'}`);

          // 실제 경기 결과 매칭 시도
          let reason = '';
          let found = null;
          if (!selection.commence_time) {
            reason = '선택에 경기시간(commence_time) 없음';
          } else {
            // ±12시간 범위로 검색
            const selTime = new Date(selection.commence_time);
            const from = new Date(selTime.getTime() - 12 * 60 * 60 * 1000);
            const to = new Date(selTime.getTime() + 12 * 60 * 60 * 1000);
            const normTeam = normalizeTeamName(selection.team);
            // 홈/어웨이 둘 중 하나라도 포함되면 매칭
            found = await GameResult.findOne({
              where: {
                commenceTime: { [Op.between]: [from, to] },
                [Op.or]: [
                  { homeTeam: { [Op.iLike]: `%${normTeam}%` } },
                  { awayTeam: { [Op.iLike]: `%${normTeam}%` } }
                ]
              }
            });
            if (!found) {
              // 혹시 리그/카테고리 정보가 selection에 있으면 추가로 확인
              reason = `DB에 ±12시간 내 팀명(${normTeam}) 포함 경기 결과 없음`;
            } else if (found.result === 'pending') {
              reason = '경기 결과가 아직 pending 상태';
            } else {
              reason = '정상적으로 매칭 가능(정산 로직 문제 가능)';
            }
          }
          console.log(`        ▶ 매칭 분석: ${reason}`);
          if (found) {
            console.log(`        ▶ DB 매칭 경기: ${found.homeTeam} vs ${found.awayTeam} | 상태: ${found.status} | 결과: ${found.result} | 스코어: ${JSON.stringify(found.score)}`);
          }
        }
      } else {
        console.log('     선택사항 데이터 없음');
      }
    }
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkPendingBets(); 