import fetch from 'node-fetch';

async function testRenderDeployment() {
  console.log('🔍 Render 배포 테스트 시작...');
  
  // Render URL (실제 배포된 URL로 변경 필요)
  const baseUrl = 'https://likebetfair.onrender.com'; // 실제 URL로 변경하세요
  
  const endpoints = [
    '/health',
    '/',
    '/api/auth/register'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 테스트 중: ${baseUrl}${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint === '/api/auth/register' ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: endpoint === '/api/auth/register' ? JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'testpass123'
        }) : undefined
      });
      
      console.log(`✅ 상태 코드: ${response.status}`);
      console.log(`📋 응답 헤더:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.text();
        console.log(`📄 응답 데이터: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      } else {
        console.log(`❌ 오류 응답: ${response.statusText}`);
        try {
          const errorData = await response.json();
          console.log(`📄 오류 상세:`, errorData);
        } catch (e) {
          console.log(`📄 오류 텍스트: ${await response.text()}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ 요청 실패: ${error.message}`);
    }
  }
  
  console.log('\n🏁 테스트 완료');
}

testRenderDeployment(); 