import fetch from 'node-fetch';

async function testRegisterAPI() {
  console.log('🧪 Register API 테스트 시작...');
  
  const testCases = [
    {
      name: '정상 회원가입',
      data: {
        username: 'testuser_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com',
        password: 'testpass123'
      }
    },
    {
      name: '필수 필드 누락 (username)',
      data: {
        email: 'test_' + Date.now() + '@example.com',
        password: 'testpass123'
      }
    },
    {
      name: '필수 필드 누락 (email)',
      data: {
        username: 'testuser_' + Date.now(),
        password: 'testpass123'
      }
    },
    {
      name: '필수 필드 누락 (password)',
      data: {
        username: 'testuser_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com'
      }
    },
    {
      name: '잘못된 이메일 형식',
      data: {
        username: 'testuser_' + Date.now(),
        email: 'invalid-email',
        password: 'testpass123'
      }
    },
    {
      name: '짧은 비밀번호',
      data: {
        username: 'testuser_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com',
        password: '123'
      }
    }
  ];
  
  const baseUrl = process.env.API_URL || 'http://localhost:3001';
  const endpoint = '/api/auth/register';
  
  for (const testCase of testCases) {
    console.log(`\n🔍 테스트: ${testCase.name}`);
    console.log('📤 요청 데이터:', testCase.data);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testCase.data)
      });
      
      console.log(`📥 응답 상태: ${response.status} ${response.statusText}`);
      console.log('📋 응답 헤더:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📄 응답 텍스트:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('📊 파싱된 응답:', responseData);
      } catch (parseError) {
        console.error('❌ JSON 파싱 실패:', parseError);
        console.log('📄 원본 응답:', responseText);
      }
      
      if (response.ok) {
        console.log('✅ 테스트 성공');
      } else {
        console.log('❌ 테스트 실패 (예상된 동작)');
      }
      
    } catch (error) {
      console.error('❌ 요청 실패:', error.message);
    }
    
    // 테스트 간 간격
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 모든 테스트 완료');
}

// 환경 변수 설정 (로컬 테스트용)
if (!process.env.API_URL) {
  process.env.API_URL = 'http://localhost:3001';
}

testRegisterAPI(); 