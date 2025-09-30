import React, { useState, useEffect, useMemo } from 'react';
import { useExchange, ExchangeOrder } from '../../hooks/useExchange';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useExchangeContext, MultiBetSelection } from '../../contexts/ExchangeContext';
import { formatToLocalDateTime } from '../../utils/timeUtils';
import { getButtonStyle } from '../../utils/buttonStyles';
import { applyExchangeReturnRate } from '../../utils/oddsCalculator';

// 렌더링을 위한 그룹화된 멀티배팅 주문 타입 정의
interface GroupedMultiBetOrder extends ExchangeOrder {
  selections: any[];
}

export default function LiveOddsPage() {
  const { isLoggedIn, token, userId } = useAuth();
  const { fetchAllOpenOrders } = useExchange();
  const { multiBetSelections, addMultiBetSelection, removeMultiBetSelection } = useExchangeContext();
  const router = useRouter();

  
  const [recentOrders, setRecentOrders] = useState<ExchangeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [filteredOrders, setFilteredOrders] = useState<ExchangeOrder[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  
  // 🎯 버튼별 선택 상태 관리 추가
  const [selectedButtons, setSelectedButtons] = useState<{[orderId: string]: string}>({});

  // 🎯 버튼이 선택되었는지 확인하는 함수
  const isButtonSelected = (orderId: string, buttonKey: string) => {
    const isSelected = selectedButtons[orderId] === buttonKey;
    return isSelected;
  };

  // 🆕 멀티배팅 선택 상태 확인
  const isMultiBetSelected = (orderId: number, market: string, selection: string) => {
    return multiBetSelections.some(s => 
      s.orderId === orderId && s.market === market && s.selection === selection
    );
  };

  // 🆕 sportKey를 리그명으로 변환하는 함수
  const getLeagueFromSportKey = (sportKey: string): string => {
    const leagueMap: { [key: string]: string } = {
      'soccer_korea_kleague1': 'K League',
      'soccer_japan_j_league': 'J League', 
      'soccer_italy_serie_a': 'Serie A',
      'soccer_brazil_campeonato': 'Brasileirao',
      'soccer_usa_mls': 'MLS',
      'soccer_argentina_primera_division': 'Argentina Primera',
      'soccer_china_superleague': 'Chinese Super League',
      'soccer_spain_primera_division': 'La Liga',
      'soccer_germany_bundesliga': 'Bundesliga',
      'soccer_england_premier_league': 'Premier League',
      'basketball_nba': 'NBA',
      'basketball_kbl': 'KBL',
      'baseball_mlb': 'MLB',
      'baseball_kbo': 'KBO',
      'americanfootball_nfl': 'NFL'
    };
    return leagueMap[sportKey] || sportKey;
  };

  // 🆕 멀티배팅 선택 토글
  const toggleMultiBetSelection = (order: ExchangeOrder, side: 'back' | 'lay', selection: string) => {
    const multiBetSelection: MultiBetSelection = {
      orderId: order.id,
      gameId: order.gameId || '',
      homeTeam: order.homeTeam || '',
      awayTeam: order.awayTeam || '',
      market: order.market || '',
      selection: selection,
      team: selection, // 🆕 team 필드 추가
      side: side,
      odds: order.price,
      amount: order.amount,
      commenceTime: order.commenceTime || '',
      sportKey: order.sportKey || '',
      desc: `${order.homeTeam} vs ${order.awayTeam}`, // 🆕 desc 필드 추가
      option: undefined, // 🆕 option 필드 추가
      point: undefined // 🆕 point 필드 추가
    };

    if (isMultiBetSelected(order.id, order.market || '', selection)) {
      removeMultiBetSelection(String(order.id), order.market || '', selection);
    } else {
      addMultiBetSelection(multiBetSelection);
    }
  };

  // 🎯 버튼 클릭 시 선택 상태 변경
  const handleButtonClick = (orderId: string, buttonKey: string) => {
    
    // Lay 버튼 클릭 시 orderbook 페이지로 이동
    if (buttonKey.startsWith('lay_')) {
      const order = recentOrders.find(o => String(o.id) === orderId);
      if (order) {
        let searchQuery = '';
        
        // 🆕 멀티배팅 주문의 경우 특별 처리
        if ((order as any).isMultibet && (order as any).selectionDetails?.selections) {
          // 멀티배팅 주문: 클릭한 버튼에 해당하는 팀만 검색
          let selection = buttonKey.replace('lay_', '');
          
          // 마켓명 제거 (예: 핸디캡_, totals_ 등)
          if (selection.includes('_')) {
            selection = selection.split('_').slice(1).join('_');
          }
          
          // 클릭한 선택지에 해당하는 팀명 찾기
          const clickedSelection = (order as any).selectionDetails.selections.find((s: any) => 
            s.team === selection || s.selection === selection
          );
          
          if (clickedSelection) {
            searchQuery = clickedSelection.team || clickedSelection.selection;
          } else {
            // 찾지 못한 경우 첫 번째 경기의 팀명으로 검색
            const firstSelection = (order as any).selectionDetails.selections[0];
            if (firstSelection) {
              searchQuery = firstSelection.team || firstSelection.selection;
            }
          }
        } else {
          // 일반 주문의 경우 기존 로직 사용
          // Lay 버튼의 선택지 추출 (예: lay_승리 -> 승리, lay_핸디캡_Minnesota United FC +0.5 -> Minnesota United FC +0.5)
          let selection = buttonKey.replace('lay_', '');
          
          // 🆕 마켓명도 제거 (예: 핸디캡_, totals_ 등)
          if (selection.includes('_')) {
            selection = selection.split('_').slice(1).join('_');
          }
          
          // 🆕 팀명만 추출하여 검색어로 사용
          if (selection === '승리' || selection === 'Win') {
            searchQuery = order.homeTeam || '';
          } else if (selection === '패배' || selection === 'Loss') {
            searchQuery = order.awayTeam || '';
          } else if (selection === '무승부' || selection === 'Draw') {
            // 무승부는 팀명으로 검색할 수 없으므로 경기 전체를 검색
            searchQuery = `${order.homeTeam} ${order.awayTeam}`;
          } else {
            // 핸디캡이나 다른 마켓의 경우 팀명만 추출
            const parts = selection.split(' ');
            let teamName = '';
            
            if (selection.includes('+') || selection.includes('-') || selection.includes('.')) {
              // 핸디캡이나 오버/언더: 마지막 숫자 부분 제거
              teamName = parts.slice(0, -1).join(' ');
            } else {
              // 일반적인 경우: 전체 사용
              teamName = selection;
            }
            
            searchQuery = teamName;
          }
        }
        
        // orderbook 페이지로 이동하면서 검색어 설정
        const encodedSearch = encodeURIComponent(searchQuery);
        router.push(`/exchange/orderbook?search=${encodedSearch}`);
        return;
      }
    }
    
    setSelectedButtons(prev => {
      const newState = { ...prev };
      // 같은 주문의 다른 버튼이 선택되어 있다면 해제
      if (newState[orderId] === buttonKey) {
        delete newState[orderId]; // 같은 버튼 재클릭 시 선택 해제
      } else {
        newState[orderId] = buttonKey; // 새 버튼 선택
      }
      return newState;
    });
  };

  // 주문현황 로드
  useEffect(() => {
    const loadRecentOrders = async () => {
      try {
        setOrdersLoading(true);
        const orders = await fetchAllOpenOrders();
        
        // 열린 주문과 부분 매칭된 주문만 표시
        const openOrders = orders.filter(order => 
          order.status === 'open' || 
          (order.status === 'partially_matched' && (order.remainingAmount || 0) > 0)
        );
        
        setRecentOrders(openOrders);
      } catch (error) {
        console.error('주문현황 로드 실패:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadRecentOrders();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadRecentOrders, 30000);
    
    // 🆕 주문 완료 이벤트 감지하여 즉시 새로고침
    const handleOrderPlaced = () => {
      loadRecentOrders();
    };
    
    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
    };
  }, [fetchAllOpenOrders]);

  // 멀티배팅 주문 그룹화 및 필터링 로직
  const { groupedMultibets, regularOrders } = useMemo(() => {
    const multiBetMap = new Map<number, GroupedMultiBetOrder>();
    const regular: ExchangeOrder[] = [];

    for (const order of recentOrders) {
      if ((order as any).isMultibet) {
        // 멀티배팅 ID를 기준으로 그룹화합니다. 여기서는 order.id를 고유 식별자로 사용합니다.
        // 실제로는 백엔드에서 `multibetId` 같은 별도 필드를 주는 것이 더 안정적입니다.
        const multibetId = order.id; 
        if (!multiBetMap.has(multibetId)) {
          multiBetMap.set(multibetId, {
            ...order,
            selections: (order as any).selectionDetails?.selections || [],
          });
        }
      } else {
        regular.push(order);
      }
    }
    
    const applyFilters = (order: ExchangeOrder) => {
      // 스포츠 필터
      if (selectedSport !== 'all') {
        const sportKey = order.sportKey || '';
        let matches = false;
        if (selectedSport === 'baseball') matches = sportKey.startsWith('baseball');
        else if (selectedSport === 'soccer') matches = sportKey.startsWith('soccer');
        else if (selectedSport === 'basketball') matches = sportKey.startsWith('basketball');
        else if (selectedSport === 'americanfootball') matches = sportKey.startsWith('americanfootball');
        else matches = sportKey.startsWith(selectedSport);
        if (!matches) return false;
      }
      // 마켓 필터
      if (selectedMarket !== 'all' && order.market !== selectedMarket) return false;
      // 리그 필터
      if (selectedLeague !== 'all' && getLeagueFromSportKey(order.sportKey || '') !== selectedLeague) return false;
      
      return true;
    };

    const filteredRegularOrders = regular.filter(applyFilters);
    const grouped = Array.from(multiBetMap.values());

    return { groupedMultibets: grouped, regularOrders: filteredRegularOrders };
  }, [recentOrders, selectedSport, selectedMarket, selectedLeague]);


  useEffect(() => {
    setFilteredOrders(regularOrders);
  }, [regularOrders]);

  // 스포츠별 통계
  const sportStats = useMemo(() => recentOrders.reduce((acc, order) => {
    const sport = order.sportKey?.split('_')[0] || 'unknown';
    if (!acc[sport]) acc[sport] = 0;
    acc[sport]++;
    return acc;
  }, {} as Record<string, number>), [recentOrders]);

  // 마켓별 통계
  const marketStats = useMemo(() => recentOrders.reduce((acc, order) => {
    const market = order.market || 'unknown';
    if (!acc[market]) acc[market] = 0;
    acc[market]++;
    return acc;
  }, {} as Record<string, number>), [recentOrders]);

  const handleMatchOrder = (order: ExchangeOrder) => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (String(userId) === String(order.userId)) {
      alert('자신의 주문과는 매칭할 수 없습니다.');
      return;
    }

    // 매칭 주문 페이지로 이동
    router.push(`/exchange/orderbook?matchOrderId=${order.id}`);
  };

  const getSportIcon = (sportKey: string) => {
    if (sportKey?.includes('soccer')) return '⚽';
    if (sportKey?.includes('basketball')) return '🏀';
    if (sportKey?.includes('baseball')) return '⚾';
    if (sportKey?.includes('americanfootball')) return '🏈';
    return '🏆';
  };

  const getMarketDisplayName = (market: string) => {
    const marketNames: Record<string, string> = {
      'h2h': '승패',
      'totals': '오버/언더',
      'spreads': '핸디캡',
    };
    return marketNames[market] || market;
  };

  // 스포츠별 하위 리그 매핑
  const getLeaguesBySport = (sport: string) => {
    const leagues: Record<string, string[]> = {
      'soccer': ['K League', 'J League', 'Serie A', 'Brasileirao', 'MLS', 'Argentina Primera', 'Chinese Super League', 'La Liga', 'Bundesliga', 'Premier League'],
      'basketball': ['NBA', 'KBL'],
      'baseball': ['KBO', 'MLB'],
      'americanfootball': ['NFL']
    };
    return leagues[sport] || [];
  };



  return (
    <div className="p-6">
      <div className="bg-black rounded shadow p-6 mb-4">
      {/* 헤더 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">📊 주문현황</h1>
              <p className="text-gray-300 mt-2">현재 등록된 모든 호가를 실시간으로 확인하고 매칭할 수 있습니다.</p>
            </div>
            {/* 3개 탭 네비게이션 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/exchange')}
                className="px-4 py-2 bg-blue-700 text-white text-sm rounded-lg font-medium hover:bg-blue-500 hover:shadow-lg transition-all flex items-center space-x-2 opacity-70 hover:opacity-100"
              >
                <span>🏠</span>
                <span>배팅</span>
              </button>
              <button
                disabled
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium shadow-lg cursor-not-allowed flex items-center space-x-2 ring-2 ring-green-400"
              >
                <span>📊</span>
                <span>주문현황</span>
              </button>
              <button
                onClick={() => router.push('/exchange/orderbook')}
                className="px-4 py-2 bg-pink-700 text-white text-sm rounded-lg font-medium hover:bg-pink-500 hover:shadow-lg transition-all flex items-center space-x-2 opacity-70 hover:opacity-100"
              >
                <span>📋</span>
                <span>매치</span>
              </button>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{recentOrders.length}</div>
              <div className="text-sm text-gray-300">전체 호가</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {recentOrders.filter(o => o.status === 'open').length}
              </div>
              <div className="text-sm text-gray-300">대기중</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">
                {recentOrders.filter(o => o.status === 'partially_matched').length}
              </div>
              <div className="text-sm text-gray-300">부분 체결</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {groupedMultibets.length}
              </div>
              <div className="text-sm text-gray-300">멀티배팅</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {Object.keys(sportStats).length}
              </div>
              <div className="text-sm text-gray-300">활성 스포츠</div>
            </div>
          </div>

          {/* Exchange 홈 리그뷰와 동일한 스타일 필터 */}
          <div className="mb-6">
            {/* 상위 카테고리 탭 */}
            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedSport('all');
                    setSelectedLeague('all');
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedSport === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  전체
                </button>
                {['soccer', 'basketball', 'baseball', 'americanfootball'].map((mainCategory) => (
                  <button
                    key={mainCategory}
                    onClick={() => {
                      setSelectedSport(mainCategory);
                      setSelectedLeague('all'); // 스포츠 변경 시 리그 초기화
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors capitalize ${
                      selectedSport === mainCategory
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {mainCategory}
                  </button>
                ))}
              </div>
              
              {/* 하위 카테고리 버튼들 */}
              {selectedSport !== 'all' && (
                <div className="mb-6">
                  <div className="text-lg font-bold mb-3 text-blue-300 capitalize">
                    {selectedSport}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getLeaguesBySport(selectedSport).map((league) => (
                      <button
                        key={league}
                        onClick={() => setSelectedLeague(selectedLeague === league ? 'all' : league)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative border-2 shadow-sm ${
                          selectedLeague === league
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-blue-900 border-blue-400 text-blue-200 hover:bg-blue-800 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{league}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 선택된 카테고리 정보 */}
            {selectedLeague !== 'all' && (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    현재 선택: {selectedLeague}
                  </h2>
                </div>
                
                {/* 호가 수 정보 표시 */}
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mt-2">
                  <div className="flex justify-between items-center">
                    <div className="text-blue-200">
                      <span className="font-semibold">{filteredOrders.length + groupedMultibets.length}</span>개의 호가
                    </div>
                    <div className="text-blue-300 text-sm capitalize">
                      {selectedSport !== 'all' ? `${selectedSport} • ` : ''}{selectedLeague}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 마켓 필터 */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {Object.keys(marketStats)
                  .filter(market => !['multibet', 'h2h', 'spreads'].includes(market))
                  .map(market => (
                  <button
                    key={market}
                    onClick={() => setSelectedMarket(selectedMarket === market ? 'all' : market)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative border-2 shadow-sm ${
                      selectedMarket === market
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-700 border-gray-400 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{getMarketDisplayName(market)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <div className="flex justify-end">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>

        {/* 멀티배팅 주문 목록 */}
        {groupedMultibets.length > 0 && (
          <div className="bg-black rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                🎯 멀티배팅 주문 ({groupedMultibets.length}개)
              </h2>
              <p className="text-gray-400 text-sm mt-1">동일한 멀티배팅에 포함된 모든 경기들이 그룹으로 표시됩니다.</p>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {groupedMultibets.map((multibetOrder) => (
                  <div
                    key={multibetOrder.id}
                    className="bg-gray-800 p-4 rounded shadow border-2 border-yellow-400"
                  >
                    {/* 멀티배팅 헤더 */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          🎯 멀티배팅 #{multibetOrder.id}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          multibetOrder.status === 'open' ? 'bg-blue-100 text-blue-800' :
                          multibetOrder.status === 'matched' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {multibetOrder.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {(multibetOrder as any).stakeAmount?.toLocaleString()}원 • {applyExchangeReturnRate(parseFloat((multibetOrder as any).totalOdds), [parseFloat((multibetOrder as any).totalOdds)]).toFixed(2)}배당
                      </div>
                    </div>

                    {/* 멀티배팅 선택들 */}
                    {multibetOrder.selections?.map((selection: any, idx: number) => (
                      <div key={idx} className="mb-3 p-3 bg-gray-700 rounded border border-gray-600">
                        <div className="text-white font-semibold mb-2">
                          {selection.homeTeam} vs {selection.awayTeam}
                        </div>
                        <div className="text-blue-300 text-sm mb-2">
                          {getLeagueFromSportKey(selection.sportKey || '')}
                        </div>
                        <div className="text-white mb-2">
                          {selection.commenceTime ? formatToLocalDateTime(selection.commenceTime) : '시간 미정'}
                        </div>
                        <div className="text-gray-300 text-sm mb-3">
                          {selection.selection} • {selection.side === 'back' ? '🎯 Back' : '📉 Lay'} • {selection.odds ? applyExchangeReturnRate(selection.odds, [selection.odds]).toFixed(2) : 'N/A'}배당
                        </div>
                        
                        {/* Lay 버튼들 추가 */}
                        <div className="flex space-x-4">
                          {(() => {
                            // 축구 경기인지 확인
                            const isFootball = selection.sportKey?.startsWith('soccer');
                            
                            if (isFootball && (selection.market === 'h2h' || selection.market === '승패')) {
                              // 축구 경기: 승/무/패 3개 버튼
                              if (selection.selection === '무승부' || selection.selection === 'Draw') {
                                // 무승부 배팅: 승리 → 무승부 → 패배 순서로 3개 버튼
                                return (
                                  <>
                                    {/* 승리 (Lay 가능) */}
                                    <button 
                                      onClick={() => handleButtonClick(String(multibetOrder.id), `lay_승리`)}
                                      className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_승리`), false)}
                                    >
                                      <div className="font-medium">승리</div>
                                      <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                      </div>
                                    </button>
                                    
                                    {/* 무승부 (Back - 비활성화) */}
                                    <button 
                                      disabled={true}
                                      className={getButtonStyle(false, true, false, false)}
                                    >
                                      <div className="font-medium">{selection.selection}</div>
                                      <div className="text-xs mt-1 opacity-90">🎯 Back</div>
                                      <div className="text-xs mt-1 text-white font-medium">
                                        배당률: {selection.odds ? applyExchangeReturnRate(selection.odds, [selection.odds]).toFixed(2) : 'N/A'}
                                      </div>
                                    </button>
                                    
                                    {/* 패배 (Lay 가능) */}
                                    <button 
                                      onClick={() => handleButtonClick(String(multibetOrder.id), `lay_패배`)}
                                      className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_패배`), false)}
                                    >
                                      <div className="font-medium">패배</div>
                                      <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                      </div>
                                    </button>
                                  </>
                                );
                              } else {
                                // 승/패 배팅: 승/패 → 무승부 → 승/패 순서로 3개 버튼
                                const oppositeSelection = selection.selection === selection.homeTeam ? selection.awayTeam : selection.homeTeam;
                                return (
                                  <>
                                    {/* 승/패 (Back - 비활성화) */}
                                    <button 
                                      disabled={true}
                                      className={getButtonStyle(false, true, false, false)}
                                    >
                                      <div className="font-medium">{selection.selection}</div>
                                      <div className="text-xs mt-1 opacity-90">🎯 Back</div>
                                      <div className="text-xs mt-1 text-white font-medium">
                                        배당률: {selection.odds ? applyExchangeReturnRate(selection.odds, [selection.odds]).toFixed(2) : 'N/A'}
                                      </div>
                                    </button>
                                    
                                    {/* 무승부 (Lay 가능) */}
                                    <button 
                                      onClick={() => handleButtonClick(String(multibetOrder.id), `lay_무승부`)}
                                      className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_무승부`), false)}
                                    >
                                      <div className="font-medium">무승부</div>
                                      <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                      </div>
                                    </button>
                                    
                                    {/* 반대 승/패 (Lay 가능) */}
                                    <button 
                                      onClick={() => handleButtonClick(String(multibetOrder.id), `lay_${oppositeSelection}`)}
                                      className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_${oppositeSelection}`), false)}
                                    >
                                      <div className="font-medium">{oppositeSelection}</div>
                                      <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                      </div>
                                    </button>
                                  </>
                                );
                              }
                            } else {
                              // 축구가 아닌 다른 스포츠: 2개 버튼만 표시
                              return (
                                <>
                                  {/* Back 주문이 있는 선택지 (비활성화) */}
                                  <button 
                                    disabled={true}
                                    className={getButtonStyle(false, true, false, false)}
                                  >
                                    <div className="font-medium">{selection.selection}</div>
                                    <div className="text-xs mt-1 opacity-90">🎯 Back</div>
                                    <div className="text-xs mt-1 text-white font-medium">
                                      배당률: {selection.odds?.toFixed(2)}
                                    </div>
                                  </button>
                                  
                                  {/* Lay 주문이 가능한 반대 선택지 (활성화) */}
                                  <button 
                                    onClick={() => handleButtonClick(String(multibetOrder.id), `lay_${selection.market}_${selection.selection}`)}
                                    className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_${selection.market}_${selection.selection}`), false)}
                                  >
                                    <div className="font-medium">
                                      {(() => {
                                        // 반대 선택지 찾기
                                        if (selection.market === 'h2h' || selection.market === '승패') {
                                          // 승/패 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                          if (selection.selection === selection.homeTeam) {
                                            return selection.awayTeam;
                                          } else {
                                            return selection.homeTeam;
                                          }
                                        } else if (selection.market === 'totals' || selection.market === '오버/언더') {
                                          // 오버/언더 경기: 현재 선택지가 오버면 언더, 언더면 오버
                                          if (selection.selection === '오버') {
                                            return '언더';
                                          } else {
                                            return '오버';
                                          }
                                        } else if (selection.market === 'spreads' || selection.market === '핸디캡') {
                                          // 핸디캡 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                          if (selection.selection === selection.homeTeam) {
                                            return selection.awayTeam;
                                          } else {
                                            return selection.homeTeam;
                                          }
                                        }
                                        // 기본값: 반대 선택지
                                        return selection.selection === selection.homeTeam ? selection.awayTeam : selection.homeTeam;
                                      })()}
                                    </div>
                                    <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                    <div className="text-xs mt-1 opacity-90">
                                      매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                    </div>
                                  </button>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 일반 호가 목록 */}
        <div className="bg-black rounded-lg shadow">
          {ordersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">호가 정보를 불러오는 중...</p>
            </div>
          ) : filteredOrders.length === 0 && groupedMultibets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">호가가 없습니다</h3>
              <p className="text-gray-400">
                {selectedSport !== 'all' || selectedMarket !== 'all' || selectedLeague !== 'all'
                  ? '선택한 필터 조건에 맞는 호가가 없습니다.' 
                  : '현재 등록된 호가가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-4">
                  {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-800 p-4 rounded shadow border-2 border-blue-400"
                  >
                    <div className="text-white font-semibold mb-2">
                      {order.homeTeam} vs {order.awayTeam}
                    </div>
                    
                    <div className="text-blue-300 text-sm mb-2">
                      {getLeagueFromSportKey(order.sportKey || '')}
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-white">
                        {order.commenceTime ? formatToLocalDateTime(order.commenceTime) : '시간 미정'}
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      {(() => {
                        const isFootball = order.sportKey?.startsWith('soccer');
                        
                        if (isFootball && (order.market === 'h2h' || order.market === '승패')) {
                          const oppositeSelection = order.selection === order.homeTeam ? order.awayTeam : order.homeTeam;
                          return (
                            <>
                              <button disabled={true} className={getButtonStyle(false, true, false, false)}>
                                <div className="font-medium">{order.selection}</div>
                                <div className="text-xs mt-1 opacity-90">🎯 Back</div>
                                <div className="text-xs mt-1 text-white font-medium">배당률: {applyExchangeReturnRate(order.price, [order.price]).toFixed(2)}</div>
                                <div className="text-xs mt-1 text-white font-medium">금액: {order.amount.toLocaleString()}원</div>
                              </button>
                              <button onClick={() => handleButtonClick(String(order.id), `lay_무승부`)} className={getButtonStyle(true, false, isButtonSelected(String(order.id), `lay_무승부`), false)}>
                                <div className="font-medium">무승부</div>
                                <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                <div className="text-xs mt-1 opacity-90">매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원</div>
                              </button>
                              <button onClick={() => handleButtonClick(String(order.id), `lay_${oppositeSelection}`)} className={getButtonStyle(true, false, false, false)}>
                                <div className="font-medium">{oppositeSelection}</div>
                                <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                <div className="text-xs mt-1 opacity-90">매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원</div>
                              </button>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <button disabled={true} className={getButtonStyle(false, true, false, false)}>
                                <div className="font-medium">{order.selection}</div>
                                <div className="text-xs mt-1 opacity-90">🎯 Back</div>
                                <div className="text-xs mt-1 text-white font-medium">배당률: {applyExchangeReturnRate(order.price, [order.price]).toFixed(2)}</div>
                                <div className="text-xs mt-1 text-white font-medium">금액: {order.amount.toLocaleString()}원</div>
                              </button>
                              <button onClick={() => handleButtonClick(String(order.id), `lay_${order.market}_${order.selection}`)} className={getButtonStyle(true, false, false, false)}>
                                <div className="font-medium">
                                  { order.market === 'h2h' ? (order.selection === order.homeTeam ? order.awayTeam : order.homeTeam) : `반대`}
                                </div>
                                <div className="text-xs mt-1 opacity-90">📉 Lay 가능</div>
                                <div className="text-xs mt-1 opacity-90">매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원</div>
                              </button>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 페이지 하단 정보 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>30초마다 자동으로 새로고침됩니다. 마지막 업데이트: {new Date().toLocaleString('ko-KR')}</p>
        </div>
      </div>
    </div>
  );
}
