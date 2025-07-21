const axios = require('axios');

// Render 서버 URL
const RENDER_URL = 'https://likebetfair.onrender.com';

async function testSimpleAPI() {
    console.log('=== 간단한 API 연결 테스트 ===\n');
    
    try {
        // 1. 기본 서버 상태 확인
        console.log('1. 서버 상태 확인...');
        const healthResponse = await axios.get(`${RENDER_URL}/api/health`);
        console.log('✅ 서버 상태:', healthResponse.status, healthResponse.data);
        
        // 2. 사용자 등록 테스트
        console.log('\n2. 사용자 등록 테스트...');
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password: 'testpass123'
        };
        
        try {
            const registerResponse = await axios.post(`${RENDER_URL}/api/auth/register`, testUser);
            console.log('✅ 사용자 등록 성공:', registerResponse.status);
        } catch (error) {
            console.log('❌ 사용자 등록 실패:', error.response?.status, error.response?.data?.message || error.message);
        }
        
        // 3. 로그인 테스트
        console.log('\n3. 로그인 테스트...');
        try {
            const loginResponse = await axios.post(`${RENDER_URL}/api/auth/login`, {
                username: testUser.username,
                password: testUser.password
            });
            console.log('✅ 로그인 성공:', loginResponse.status);
            
            const token = loginResponse.data.token;
            
            // 4. 잔액 조회 테스트
            console.log('\n4. 잔액 조회 테스트...');
            const balanceResponse = await axios.get(`${RENDER_URL}/api/auth/balance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ 잔액 조회 성공:', balanceResponse.status, balanceResponse.data);
            
            // 5. 경기 목록 조회 테스트
            console.log('\n5. 경기 목록 조회 테스트...');
            const gamesResponse = await axios.get(`${RENDER_URL}/api/odds/kbo`);
            console.log('✅ 경기 목록 조회 성공:', gamesResponse.status);
            console.log('경기 수:', gamesResponse.data?.length || 0);
            
            // 6. 배당률 업데이트 테스트
            console.log('\n6. 배당률 업데이트 테스트...');
            const updateResponse = await axios.post(`${RENDER_URL}/api/odds/update-odds`, {
                category: 'kbo',
                priority: 1
            });
            console.log('✅ 배당률 업데이트 성공:', updateResponse.status, updateResponse.data);
            
        } catch (error) {
            console.log('❌ 로그인 실패:', error.response?.status, error.response?.data?.message || error.message);
        }
        
    } catch (error) {
        console.log('❌ 서버 연결 실패:', error.message);
    }
}

testSimpleAPI(); 