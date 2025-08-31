'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Exchange 멀티배팅 테이블 생성 시작...');
      
      // 1. ExchangeMultibets 테이블 생성
      await queryInterface.createTable('ExchangeMultibets', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        status: {
          type: Sequelize.ENUM('open', 'pending', 'won', 'lost', 'cancelled', 'settled'),
          defaultValue: 'open',
          allowNull: false,
          comment: '멀티배팅 상태'
        },
        totalStake: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '총 베팅 금액 (원 단위)'
        },
        totalOdds: {
          type: Sequelize.DECIMAL(10, 4),
          allowNull: false,
          comment: '총 배당률 (소수점 4자리)'
        },
        potentialWinnings: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '잠재적 수익 (원 단위)'
        },
        actualProfit: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: '실제 수익/손실 (원 단위, 정산 후)'
        },
        settledAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '정산 완료 시간'
        },
        selectionCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '선택된 베팅 개수'
        },
        wonSelections: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '성공한 선택 개수'
        },
        lostSelections: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '실패한 선택 개수'
        },
        cancelledSelections: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: '취소된 선택 개수'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '멀티배팅 설명 (사용자 입력)'
        },
        tags: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: '태그 정보'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // 2. ExchangeMultibetSelections 테이블 생성
      await queryInterface.createTable('ExchangeMultibetSelections', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        multibetId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'ExchangeMultibets',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        exchangeOrderId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'ExchangeOrders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        selection: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: '선택한 팀/선수명 또는 결과'
        },
        odds: {
          type: Sequelize.DECIMAL(10, 4),
          allowNull: false,
          comment: '해당 선택의 배당률'
        },
        market: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: '마켓 타입 (h2h, spreads, totals 등)'
        },
        gameId: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: '경기 ID (TheSportsDB ID)'
        },
        status: {
          type: Sequelize.ENUM('pending', 'won', 'lost', 'cancelled', 'postponed'),
          defaultValue: 'pending',
          allowNull: false,
          comment: '선택사항 상태'
        },
        result: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: '경기 결과'
        },
        homeTeam: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: '홈팀명'
        },
        awayTeam: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: '어웨이팀명'
        },
        commenceTime: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '경기 시작 시간'
        },
        sportKey: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: '스포츠 종목 키'
        },
        line: {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: '핸디캡 라인 또는 토탈 라인'
        },
        point: {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: '핸디캡 포인트 또는 토탈 포인트'
        },
        settlementNote: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '정산 관련 메모'
        },
        settledAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '정산 완료 시간'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // 3. ExchangeOrders 테이블에 멀티배팅 필드 추가
      await queryInterface.addColumn('ExchangeOrders', 'multibetId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ExchangeMultibets',
          key: 'id'
        },
        comment: '멀티배팅 ID (멀티배팅의 일부인 경우)'
      }, { transaction });

      await queryInterface.addColumn('ExchangeOrders', 'isMultibetSelection', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '멀티배팅 선택사항 여부'
      }, { transaction });

      // 4. 인덱스 생성
      await queryInterface.addIndex('ExchangeMultibets', ['userId'], { transaction });
      await queryInterface.addIndex('ExchangeMultibets', ['status'], { transaction });
      await queryInterface.addIndex('ExchangeMultibets', ['createdAt'], { transaction });
      await queryInterface.addIndex('ExchangeMultibets', ['settledAt'], { transaction });

      await queryInterface.addIndex('ExchangeMultibetSelections', ['multibetId'], { transaction });
      await queryInterface.addIndex('ExchangeMultibetSelections', ['exchangeOrderId'], { transaction });
      await queryInterface.addIndex('ExchangeMultibetSelections', ['gameId'], { transaction });
      await queryInterface.addIndex('ExchangeMultibetSelections', ['status'], { transaction });
      await queryInterface.addIndex('ExchangeMultibetSelections', ['commenceTime'], { transaction });

      await queryInterface.addIndex('ExchangeOrders', ['multibetId'], { transaction });
      await queryInterface.addIndex('ExchangeOrders', ['isMultibetSelection'], { transaction });

      await transaction.commit();
      console.log('✅ Exchange 멀티배팅 테이블 생성 완료');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Exchange 멀티배팅 테이블 생성 실패:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Exchange 멀티배팅 테이블 삭제 시작...');
      
      // 1. ExchangeOrders 테이블에서 멀티배팅 필드 제거
      await queryInterface.removeColumn('ExchangeOrders', 'isMultibetSelection', { transaction });
      await queryInterface.removeColumn('ExchangeOrders', 'multibetId', { transaction });
      
      // 2. ExchangeMultibetSelections 테이블 삭제
      await queryInterface.dropTable('ExchangeMultibetSelections', { transaction });
      
      // 3. ExchangeMultibets 테이블 삭제
      await queryInterface.dropTable('ExchangeMultibets', { transaction });
      
      await transaction.commit();
      console.log('✅ Exchange 멀티배팅 테이블 삭제 완료');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Exchange 멀티배팅 테이블 삭제 실패:', error);
      throw error;
    }
  }
};
