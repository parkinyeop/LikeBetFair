import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import User from './models/userModel.js';
import Bet from './models/betModel.js';
import sequelize from './models/db.js';

dotenv.config();

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
      where: {
        userId: user.id,
        status: 'pending'
      },
      include: [User],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('\n=== 미정산 베팅 목록 ===');
    console.log('총 미정산 베팅 수:', pendingBets.length);
    
    pendingBets.forEach((bet, index) => {
      console.log(`\n${index + 1}. 베팅 ID: ${bet.id}`);
      console.log(`   금액: ${bet.stake}원`);
      console.log(`   상태: ${bet.status}`);
      console.log(`   생성일: ${bet.createdAt}`);
      console.log(`   선택사항:`);
      
      if (bet.selections && Array.isArray(bet.selections)) {
        bet.selections.forEach((selection, selIndex) => {
          console.log(`     ${selIndex + 1}. ${selection.desc || '설명 없음'}`);
          console.log(`        팀: ${selection.team || '팀명 없음'}`);
          console.log(`        마켓: ${selection.market || '마켓 없음'}`);
          console.log(`        결과: ${selection.result || '결과 없음'}`);
          console.log(`        경기시간: ${selection.commence_time || '시간 없음'}`);
        });
      } else {
        console.log('     선택사항 데이터 없음');
      }
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await sequelize.close();
  }
}

checkPendingBets(); 