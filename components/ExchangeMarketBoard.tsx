import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../hooks/useExchange';
import { useAuth } from '../contexts/AuthContext';
import BettingModal from './BettingModal';
import { getSportKey } from '../config/sportsMapping';

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
  const { fetchOrderbook } = useExchange();
  
  const [selectedMarket, setSelectedMarket] = useState(0);
  const [orderbook, setOrderbook] = useState<ExchangeOrder[]>([]);
  const [selectedGame, setSelectedGame] = useState('xxx');
  const [selectedLine, setSelectedLine] = useState(8.5);
  const [oddsData, setOddsData] = useState<OddsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [bettingModal, setBettingModal] = useState<{
    isOpen: boolean;
    selection: { team: string; price: number; type: 'back' | 'lay' };
  }>({
    isOpen: false,
    selection: { team: '', price: 0, type: 'back' }
  });

  // 선택된 카테고리에 따른 스포츠 키 결정
  const getSportsByCategory = (category: string): string[] => {
    if (category.includes(" > ")) {
      const subCategory = category.split(" > ")[1];
      const sportKey = getSportKey(subCategory);
      return sportKey ? [sportKey] : [];
    }
    
    // 메인 카테고리인 경우 해당 카테고리의 모든 스포츠
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
      const nbaTeams = [
        { home: 'Los Angeles Lakers', away: 'Golden State Warriors' },
        { home: 'Boston Celtics', away: 'Miami Heat' },
        { home: 'Chicago Bulls', away: 'New York Knicks' },
        { home: 'Dallas Mavericks', away: 'Houston Rockets' },
        { home: 'Phoenix Suns', away: 'Denver Nuggets' }
      ];
      
      nbaTeams.forEach((teams, index) => {
        const gameTime = new Date(now.getTime() + (index + 11) * 12 * 60 * 60 * 1000);
        dummyGames.push({
          id: `nba_${index}`,
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

  // 배당율 데이터로부터 마켓 생성
  const generateMarketsFromOdds = (gameData: OddsData): Market[] => {
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
            amount: Math.floor(Math.random() * 200) + 50 // 더미 거래량
          },
          lay: { 
            price: outcome.price + (Math.random() * 0.1 + 0.02), // 약간 높은 레이 가격
            amount: Math.floor(Math.random() * 200) + 50 
          }
        }));
        
        newMarkets.push({
          name: '승패',
          selections
        });
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
            amount: Math.floor(Math.random() * 200) + 50 
          },
          lay: { 
            price: outcome.price + (Math.random() * 0.1 + 0.02),
            amount: Math.floor(Math.random() * 200) + 50 
          }
        }));
        
        newMarkets.push({
          name: '총점',
          selections
        });
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
            amount: Math.floor(Math.random() * 200) + 50 
          },
          lay: { 
            price: outcome.price + (Math.random() * 0.1 + 0.02),
            amount: Math.floor(Math.random() * 200) + 50 
          }
        }));
        
        newMarkets.push({
          name: '핸디캡',
          selections
        });
      }
    }

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

  // 배당율 데이터 로드
  useEffect(() => {
    const fetchOdds = async () => {
      try {
        setLoading(true);
        // 선택된 카테고리에 따른 스포츠만 로드
        const sports = getSportsByCategory(selectedCategory);
        const allOdds: OddsData[] = [];
        
        for (const sport of sports) {
          try {
            console.log(`Fetching odds for ${sport}...`);
            const response = await fetch(`/api/odds/${sport}`);
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                console.log(`Found ${data.length} games for ${sport}`);
                allOdds.push(...data);
              } else {
                console.log(`No array data for ${sport}:`, data);
              }
            } else {
              console.log(`API error for ${sport}: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.error(`Error fetching odds for ${sport}:`, error);
          }
        }
        
        console.log(`Total games found: ${allOdds.length}`);
        
        // API에서 데이터를 가져오지 못한 경우 더미 데이터 생성
        if (allOdds.length === 0) {
          console.log('API에서 데이터를 가져오지 못해 더미 데이터를 생성합니다.');
          allOdds.push(...generateDummyOdds());
        } else {
          // API에서 데이터를 가져지만 미래 경기가 없는 경우에도 더미 데이터 생성
          const now = new Date();
          const futureGames = allOdds.filter(game => {
            const gameTime = new Date(game.commence_time);
            return gameTime > now;
          });
          
          if (futureGames.length === 0) {
            console.log('API에서 가져온 데이터에 미래 경기가 없어 더미 데이터를 생성합니다.');
            allOdds.length = 0; // 기존 데이터 클리어
            allOdds.push(...generateDummyOdds());
          }
        }
        
        // 현재 시간 이후의 경기만 필터링
        const now = new Date();
        const futureGames = allOdds.filter(game => {
          const gameTime = new Date(game.commence_time);
          return gameTime > now;
        });
        
        // 익스체인지는 사용자 간 거래이므로 1주일 이후의 경기도 표시
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const exchangeGames = futureGames.filter(game => {
          const gameTime = new Date(game.commence_time);
          return gameTime <= nextWeek;
        });
        
        setOddsData(exchangeGames);
        
        // 첫 번째 경기로 마켓 생성
        if (exchangeGames.length > 0) {
          generateMarketsFromOdds(exchangeGames[0]);
        }
      } catch (error) {
        console.error('Error fetching odds:', error);
        // 에러 발생 시에도 더미 데이터 생성
        const dummyOdds = generateDummyOdds();
        const now = new Date();
        const futureGames = dummyOdds.filter(game => {
          const gameTime = new Date(game.commence_time);
          return gameTime > now;
        });
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const exchangeGames = futureGames.filter(game => {
          const gameTime = new Date(game.commence_time);
          return gameTime <= nextWeek;
        });
        setOddsData(exchangeGames);
        if (exchangeGames.length > 0) {
          generateMarketsFromOdds(exchangeGames[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
  }, [selectedCategory]);

  // 호가 데이터 로드
  useEffect(() => {
    if (isLoggedIn && oddsData[selectedGameIndex]) {
      const game = oddsData[selectedGameIndex];
      setSelectedGame(`${game.home_team}_${game.away_team}`);
      
      // 실제 호가 데이터를 가져오되, 없으면 더미 데이터 생성
      fetchOrderbook(selectedGame, 'totals', selectedLine).then((orders) => {
        if (orders.length === 0) {
          // 더미 호가 데이터 생성
          const dummyOrders = generateDummyOrderbook(game);
          setOrderbook(dummyOrders);
        } else {
          setOrderbook(orders);
        }
      });
    }
  }, [isLoggedIn, selectedGameIndex, selectedLine, fetchOrderbook, oddsData]);

  // 경기 선택 시 마켓 업데이트
  const handleGameSelect = (index: number) => {
    setSelectedGameIndex(index);
    if (oddsData[index]) {
      generateMarketsFromOdds(oddsData[index]);
      setSelectedMarket(0);
    }
  };

  // 배팅 버튼 클릭 핸들러
  const handleBetClick = (team: string, price: number, type: 'back' | 'lay') => {
    setBettingModal({
      isOpen: true,
      selection: { team, price, type }
    });
  };

  // 배팅 확인 핸들러
  const handleBetConfirm = (betData: any) => {
    console.log('배팅 확인:', betData);
    // TODO: 실제 배팅 API 호출
    alert(`${betData.type === 'back' ? 'Back' : 'Lay'} 배팅이 완료되었습니다!`);
  };

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
                                      onClick={() => handleBetClick(sel.team, sel.back.price, 'back')}
                                      className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 font-bold transition-colors w-full"
                                    >
                                      <div className="text-lg font-bold">{sel.back.price.toFixed(2)}</div>
                                      <div className="text-xs text-blue-600">거래량: {sel.back.amount.toLocaleString()}원</div>
                                    </button>
                                  </td>
                                  <td>
                                    <button 
                                      onClick={() => handleBetClick(sel.team, sel.lay.price, 'lay')}
                                      className="px-4 py-2 bg-pink-100 hover:bg-pink-200 rounded text-pink-700 font-bold transition-colors w-full"
                                    >
                                      <div className="text-lg font-bold">{sel.lay.price.toFixed(2)}</div>
                                      <div className="text-xs text-pink-600">거래량: {sel.lay.amount.toLocaleString()}원</div>
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

      {/* 배팅 모달 */}
      <BettingModal
        isOpen={bettingModal.isOpen}
        onClose={() => setBettingModal({ ...bettingModal, isOpen: false })}
        onConfirm={handleBetConfirm}
        selection={bettingModal.selection}
      />
    </div>
  );
} 