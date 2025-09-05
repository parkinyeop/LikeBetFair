import React, { useState, useEffect } from 'react';
import { useExchange, ExchangeOrder } from '../../hooks/useExchange';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useExchangeContext, MultiBetSelection } from '../../contexts/ExchangeContext';
import { convertUTCToKST } from '../../utils/timeUtils';
import { getButtonStyle } from '../../utils/buttonStyles';

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
    console.log('🎯 live-odds isButtonSelected 확인:', { orderId, buttonKey, isSelected, selectedButtons });
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
    console.log('🎯 live-odds handleButtonClick 호출됨:', { orderId, buttonKey });
    
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
            console.log('🔍 멀티배팅 검색어 추출:', { 
              multibetId: order.id, 
              clickedSelection: selection,
              searchQuery,
              foundSelection: clickedSelection
            });
          } else {
            // 찾지 못한 경우 첫 번째 경기의 팀명으로 검색
            const firstSelection = (order as any).selectionDetails.selections[0];
            if (firstSelection) {
              searchQuery = firstSelection.team || firstSelection.selection;
              console.log('🔍 멀티배팅 검색어 추출 (fallback):', { 
                multibetId: order.id, 
                firstGame: firstSelection,
                searchQuery 
              });
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
            // 예: "Minnesota United FC +0.5" -> "Minnesota United FC"
            // 예: "Over 2.5" -> "Over"
            // 예: "Under 2.5" -> "Under"
            
            // 숫자나 특수문자가 포함된 경우 마지막 부분 제거
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
          
          console.log('🔍 일반 주문 검색어 추출:', { selection, searchQuery });
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
        console.log('🎯 live-odds 버튼 선택 해제됨:', { orderId, buttonKey });
      } else {
        newState[orderId] = buttonKey; // 새 버튼 선택
        console.log('🎯 live-odds 새 버튼 선택됨:', { orderId, buttonKey });
      }
      console.log('🎯 live-odds selectedButtons 상태 업데이트:', newState);
      return newState;
    });
  };

  // 실시간 호가 현황 로드
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
        setFilteredOrders(openOrders);
      } catch (error) {
        console.error('실시간 호가 현황 로드 실패:', error);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadRecentOrders();
    
    // 30초마다 자동 새로고침
    const interval = setInterval(loadRecentOrders, 30000);
    
    // 🆕 주문 완료 이벤트 감지하여 즉시 새로고침
    const handleOrderPlaced = () => {
      console.log('🔄 주문 완료 이벤트 감지, 실시간 호가 현황 새로고침');
      loadRecentOrders();
    };
    
    window.addEventListener('exchangeOrderPlaced', handleOrderPlaced);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('exchangeOrderPlaced', handleOrderPlaced);
    };
  }, [fetchAllOpenOrders]);

  // 🆕 멀티배팅 주문과 일반 주문 분리 (필터링 적용)
  const multibetOrders = recentOrders.filter(order => {
    if (!(order as any).isMultibet) return false;
    
    // 멀티배팅 주문의 개별 경기들 중 하나라도 조건을 만족하면 전체 주문 표시
    const selections = (order as any).selectionDetails?.selections || [];
    
    // 스포츠 필터
    if (selectedSport !== 'all') {
      const hasMatchingSport = selections.some((selection: any) => {
        const sportKey = selection.sportKey || order.sportKey || '';
        let matches = false;
        
        if (selectedSport === 'baseball') {
          matches = sportKey.startsWith('baseball') || sportKey.includes('kbo') || sportKey.includes('mlb');
        } else if (selectedSport === 'soccer') {
          matches = sportKey.startsWith('soccer') || sportKey.includes('league') || sportKey.includes('liga');
        } else if (selectedSport === 'basketball') {
          matches = sportKey.startsWith('basketball') || sportKey.includes('nba') || sportKey.includes('kbl');
        } else if (selectedSport === 'americanfootball' || selectedSport === 'american football') {
          matches = sportKey.startsWith('americanfootball') || sportKey.includes('nfl');
        } else {
          matches = sportKey.startsWith(selectedSport);
        }
        
        return matches;
      });
      
      if (!hasMatchingSport) return false;
    }
    
    // 마켓 필터
    if (selectedMarket !== 'all') {
      const hasMatchingMarket = selections.some((selection: any) => 
        (selection.market || order.market) === selectedMarket
      );
      if (!hasMatchingMarket) return false;
    }
    
    // 리그 필터
    if (selectedLeague !== 'all') {
      const hasMatchingLeague = selections.some((selection: any) => {
        const selectionSportKey = selection.sportKey || order.sportKey || '';
        const selectionLeague = getLeagueFromSportKey(selectionSportKey);
        return selectionLeague === selectedLeague;
      });
      if (!hasMatchingLeague) return false;
    }
    
    return true;
  });
  
  const regularOrders = recentOrders.filter(order => !(order as any).isMultibet);
  
  // 🆕 디버깅 로그 추가 (한 번만 실행되도록 수정)
  useEffect(() => {
    console.log('🔍 실시간 호가 페이지 - 멀티배팅 주문 개수:', multibetOrders.length);
    console.log('🔍 실시간 호가 페이지 - 일반 주문 개수:', regularOrders.length);
    console.log('🔍 실시간 호가 페이지 - 멀티배팅 주문들:', multibetOrders.map(o => ({ id: o.id, isMultibet: (o as any).isMultibet })));
  }, [multibetOrders.length, regularOrders.length]);

  // 필터링 로직
  useEffect(() => {
    console.log('🔍 필터링 시작:', {
      selectedSport,
      selectedMarket,
      selectedLeague,
      totalOrders: recentOrders.length,
      recentOrders: recentOrders.map(o => ({ 
        id: o.id, 
        sportKey: o.sportKey, 
        market: o.market, 
        isMultibet: (o as any).isMultibet 
      }))
    });

    // 일반 주문과 멀티배팅 주문의 개별 경기들을 모두 포함
    let allOrders = [...recentOrders.filter(order => !(order as any).isMultibet)]; // 일반 주문
    
    // 멀티배팅 주문의 개별 경기들을 추가
    recentOrders.filter(order => (order as any).isMultibet).forEach(multibetOrder => {
      if ((multibetOrder as any).selectionDetails?.selections) {
        (multibetOrder as any).selectionDetails.selections.forEach((selection: any, idx: number) => {
          // 각 선택지를 개별 주문으로 변환
          const individualOrder = {
            id: `${multibetOrder.id}_${idx}`,
            userId: multibetOrder.userId,
            gameId: selection.gameId || multibetOrder.gameId,
            market: selection.market || multibetOrder.market,
            line: selection.line || 0,
            side: selection.side || 'back',
            price: selection.odds || multibetOrder.price,
            amount: multibetOrder.amount,
            selection: selection.selection,
            status: multibetOrder.status,
            createdAt: multibetOrder.createdAt,
            updatedAt: multibetOrder.updatedAt,
            homeTeam: selection.homeTeam,
            awayTeam: selection.awayTeam,
            commenceTime: selection.commenceTime,
            sportKey: selection.sportKey || multibetOrder.sportKey,
            isMultibetSelection: true, // 멀티배팅에서 온 선택지임을 표시
            parentMultibetId: multibetOrder.id
          } as any;
          allOrders.push(individualOrder);
        });
      }
    });
    
    let filtered = allOrders;
    console.log('🔍 모든 주문 포함 후:', filtered.length);

    // 스포츠 필터
    if (selectedSport !== 'all') {
      filtered = filtered.filter(order => {
        const sportKey = order.sportKey || '';
        let matches = false;
        
        if (selectedSport === 'baseball') {
          // 야구: baseball로 시작하거나 kbo가 포함된 경우
          matches = sportKey.startsWith('baseball') || sportKey.includes('kbo') || sportKey.includes('mlb');
        } else if (selectedSport === 'soccer') {
          // 축구: soccer로 시작하거나 축구 관련 키워드가 포함된 경우
          matches = sportKey.startsWith('soccer') || sportKey.includes('league') || sportKey.includes('liga');
        } else if (selectedSport === 'basketball') {
          // 농구: basketball로 시작하거나 nba, kbl이 포함된 경우
          matches = sportKey.startsWith('basketball') || sportKey.includes('nba') || sportKey.includes('kbl');
        } else if (selectedSport === 'americanfootball' || selectedSport === 'american football') {
          // 미식축구: americanfootball로 시작하거나 nfl이 포함된 경우
          matches = sportKey.startsWith('americanfootball') || sportKey.includes('nfl');
        } else {
          // 기본: startsWith 사용
          matches = sportKey.startsWith(selectedSport);
        }
        
        console.log('🔍 스포츠 필터:', { sportKey, selectedSport, matches });
        return matches;
      });
      console.log('🔍 스포츠 필터 후:', filtered.length);
    }

    // 마켓 필터
    if (selectedMarket !== 'all') {
      filtered = filtered.filter(order => order.market === selectedMarket);
    }

    // 리그 필터
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(order => {
        const orderLeague = getLeagueFromSportKey(order.sportKey || '');
        return orderLeague === selectedLeague;
      });
    }

    console.log('🔍 필터링 결과:', {
      selectedSport,
      selectedMarket, 
      selectedLeague,
      totalOrders: recentOrders.length,
      filteredCount: filtered.length,
      filteredOrders: filtered.map(o => ({ id: o.id, sportKey: o.sportKey, market: o.market }))
    });
    
    setFilteredOrders(filtered);
  }, [recentOrders, selectedSport, selectedMarket, selectedLeague]);

  // 스포츠별 통계
  const sportStats = recentOrders.reduce((acc, order) => {
    const sport = order.sportKey || 'unknown';
    if (!acc[sport]) acc[sport] = 0;
    acc[sport]++;
    return acc;
  }, {} as Record<string, number>);

  // 마켓별 통계
  const marketStats = recentOrders.reduce((acc, order) => {
    const market = order.market || 'unknown';
    if (!acc[market]) acc[market] = 0;
    acc[market]++;
    return acc;
  }, {} as Record<string, number>);

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
      '승패': '승패',
      '오버/언더': '오버/언더',
      '핸디캡': '핸디캡'
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
              <h1 className="text-3xl font-bold text-white">🔥 실시간 호가 현황</h1>
              <p className="text-gray-300 mt-2">현재 등록된 모든 호가를 실시간으로 확인하고 매칭할 수 있습니다.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/exchange')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <span>←</span>
                <span>홈으로 돌아가기</span>
              </button>
              <button
                onClick={() => router.push('/exchange/orderbook')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <span>📋</span>
                <span>전체 호가보기</span>
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
                {multibetOrders.length}
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
                {['Soccer', 'Basketball', 'Baseball', 'American Football'].map((mainCategory) => (
                  <button
                    key={mainCategory}
                    onClick={() => {
                      setSelectedSport(mainCategory.toLowerCase());
                      setSelectedLeague('all'); // 스포츠 변경 시 리그 초기화
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      selectedSport === mainCategory.toLowerCase()
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
                  <div className="text-lg font-bold mb-3 text-blue-300">
                    {selectedSport === 'soccer' ? 'Soccer' : 
                     selectedSport === 'basketball' ? 'Basketball' :
                     selectedSport === 'baseball' ? 'Baseball' :
                     selectedSport === 'americanfootball' ? 'American Football' : selectedSport}
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
                      <span className="font-semibold">{filteredOrders.length}</span>개의 호가
                    </div>
                    <div className="text-blue-300 text-sm">
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
                  .filter(market => 
                    market !== 'multibet' && 
                    market !== '핸디캡' && 
                    market !== 'spreads' && 
                    market !== 'Win/Loss' && 
                    market !== 'h2h'
                  )
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
        {multibetOrders.length > 0 && (
          <div className="bg-black rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                🎯 멀티배팅 주문 ({multibetOrders.length}개)
              </h2>
              <p className="text-gray-400 text-sm mt-1">동일한 멀티배팅에 포함된 모든 경기들이 그룹으로 표시됩니다.</p>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {multibetOrders.map((multibetOrder) => (
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
                          {multibetOrder.status === 'open' ? '진행중' : 
                           multibetOrder.status === 'matched' ? '완료' : '취소'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {(multibetOrder as any).stakeAmount?.toLocaleString()}원 • {(() => {
                          const totalOdds = (multibetOrder as any).totalOdds;
                          if (totalOdds && typeof totalOdds === 'number') {
                            return totalOdds.toFixed(2);
                          } else if (totalOdds && typeof totalOdds === 'string') {
                            return parseFloat(totalOdds).toFixed(2);
                          }
                          return 'N/A';
                        })()}배당
                      </div>
                    </div>

                    {/* 멀티배팅 선택들 */}
                    {(multibetOrder as any).selectionDetails?.selections?.map((selection: any, idx: number) => (
                      <div key={idx} className="mb-3 p-3 bg-gray-700 rounded border border-gray-600">
                        <div className="text-white font-semibold mb-2">
                          {selection.homeTeam} vs {selection.awayTeam}
                        </div>
                        <div className="text-blue-300 text-sm mb-2">
                          {getLeagueFromSportKey(selection.sportKey || '')}
                        </div>
                        <div className="text-white mb-2">
                          {selection.commenceTime ? convertUTCToKST(selection.commenceTime) : '시간 미정'}
                        </div>
                        <div className="text-gray-300 text-sm">
                          {selection.selection} • {selection.side === 'back' ? '🎯 Back' : '📉 Lay'} • {selection.odds?.toFixed(2)}배당
                        </div>
                        <div className="text-gray-400 text-xs">
                          {selection.market} • {selection.sportKey}
                        </div>
                        <div className="flex space-x-4">
                          {(() => {
                            // 🎯 축구 경기인지 확인
                            const isFootball = selection.sportKey?.startsWith('soccer');
                            
                            if (isFootball && (selection.market === 'h2h' || selection.market === '승패')) {
                              // 🎯 축구 경기: 승/무/패 3개 버튼
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
                                      <div className="text-xs mt-1 opacity-90">
                                        📉 Lay 가능
                                      </div>
                                      <div className="text-xs mt-1 opacity-90">
                                        매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                      </div>
                                    </button>
                                    
                                    {/* 무승부 (Back - 비활성화) */}
                                    <button 
                                      disabled={true}
                                      className={getButtonStyle(false, true, false, false)}
                                    >
                                      <div className="font-medium">{selection.team}</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        🎯 Back
                                      </div>
                                      <div className="text-xs mt-1 text-white font-medium">
                                        배당률: {selection.odds}
                                      </div>
                                      <div className="text-xs mt-1 text-white font-medium">
                                        마켓: {selection.market}
                                      </div>
                                    </button>
                                    
                                    {/* 패배 (Lay 가능) */}
                                    <button 
                                      onClick={() => handleButtonClick(String(multibetOrder.id), `lay_패배`)}
                                      className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_패배`), false)}
                                    >
                                      <div className="font-medium">패배</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        📉 Lay 가능
                                      </div>
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
                                      <div className="font-medium">{selection.team}</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        🎯 Back
                                      </div>
                                      <div className="text-xs mt-1 text-white font-medium">
                                        배당률: {selection.odds}
                                      </div>
                                      <div className="text-xs mt-1 text-white font-medium">
                                        마켓: {selection.market}
                                      </div>
                                    </button>
                                    
                                    {/* 무승부 (Lay 가능) */}
                                    <button 
                                      onClick={() => handleButtonClick(String(multibetOrder.id), `lay_무승부`)}
                                      className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_무승부`), false)}
                                    >
                                      <div className="font-medium">무승부</div>
                                      <div className="text-xs mt-1 opacity-90">
                                        📉 Lay 가능
                                      </div>
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
                                      <div className="text-xs mt-1 opacity-90">
                                        📉 Lay 가능
                                      </div>
                                      <div className="text-xs mt-1 opacity-90">
                                        매칭 가능: {((multibetOrder as any).remainingAmount || (multibetOrder as any).amount || 0).toLocaleString()}원
                                      </div>
                                    </button>
                                  </>
                                );
                              }
                            } else {
                              // 🎯 축구가 아닌 다른 스포츠: 2개 버튼만 표시
                              return (
                                <>
                                  {/* Back 주문이 있는 선택지 (비활성화) */}
                                  <button 
                                    disabled={true}
                                    className={getButtonStyle(false, true, false, false)}
                                  >
                                    <div className="font-medium">{selection.team}</div>
                                    <div className="text-xs mt-1 opacity-90">
                                      🎯 Back
                                    </div>
                                    <div className="text-xs mt-1 text-white font-medium">
                                      배당률: {selection.odds}
                                    </div>
                                    <div className="text-xs mt-1 text-white font-medium">
                                      마켓: {selection.market}
                                    </div>
                                  </button>
                                  
                                  {/* Lay 주문이 가능한 반대 선택지 (활성화) */}
                                  <button 
                                    onClick={() => handleButtonClick(String(multibetOrder.id), `lay_${selection.market}_${selection.team}`)}
                                    className={getButtonStyle(true, false, isButtonSelected(String(multibetOrder.id), `lay_${selection.market}_${selection.team}`), false)}
                                  >
                                    <div className="font-medium">
                                      {(() => {
                                        // 🆕 반대 선택지 찾기
                                        if (selection.market === 'h2h' || selection.market === '승패') {
                                          // 승/패 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                          if (selection.team === selection.homeTeam) {
                                            return selection.awayTeam;
                                          } else {
                                            return selection.homeTeam;
                                          }
                                        } else if (selection.market === 'totals' || selection.market === '오버/언더') {
                                          // 오버/언더 경기: 현재 선택지가 오버면 언더, 언더면 오버
                                          if (selection.team === '오버') {
                                            return '언더';
                                          } else {
                                            return '오버';
                                          }
                                        } else if (selection.market === 'spreads' || selection.market === '핸디캡') {
                                          // 핸디캡 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                          if (selection.team === selection.homeTeam) {
                                            return selection.awayTeam;
                                          } else {
                                            return selection.homeTeam;
                                          }
                                        }
                                        // 기본값: 반대 선택지
                                        return selection.team === selection.homeTeam ? selection.awayTeam : selection.homeTeam;
                                      })()}
                                    </div>
                                    <div className="text-xs mt-1 opacity-90">
                                      📉 Lay 가능
                                    </div>
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
          ) : filteredOrders.length === 0 ? (
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
              {/* 🆕 투데이 배팅 GameCard와 정확히 동일한 구조 */}
              <div className="space-y-4">
                  {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-800 p-4 rounded shadow border-2 border-blue-400"
                  >
                    {/* 🆕 투데이 배팅과 동일: 경기명 (font-semibold) */}
                    <div className="text-white font-semibold mb-2">
                      {order.homeTeam} vs {order.awayTeam}
                    </div>
                    
                    {/* 🆕 리그 정보 추가 */}
                    <div className="text-blue-300 text-sm mb-2">
                      {getLeagueFromSportKey(order.sportKey || '')}
                      {(order as any).isMultibetSelection && (
                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          🎯 멀티배팅
                        </span>
                      )}
                    </div>
                    
                    {/* 🆕 투데이 배팅과 동일: 시간 (기본 폰트) */}
                    <div className="mb-4">
                      <div className="text-white">
                        {order.commenceTime ? convertUTCToKST(order.commenceTime) : '시간 미정'}
                      </div>
                    </div>
                    
                    {/* 🆕 투데이 배팅과 동일: 선택지별 버튼 (Back/Lay 상태에 따라 활성화/비활성화) */}
                    <div className="flex space-x-4">
                      {(() => {
                        // 🎯 축구 경기인지 확인
                        const isFootball = order.sportKey?.startsWith('soccer');
                        
                        if (isFootball && (order.market === 'h2h' || order.market === '승패')) {
                          // 🎯 축구 경기: 승/무/패 3개 버튼
                          if (order.selection === '무승부' || order.selection === 'Draw') {
                            // 무승부 배팅: 승리 → 무승부 → 패배 순서로 3개 버튼
                            return (
                              <>
                                {/* 승리 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_승리`)}
                                  className={getButtonStyle(true, false, isButtonSelected(String(order.id), `lay_승리`), false)}
                                >
                                  <div className="font-medium">승리</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                  </div>
                                </button>
                                
                                {/* 무승부 (Back - 비활성화) */}
                                <button 
                                  disabled={true}
                                  className={getButtonStyle(false, true, false, false)}
                                >
                                  <div className="font-medium">{order.selection}</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    🎯 Back
                                  </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    배당률: {order.price.toFixed(2)}
                            </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    금액: {order.amount.toLocaleString()}원
                              </div>
                                </button>
                                
                                {/* 패배 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_패배`)}
                                  className={getButtonStyle(
                                    true, 
                                    false,
                                    isButtonSelected(String(order.id), `lay_패배`),
                                    false
                                  )}
                                >
                                  <div className="font-medium">패배</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                          </div>
                                </button>
                              </>
                            );
                          } else {
                            // 승/패 배팅: 승/패 → 무승부 → 승/패 순서로 3개 버튼
                            const oppositeSelection = order.selection === order.homeTeam ? order.awayTeam : order.homeTeam;
                            return (
                              <>
                                {/* 승/패 (Back - 비활성화) */}
                                <button 
                                  disabled={true}
                                  className={getButtonStyle(false, true, false, false)}
                                >
                                  <div className="font-medium">{order.selection}</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    🎯 Back
                        </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    배당률: {order.price.toFixed(2)}
                        </div>
                                  <div className="text-xs mt-1 text-white font-medium">
                                    금액: {order.amount.toLocaleString()}원
                        </div>
                                </button>
                                
                                {/* 무승부 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_무승부`)}
                                  className={getButtonStyle(
                                    true, 
                                    false,
                                    isButtonSelected(String(order.id), `lay_무승부`),
                                    false
                                  )}
                                >
                                  <div className="font-medium">무승부</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                        </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                          </div>
                                </button>
                                
                                {/* 반대 승/패 (Lay 가능) */}
                                <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_${oppositeSelection}`)}
                                  className={getButtonStyle(
                                    true, 
                                    false,
                                    false,
                                    false
                                  )}
                                >
                                  <div className="font-medium">{oppositeSelection}</div>
                                  <div className="text-xs mt-1 opacity-90">
                                    📉 Lay 가능
                                  </div>
                                  <div className="text-xs mt-1 opacity-90">
                                    매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
                                  </div>
                                </button>
                              </>
                            );
                          }
                        } else {
                          // 🎯 축구가 아닌 다른 스포츠: 2개 버튼만 표시
                          return (
                            <>
                              {/* Back 주문이 있는 선택지 (비활성화) */}
                          <button
                                disabled={true}
                                className={getButtonStyle(false, true, false, false)}
                              >
                                <div className="font-medium">{order.selection}</div>
                                <div className="text-xs mt-1 opacity-90">
                                  🎯 Back
                                </div>
                                <div className="text-xs mt-1 text-white font-medium">
                                  배당률: {order.price.toFixed(2)}
                                </div>
                                <div className="text-xs mt-1 text-white font-medium">
                                  금액: {order.amount.toLocaleString()}원
                                </div>
                          </button>
                              
                              {/* Lay 주문이 가능한 반대 선택지 (활성화) */}
                                                              <button 
                                  onClick={() => handleButtonClick(String(order.id), `lay_${order.market}_${order.selection}`)}
                                  className={getButtonStyle(
                                    true, 
                                    false,
                                    false,
                                    false
                                  )}
                                >
                                <div className="font-medium">
                                  {(() => {
                                    // 🆕 반대 선택지 찾기
                                    if (order.market === 'h2h' || order.market === '승패') {
                                      // 승/패 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                      if (order.selection === order.homeTeam) {
                                        return order.awayTeam;
                                      } else {
                                        return order.homeTeam;
                                      }
                                    } else if (order.market === 'totals' || order.market === '오버/언더') {
                                      // 오버/언더 경기: 현재 선택지가 오버면 언더, 언더면 오버
                                      if (order.selection === '오버') {
                                        return '언더';
                                      } else {
                                        return '오버';
                                      }
                                    } else if (order.market === 'spreads' || order.market === '핸디캡') {
                                      // 핸디캡 경기: 현재 선택지가 홈팀이면 원정팀, 원정팀이면 홈팀
                                      if (order.selection === order.homeTeam) {
                                        return order.awayTeam;
                                      } else {
                                        return order.homeTeam;
                                      }
                                    }
                                    // 기본값: 반대 선택지
                                    return order.selection === order.homeTeam ? order.awayTeam : order.homeTeam;
                                  })()}
                                </div>
                                <div className="text-xs mt-1 opacity-90">
                                  📉 Lay 가능
                                </div>
                                <div className="text-xs mt-1 opacity-90">
                                  매칭 가능: {(order.remainingAmount || order.amount).toLocaleString()}원
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
