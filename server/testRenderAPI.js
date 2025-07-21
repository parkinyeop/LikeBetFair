import axios from 'axios';

const RENDER_URL = 'https://likebetfair.onrender.com';

async function testRenderAPI() {
    console.log('=== Render 서버 API 테스트 ===\n');
    
    try {
        // 1. 서버 상태 확인
        console.log('1. 서버 상태 확인...');
        try {
            const healthResponse = await axios.get(`${RENDER_URL}/api/health`, { timeout: 10000 });
            console.log('✅ 서버 상태:', healthResponse.status, healthResponse.data);
        } catch (error) {
            console.log('❌ 서버 상태 확인 실패:', error.message);
        }
        
        // 1-1. 루트 경로 확인
        console.log('\n1-1. 루트 경로 확인...');
        try {
            const rootResponse = await axios.get(`${RENDER_URL}/`, { timeout: 10000 });
            console.log('✅ 루트 경로 성공:', rootResponse.status);
        } catch (error) {
            console.log('❌ 루트 경로 실패:', error.message);
        }
        
        // 2. KBO 경기 목록 조회
        console.log('\n2. KBO 경기 목록 조회...');
        try {
            const kboResponse = await axios.get(`${RENDER_URL}/api/odds/kbo`, { timeout: 10000 });
            console.log('✅ KBO 경기 조회 성공:', kboResponse.status);
            console.log('경기 수:', kboResponse.data?.length || 0);
            
            if (kboResponse.data && kboResponse.data.length > 0) {
                console.log('첫 번째 경기:', {
                    homeTeam: kboResponse.data[0].homeTeam,
                    awayTeam: kboResponse.data[0].awayTeam,
                    commenceTime: kboResponse.data[0].commenceTime
                });
            }
        } catch (error) {
            console.log('❌ KBO 경기 조회 실패:', error.response?.status, error.response?.data?.message || error.message);
        }
        
        // 3. 배당률 업데이트 API 테스트
        console.log('\n3. 배당률 업데이트 API 테스트...');
        try {
            const updateResponse = await axios.post(`${RENDER_URL}/api/odds/update-odds`, {
                category: 'kbo',
                priority: 1
            }, { 
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('✅ 배당률 업데이트 성공:', updateResponse.status);
            console.log('응답 데이터:', updateResponse.data);
        } catch (error) {
            console.log('❌ 배당률 업데이트 실패:', error.response?.status, error.response?.data?.message || error.message);
        }
        
        // 4. 배당률 상태 확인
        console.log('\n4. 배당률 상태 확인...');
        try {
            const statusResponse = await axios.get(`${RENDER_URL}/api/odds/status`, { timeout: 10000 });
            console.log('✅ 배당률 상태 조회 성공:', statusResponse.status);
            console.log('상태 데이터:', statusResponse.data);
        } catch (error) {
            console.log('❌ 배당률 상태 조회 실패:', error.response?.status, error.response?.data?.message || error.message);
        }
        
    } catch (error) {
        console.log('❌ 전체 테스트 실패:', error.message);
    }
}

testRenderAPI(); 