// 모든 모델을 한 곳에서 관리
import sequelize from './sequelize.js';

// 모델들 import
import User from './userModel.js';
import ExchangeOrder from './exchangeOrderModel.js';
import ExchangeOrderMatch from './exchangeOrderMatchModel.js';
import GameResult from './gameResultModel.js';
import OddsCache from './oddsCacheModel.js';
import Bet from './betModel.js';
import PaymentHistory from './paymentHistoryModel.js';

// 모델 간 관계 설정
const setupAssociations = async () => {
  try {
    // User 관계
    User.hasMany(ExchangeOrder, { foreignKey: 'userId', as: 'exchangeOrders' });
    User.hasMany(Bet, { foreignKey: 'userId', as: 'bets' });
    User.hasMany(PaymentHistory, { foreignKey: 'userId', as: 'paymentHistory' });

    // ExchangeOrder 관계
    ExchangeOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ExchangeOrder.belongsTo(GameResult, { foreignKey: 'gameResultId', as: 'gameResult' });



    // GameResult 관계
    GameResult.hasMany(ExchangeOrder, { foreignKey: 'gameResultId', as: 'exchangeOrders' });

    // Bet 관계
    Bet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    // PaymentHistory 관계
    PaymentHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    console.log('✅ 모델 관계 설정 완료');
  } catch (error) {
    console.error('❌ 모델 관계 설정 실패:', error);
    throw error;
  }
};

// 데이터베이스 동기화
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ 데이터베이스 동기화 완료');
  } catch (error) {
    console.error('❌ 데이터베이스 동기화 실패:', error);
    throw error;
  }
};

// 모델들 export
export {
  sequelize,
  User,
  ExchangeOrder,
  ExchangeOrderMatch,
  GameResult,
  OddsCache,
  Bet,
  PaymentHistory,
  setupAssociations,
  syncDatabase
};

export default sequelize;

