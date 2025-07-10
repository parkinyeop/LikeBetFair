import React, { useState, useEffect, useCallback } from 'react';
import { useExchange, type ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeContext } from '../contexts/ExchangeContext';
import { getSportKey, getGameInfo } from '../config/sportsMapping';
import { useExchangeGames, ExchangeGame } from '../hooks/useExchangeGames';

interface Order {
  id: string;
  side: 'back' | 'lay';
  price: number;
  amount: number;
}

interface OddsData {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    last_update: string;
    markets: Array<{
      key: string;
      last_update: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

interface MarketSelection {
  team: string;
  back: { price: number; amount: number };
  lay: { price: number; amount: number };
}

interface Market {
  name: string;
  selections: MarketSelection[];
}

interface ExchangeMarketBoardProps {
  selectedCategory?: string;
}

export default function ExchangeMarketBoard({ selectedCategory = "NBA" }: ExchangeMarketBoardProps) {
  const { isLoggedIn } = useAuth();
  const { fetchOrderbook, placeMatchOrder } = useExchange();
  const { games: exchangeGames, loading: gamesLoading, error: gamesError, getGamesByCategory } = useExchangeGames();
  
  const [selectedMarket, setSelectedMarket] = useState(0);
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [selectedGame, setSelectedGame] = useState('xxx');
  const [selectedLine, setSelectedLine] = useState(8.5);
  const [oddsData, setOddsData] = useState<OddsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const { setSelectedBet, selectedBet } = useExchangeContext();

  // 선택된 카테고리에 따른 스포츠 키 결정
  const getSportsByCategory = (category: string): string[] => {
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      const sportKey = getSportKey(subCategory);
      return sportKey ? [sportKey] : [];
    }
    
    // 메인 카테고리인 경우 해당 카테고리의 모든 스포츠 (스포츠북의 전체 리그)
    const categorySports: Record<string, string[]> = {
      "축구": [
        'soccer_korea_kleague1',  // K리그
        'soccer_japan_j_league',  // J리그
        'soccer_italy_serie_a',   // 세리에 A
        'soccer_brazil_campeonato', // 브라질 세리에 A
        'soccer_usa_mls',         // MLS
        'soccer_argentina_primera_division', // 아르헨티나 프리메라
        'soccer_china_superleague', // 중국 슈퍼리그
        'soccer_spain_primera_division', // 라리가
        'soccer_germany_bundesliga' // 분데스리가
      ],
      "야구": ['baseball_mlb', 'baseball_kbo'],
      "농구": ['basketball_nba', 'basketball_kbl'],
      "미식축구": ['americanfootball_nfl']
    };
    
    return categorySports[category] || [];
  };

  // 더미 배당율 데이터 생성 (선택된 카테고리에 따라)
  const generateDummyOdds = (): OddsData[] => {
    const now = new Date();
    const dummyGames: OddsData[] = [];
    
    // 선택된 카테고리에 따른 더미 데이터 생성
    if (selectedCategory.includes("KBO") || selectedCategory === "야구") {
      // KBO 경기들 (1주일 범위)
      const kboTeams = [
        { home: 'SSG Landers', away: 'LG Twins' },
        { home: 'Kia Tigers', away: 'Doosan Bears' },
        { home: 'Samsung Lions', away: 'Hanwha Eagles' },
        { home: 'KT Wiz', away: 'NC Dinos' },
        { home: 'Lotte Giants', away: 'Kiwoom Heroes' }
      ];
      
      kboTeams.forEach((teams, index) => {
        const gameTime = new Date(now.getTime() + (index + 1) * 12 * 60 * 60 * 1000);
        dummyGames.push({
          id: `kbo_${index}`,
          sport_key: 'baseball_kbo',
          sport_title: 'KBO',
          commence_time: gameTime.toISOString(),
          home_team: teams.home,
          away_team: teams.away,
          bookmakers: [{
            key: 'dummy_bookmaker',
            title: '더미 북메이커',
            last_update: new Date().toISOString(),
            markets: [
              {
                key: 'h2h',
                last_update: new Date().toISOString(),
                outcomes: [
                  { name: teams.home, price: 1.85 + Math.random() * 0.3 },
                  { name: teams.away, price: 1.95 + Math.random() * 0.3 }
                ]
              },
              {
                key: 'totals',
                last_update: new Date().toISOString(),
                outcomes: [
                  { name: 'Over 8.5', price: 1.90 + Math.random() * 0.2 },
                  { name: 'Under 8.5', price: 1.90 + Math.random() * 0.2 }
                ]
              }
            ]
          }]
        });
      });
    }
    
    if (selectedCategory.includes("K리그") || selectedCategory === "축구") {
      // K리그 경기들 (1주일 범위)
      const kLeagueTeams = [
        { home: '울산현대', away: '대구 FC' },
        { home: '전북현대', away: '포항스틸러스' },
        { home: 'FC서울', away: '수원삼성' },
        { home: '인천유나이티드', away: '강원FC' },
        { home: '제주유나이티드', away: '광주FC' }
      ];
      
      kLeagueTeams.forEach((teams, index) => {
        const gameTime = new Date(now.getTime() + (index + 6) * 12 * 60 * 60 * 1000);
        dummyGames.push({
          id: `kleague_${index}`,
          sport_key: 'soccer_korea_kleague1',
          sport_title: 'K리그',
          commence_time: gameTime.toISOString(),
          home_team: teams.home,
          away_team: teams.away,
          bookmakers: [{
            key: 'dummy_bookmaker',
            title: '더미 북메이커',
            last_update: new Date().toISOString(),
            markets: [
              {
                key: 'h2h',
                last_update: new Date().toISOString(),
                outcomes: [
                  { name: teams.home, price: 1.80 + Math.random() * 0.4 },
                  { name: teams.away, price: 2.20 + Math.random() * 0.4 }
                ]
              },
              {
                key: 'totals',
                last_update: new Date().toISOString(),
                outcomes: [
                  { name: 'Over 2.5', price: 1.85 + Math.random() * 0.2 },
                  { name: 'Under 2.5', price: 1.95 + Math.random() * 0.2 }
                ]
              }
            ]
          }]
        });
      });
    }
    
    if (selectedCategory.includes("NBA") || selectedCategory === "농구") {
      // NBA 경기들 (1주일 범위)
      const nbaGames = [
        { id: 'nba_lakers_warriors_20250714', home: 'Los Angeles Lakers', away: 'Golden State Warriors' },
        { id: 'nba_celtics_heat_20250714', home: 'Boston Celtics', away: 'Miami Heat' },
        { id: 'nba_bulls_knicks_20250715', home: 'Chicago Bulls', away: 'New York Knicks' },
        { home: 'Dallas Mavericks', away: 'Houston Rockets' },
        { home: 'Phoenix Suns', away: 'Denver Nuggets' }
      ];
      
      nbaGames.forEach((teams, index) => {
        const gameTime = new Date(now.getTime() + (index + 11) * 12 * 60 * 60 * 1000);
        dummyGames.push({
          id: teams.id || `nba_${index}`,
          sport_key: 'basketball_nba',
          sport_title: 'NBA',
          commence_time: gameTime.toISOString(),
          home_team: teams.home,
          away_team: teams.away,
          bookmakers: [{
            key: 'dummy_bookmaker',
            title: '더미 북메이커',
            last_update: new Date().toISOString(),
            markets: [
              {
                key: 'h2h',
                last_update: new Date().toISOString(),
                outcomes: [
                  { name: teams.home, price: 1.75 + Math.random() * 0.4 },
                  { name: teams.away, price: 2.05 + Math.random() * 0.4 }
                ]
              },
              {
                key: 'totals',
                last_update: new Date().toISOString(),
                outcomes: [
                  { name: 'Over 220.5', price: 1.85 + Math.random() * 0.2 },
                  { name: 'Under 220.5', price: 1.95 + Math.random() * 0.2 }
                ]
              }
            ]
          }]
        });
      });
    }
    
    return dummyGames;
  };

  // Exchange 게임에서 마켓 생성 (실제 데이터 기반)
  const generateMarketsFromExchangeGame = (game: ExchangeGame): Market[] => {
    console.log('🔧 Exchange 게임에서 마켓 생성:', game);
    return game.availableMarkets.map(market => {
      let selections: MarketSelection[] = [];
      
      if (market.type === 'h2h') {
        // 승패 마켓
        selections = [
          {
            team: game.homeTeam,
            back: { price: 1.90, amount: 0 },
            lay: { price: 1.95, amount: 0 }
          },
          {
            team: game.awayTeam,
            back: { price: 1.90, amount: 0 },
            lay: { price: 1.95, amount: 0 }
          }
        ];
      } else if (market.type === 'totals') {
        // 총점 마켓
        selections = [
          {
            team: 'Over 2.5',
            back: { price: 1.85, amount: 0 },
            lay: { price: 1.90, amount: 0 }
          },
          {
            team: 'Under 2.5',
            back: { price: 1.95, amount: 0 },
            lay: { price: 2.00, amount: 0 }
          }
        ];
      } else if (market.type === 'spreads') {
        // 핸디캡 마켓
        selections = [
          {
            team: `${game.homeTeam} (-0.5)`,
            back: { price: 1.90, amount: 0 },
            lay: { price: 1.95, amount: 0 }
          },
          {
            team: `${game.awayTeam} (+0.5)`,
            back: { price: 1.90, amount: 0 },
            lay: { price: 1.95, amount: 0 }
          }
        ];
      }
      
      return {
        name: market.name,
        selections
      };
    });
  };

  // 배당율 데이터로부터 마켓 생성
  const generateMarketsFromOdds = (gameData: OddsData): Market[] => {
    console.log('마켓 생성 시작:', gameData);
    const newMarkets: Market[] = [];
    
    // Moneyline 마켓
    const moneylineMarket = gameData.bookmakers.find(bm => bm.markets.some(m => m.key === 'h2h'));
    if (moneylineMarket) {
      const h2hMarket = moneylineMarket.markets.find(m => m.key === 'h2h');
      if (h2hMarket && h2hMarket.outcomes.length > 0) {
        const selections: MarketSelection[] = h2hMarket.outcomes.map(outcome => ({
          team: outcome.name,
          back: { 
            price: outcome.price, 
            amount: 0 // 거래량 정보 제거
          },
          lay: { 
            price: outcome.price + 0.05, // 고정된 레이 가격 차이
            amount: 0 // 거래량 정보 제거
          }
        }));
        
        newMarkets.push({
          name: '승패',
          selections
        });
        console.log('승패 마켓 생성됨');
      }
    }

    // Totals 마켓
    const totalsMarket = gameData.bookmakers.find(bm => bm.markets.some(m => m.key === 'totals'));
    if (totalsMarket) {
      const totals = totalsMarket.markets.find(m => m.key === 'totals');
      if (totals && totals.outcomes.length > 0) {
        const selections: MarketSelection[] = totals.outcomes.map(outcome => ({
          team: outcome.name,
          back: { 
            price: outcome.price, 
            amount: 0 // 거래량 정보 제거
          },
          lay: { 
            price: outcome.price + 0.05, // 고정된 레이 가격 차이
            amount: 0 // 거래량 정보 제거
          }
        }));
        
        newMarkets.push({
          name: '총점',
          selections
        });
        console.log('총점 마켓 생성됨');
      }
    }

    // Spread 마켓
    const spreadMarket = gameData.bookmakers.find(bm => bm.markets.some(m => m.key === 'spreads'));
    if (spreadMarket) {
      const spreads = spreadMarket.markets.find(m => m.key === 'spreads');
      if (spreads && spreads.outcomes.length > 0) {
        const selections: MarketSelection[] = spreads.outcomes.map(outcome => ({
          team: outcome.name,
          back: { 
            price: outcome.price, 
            amount: 0 // 거래량 정보 제거
          },
          lay: { 
            price: outcome.price + 0.05, // 고정된 레이 가격 차이
            amount: 0 // 거래량 정보 제거
          }
        }));
        
        newMarkets.push({
          name: '핸디캡',
          selections
        });
        console.log('핸디캡 마켓 생성됨');
      }
    }

    console.log('최종 생성된 마켓들:', newMarkets);
    return newMarkets;
  };

  // 더미 호가 데이터 생성
  const generateDummyOrderbook = (game: OddsData): ExchangeOrder[] => {
    const dummyOrders: ExchangeOrder[] = [];
    
    // Back 주문들 (더 낮은 가격부터)
    for (let i = 0; i < 5; i++) {
      dummyOrders.push({
        id: i + 1,
        userId: 1,
        gameId: game.id,
        market: 'totals',
        line: 8.5,
        side: 'back',
        price: 1.80 - (i * 0.05),
        amount: Math.floor(Math.random() * 50000) + 10000,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // Lay 주문들 (더 높은 가격부터)
    for (let i = 0; i < 5; i++) {
      dummyOrders.push({
        id: i + 6,
        userId: 2,
        gameId: game.id,
        market: 'totals',
        line: 8.5,
        side: 'lay',
        price: 1.90 + (i * 0.05),
        amount: Math.floor(Math.random() * 50000) + 10000,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    // 가격순으로 정렬 (Back은 내림차순, Lay는 오름차순)
    return dummyOrders.sort((a, b) => {
      if (a.side === 'back' && b.side === 'back') {
        return b.price - a.price; // Back은 높은 가격이 위로
      } else if (a.side === 'lay' && b.side === 'lay') {
        return a.price - b.price; // Lay는 낮은 가격이 위로
      } else {
        return a.side === 'back' ? -1 : 1; // Back이 Lay보다 위로
      }
    });
  };

  // Exchange 게임 데이터 변환
  useEffect(() => {
    if (!gamesLoading && exchangeGames.length > 0) {
      console.log('🎮 Exchange 게임 데이터 로드:', exchangeGames.length, '개');
      
      // Exchange 게임을 OddsData 형태로 변환
      const convertedGames: OddsData[] = exchangeGames.map(game => ({
        id: game.id,
        sport_key: game.sportKey,
        sport_title: game.league,
        commence_time: game.commenceTime,
        home_team: game.homeTeam,
        away_team: game.awayTeam,
        bookmakers: [{
          key: 'exchange',
          title: 'Exchange',
          last_update: new Date().toISOString(),
          markets: game.availableMarkets.map(market => ({
            key: market.type,
            last_update: new Date().toISOString(),
            outcomes: market.selections || []
          }))
        }]
      }));
      
      setOddsData(convertedGames);
      setLoading(false);
      
      // 첫 번째 경기로 마켓 생성
      if (convertedGames.length > 0) {
        const firstGameMarkets = generateMarketsFromExchangeGame(exchangeGames[0]);
        console.log('✅ 첫 번째 경기 마켓 설정:', firstGameMarkets);
        setMarkets(firstGameMarkets);
      }
    } else if (gamesError) {
      console.error('❌ Exchange 게임 로드 오류:', gamesError);
      setOddsData([]);
      setMarkets([]);
      setLoading(false);
    }
  }, [exchangeGames, gamesLoading, gamesError]);

  // 호가 데이터 로드
  useEffect(() => {
    console.log('호가 데이터 로드 useEffect 실행 체크:', {
      isLoggedIn,
      selectedGameIndex,
      'oddsData[selectedGameIndex]': oddsData[selectedGameIndex],
      'markets[selectedMarket]': markets[selectedMarket],
      markets,
      selectedMarket
    });
    
    if (oddsData[selectedGameIndex] && markets[selectedMarket]) {
      const game = oddsData[selectedGameIndex];
      setSelectedGame(game.id);
      
      console.log('호가 데이터 로드 시도:', {
        gameId: game.id,
        market: markets[selectedMarket].name,
        line: selectedLine
      });
      
      // 실제 호가 데이터를 가져와서 오더북에 반영 (선택된 마켓명 사용)
      fetchOrderbook(game.id, markets[selectedMarket].name, selectedLine).then((orders) => {
        console.log('가져온 호가 데이터:', orders);
        setOrderbook(orders);
      }).catch((error) => {
        console.error('호가 데이터 로드 실패:', error);
      });
    } else {
      console.log('호가 데이터 로드 조건 불만족');
    }
  }, [selectedGameIndex, selectedLine, fetchOrderbook, oddsData, markets, selectedMarket]);

  // 경기 선택 시 마켓 업데이트
  const handleGameSelect = (index: number) => {
    console.log('경기 선택:', { index, game: oddsData[index] });
    setSelectedGameIndex(index);
    if (oddsData[index]) {
      const markets = generateMarketsFromOdds(oddsData[index]);
      console.log('생성된 마켓들:', markets);
      setMarkets(markets);
      setSelectedMarket(0);
    }
  };

  // 배팅 버튼 클릭 핸들러
  const handleBetClick = (team: string, price: number, type: 'back' | 'lay', gameId: string, marketName: string) => {
    console.log('🎯 베팅 선택:', { team, price, type, gameId, marketName });
    setSelectedBet({ team, price, type, gameId, market: marketName });
  };

  // 매치 주문 핸들러
  const handleMatchOrder = useCallback(async (existingOrder: ExchangeOrder) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      // 기존 주문의 반대편으로 매치 주문 생성
      const oppositeSide: 'back' | 'lay' = existingOrder.side === 'back' ? 'lay' : 'back';
      const matchPrice = existingOrder.price; // 기존 주문 가격으로 매치
      
      // 현재 선택된 베팅 정보에서 팀명 가져오기
      let selectionName = existingOrder.selection || `${oppositeSide} ${matchPrice}`;
      if (selectedBet && selectedBet.team) {
        selectionName = selectedBet.team;
      }
      
      const orderData = {
        gameId: existingOrder.gameId,
        market: existingOrder.market,
        line: existingOrder.line,
        side: oppositeSide,
        price: matchPrice,
        amount: existingOrder.amount, // 전액 매치
        selection: selectionName // 팀명 또는 기본값
      };

      console.log('🎯 매치 주문 실행:', orderData);
      
      const result = await placeMatchOrder(orderData);
      
      if (result.success) {
        alert(`✅ 매치 성공!\n매치된 금액: ${result.totalMatched.toLocaleString()}원\n매치 개수: ${result.matches}개`);
        
        // 호가창 데이터 새로고침
        const gameData = oddsData[selectedGameIndex];
        const marketData = markets[selectedMarket];
        
        if (gameData && marketData) {
          const updatedOrderbook = await fetchOrderbook(gameData.id, marketData.name, selectedLine);
          setOrderbook(updatedOrderbook);
        }
      } else {
        alert('매치 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('❌ 매치 주문 오류:', error);
      alert('매치 주문 중 오류가 발생했습니다: ' + (error as Error).message);
    }
  }, [isLoggedIn, placeMatchOrder, oddsData, selectedGameIndex, markets, selectedMarket, selectedLine, fetchOrderbook]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">배당율 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (oddsData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">1주일 이내의 예정된 경기가 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">선택된 카테고리: {selectedCategory}</p>
        </div>
      </div>
    );
  }

  const currentGame = oddsData[selectedGameIndex];
  const market = markets[selectedMarket];

  return (
    <div className="h-full flex flex-col">
      {/* 시장 보드 - 전체 */}
      <div className="bg-white rounded shadow p-6 flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">시장 보드 - {selectedCategory}</h2>
        
        {/* 호가창 섹션 추가 */}
        {oddsData.length > 0 && currentGame && market && (
          <div className="mb-6 border rounded-lg p-4 bg-gray-50">
            {(() => {
              const gameInfo = getGameInfo(currentGame.id);
              return (
                <>
                  <h3 className="text-lg font-bold mb-3">
                    {gameInfo.displayName !== `Unknown Game (${currentGame.id.substring(0, 8)}...)` ? (
                      <>
                        호가창 - {gameInfo.displayName} ({market.name})
                        <div className="text-sm text-gray-500 font-normal mt-1">
                          📅 {new Date(gameInfo.gameDate).toLocaleString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} | 🏀 {gameInfo.homeTeam} vs {gameInfo.awayTeam}
                        </div>
                      </>
                    ) : (
                      <>
                        호가창 - {currentGame.home_team} vs {currentGame.away_team} ({market.name})
                        <div className="text-sm text-gray-500 font-normal mt-1">
                          📅 {new Date(currentGame.commence_time).toLocaleString('ko-KR')}
                        </div>
                      </>
                    )}
                  </h3>
                </>
              );
            })()}
            
            {!isLoggedIn ? (
              <div className="text-center py-4">
                <p className="text-gray-500">로그인 후 호가 정보를 확인할 수 있습니다.</p>
              </div>
            ) : orderbook.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">현재 등록된 호가가 없습니다.</p>
                <p className="text-sm text-gray-400">첫 번째 주문을 등록해보세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Back 주문들 */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-2 text-center">Back (베팅)</h4>
                  <div className="space-y-1">
                    {orderbook
                      .filter(order => order.side === 'back')
                      .sort((a, b) => b.price - a.price) // 높은 가격부터
                      .map((order) => (
                        <div key={order.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-blue-700">{order.price?.toFixed(2) || 'N/A'}</span>
                            <span className="text-right text-blue-600">{order.amount?.toLocaleString() || 0}원</span>
                          </div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleMatchOrder(order)}
                              className="px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600 transition-colors"
                            >
                              Lay로 매치
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                {/* Lay 주문들 */}
                <div>
                  <h4 className="text-sm font-semibold text-pink-600 mb-2 text-center">Lay (레이)</h4>
                  <div className="space-y-1">
                    {orderbook
                      .filter(order => order.side === 'lay')
                      .sort((a, b) => a.price - b.price) // 낮은 가격부터
                      .map((order) => (
                        <div key={order.id} className="bg-pink-50 border border-pink-200 rounded p-2 text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-pink-700">{order.price?.toFixed(2) || 'N/A'}</span>
                            <span className="text-right text-pink-600">{order.amount?.toLocaleString() || 0}원</span>
                          </div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleMatchOrder(order)}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Back으로 매치
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              {(() => {
                const gameInfo = getGameInfo(currentGame.id);
                return gameInfo.displayName !== `Unknown Game (${currentGame.id.substring(0, 8)}...)` ? (
                  <>현재 선택된 경기: {gameInfo.displayName} | 마켓: {market.name} | 라인: {selectedLine}</>
                ) : (
                  <>현재 선택된 경기: {currentGame.id} | 마켓: {market.name} | 라인: {selectedLine}</>
                );
              })()}
            </div>
          </div>
        )}
        
        {oddsData.length > 0 ? (
          <div className="space-y-6">
            {oddsData.map((game, gameIndex) => {
              const gameMarkets = generateMarketsFromOdds(game);
              return (
                <div key={game.id} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold">
                      {game.home_team} vs {game.away_team}
                    </h3>
                    <div className="text-sm text-gray-600">
                      {new Date(game.commence_time).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {/* 경기 선택 버튼 추가 */}
                    <div className="mt-2">
                      <button
                        onClick={() => handleGameSelect(gameIndex)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          selectedGameIndex === gameIndex
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {selectedGameIndex === gameIndex ? '선택됨' : '호가 보기'}
                      </button>
                    </div>
                  </div>
                  
                  {gameMarkets.length > 0 ? (
                    <div className="space-y-4">
                      {gameMarkets.map((market, marketIndex) => (
                        <div key={market.name} className="border rounded p-3">
                          <h4 className="font-semibold mb-2 text-blue-600">{market.name}</h4>
                          <table className="w-full text-center border">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="py-2">팀/선택</th>
                                <th className="py-2">Back<br/><span className="text-xs text-gray-400">(베팅)</span></th>
                                <th className="py-2">Lay<br/><span className="text-xs text-gray-400">(레이)</span></th>
                              </tr>
                            </thead>
                            <tbody>
                              {market.selections.map((sel, i) => (
                                <tr key={sel.team} className="border-t hover:bg-gray-50">
                                  <td className="py-3 font-medium">{sel.team}</td>
                                  <td>
                                    <button 
                                      onClick={() => handleBetClick(sel.team, sel.back.price, 'back', game.id, market.name)}
                                      className={`px-4 py-2 rounded font-bold transition-colors w-full ${
                                        selectedBet && 
                                        selectedBet.team === sel.team && 
                                        selectedBet.type === 'back' &&
                                        selectedBet.gameId === game.id &&
                                        selectedBet.market === market.name
                                          ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                      }`}
                                    >
                                      <div className="text-lg font-bold">{sel.back?.price?.toFixed(2) || 'N/A'}</div>
                                    </button>
                                  </td>
                                  <td>
                                    <button 
                                      onClick={() => handleBetClick(sel.team, sel.lay.price, 'lay', game.id, market.name)}
                                      className={`px-4 py-2 rounded font-bold transition-colors w-full ${
                                        selectedBet && 
                                        selectedBet.team === sel.team && 
                                        selectedBet.type === 'lay' &&
                                        selectedBet.gameId === game.id &&
                                        selectedBet.market === market.name
                                          ? 'bg-pink-600 text-white shadow-lg ring-2 ring-pink-300'
                                          : 'bg-pink-100 hover:bg-pink-200 text-pink-700'
                                      }`}
                                    >
                                      <div className="text-lg font-bold">{sel.lay?.price?.toFixed(2) || 'N/A'}</div>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">이 경기에 대한 배당율 정보가 없습니다.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">해당 카테고리의 경기가 없습니다.</p>
          </div>
        )}
      </div>


    </div>
  );
} 