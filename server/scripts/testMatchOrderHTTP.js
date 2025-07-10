import fetch from 'node-fetch';

async function testMatchOrderHTTP() {
  const testPayload = {
    gameId: '7f419b31-7a98-45ca-bf7d-f3cfbf7724b2',
    market: 'moneyline',
    line: 0,
    side: 'lay', 
    price: 2.5,
    amount: 10000,
    selection: 'Detroit Pistons'
  };

  // 테스트용 더미 토큰 (실제로는 로그인 후 받는 JWT)
  const testToken = 'Bearer test_token_placeholder';

  try {
    console.log('🔍 match-order API HTTP 테스트 시작...\n');
    console.log('📊 요청 데이터:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://localhost:3000/api/exchange/match-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': testToken
      },
      body: JSON.stringify(testPayload)
    });

    console.log(`\n📈 응답 상태: ${response.status} ${response.statusText}`);
    
    if (response.status === 500) {
      console.log('❌ 500 오류 발생!');
      const errorText = await response.text();
      console.log('오류 내용:', errorText);
    } else {
      const responseData = await response.json();
      console.log('✅ 응답 데이터:', JSON.stringify(responseData, null, 2));
    }

  } catch (error) {
    console.error('❌ HTTP 요청 오류:', error.message);
  }
}

testMatchOrderHTTP(); 