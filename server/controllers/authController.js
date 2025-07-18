import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import axios from 'axios';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';
import sequelize from '../models/sequelize.js';

// TheSportsDB API를 활용한 경기 결과 판정 함수 (The Odds API 사용 금지)
async function getGameResult(sel) {
  try {
    // TheSportsDB API 사용
    const sportsDbApiKey = process.env.THESPORTSDB_API_KEY || '3';
    let cleanApiKey = sportsDbApiKey.replace(/THESPORTSDB_API_KEY=/g, '');
    if (cleanApiKey.length > 6) {
      cleanApiKey = cleanApiKey.substring(0, 6);
    }
    
    // MLB 리그 ID 사용 (TheSportsDB)
    const leagueId = '4424'; // MLB 리그 ID
    const url = `https://www.thesportsdb.com/api/v1/json/${cleanApiKey}/eventsround.php?id=${leagueId}&r=current`;
    
    const res = await axios.get(url);
    const events = res.data?.events || [];
    
    // 경기 매칭
    const game = events.find(g => {
      const gameDate = g.dateEvent;
      const gameTime = g.strTime || '00:00:00';
      const gameDateTime = `${gameDate}T${gameTime}`;
      
      return gameDateTime === sel.commence_time &&
             (g.strHomeTeam === sel.team || g.strAwayTeam === sel.team);
    });
    
    if (!game || g.strStatus !== 'Match Finished') return 'pending';
    
    const isHome = game.strHomeTeam === sel.team;
    const userScore = isHome ? parseInt(game.intHomeScore) : parseInt(game.intAwayScore);
    const oppScore = isHome ? parseInt(game.intAwayScore) : parseInt(game.intHomeScore);
    
    if (userScore > oppScore) return 'won';
    else return 'lost';
  } catch (err) {
    console.error('getGameResult error:', err.message);
    return 'pending';
  }
}

// 로그인 시 pending 베팅 결과 판정
async function checkAndUpdatePendingBets(userId) {
  const bets = await Bet.findAll({ where: { userId, status: 'pending' } });
  for (const bet of bets) {
    let allWon = true, anyLost = false;
    const updatedSelections = await Promise.all(bet.selections.map(async (sel) => {
      const result = await getGameResult(sel);
      if (result === 'lost') anyLost = true;
      if (result !== 'won') allWon = false;
      return { ...sel, result };
    }));
    bet.selections = updatedSelections;
    if (anyLost) bet.status = 'lost';
    else if (allWon) bet.status = 'won';
    else bet.status = 'pending';
    await bet.save();
    // TODO: 적중 시 정산(유저 balance 지급) 등 추가 처리 가능
  }
}

const authController = {
  register: async (req, res) => {
    try {
      console.log('[Register] 요청 시작');
      console.log('[Register] 요청 헤더:', req.headers);
      console.log('[Register] 요청 바디:', req.body);
      
      const { username, email, password } = req.body;

      console.log('[Register] 파싱된 데이터:', { 
        username: username ? `${username.substring(0, 3)}***` : null, 
        email: email ? `${email.substring(0, 3)}***` : null, 
        hasPassword: !!password,
        passwordLength: password ? password.length : 0
      });

      // 필수 필드 검증
      if (!username || !email || !password) {
        console.log('[Register] 필수 필드 누락:', { 
          hasUsername: !!username, 
          hasEmail: !!email, 
          hasPassword: !!password 
        });
        return res.status(400).json({ 
          error: '모든 필수 필드를 입력해주세요',
          missing: {
            username: !username,
            email: !email,
            password: !password
          },
          details: {
            username: !username ? '사용자명이 필요합니다' : null,
            email: !email ? '이메일이 필요합니다' : null,
            password: !password ? '비밀번호가 필요합니다' : null
          }
        });
      }

      // 사용자명 길이 검증
      if (username.length < 2 || username.length > 50) {
        console.log('[Register] 사용자명 길이 오류:', username.length);
        return res.status(400).json({ 
          error: '사용자명은 2-50자 사이여야 합니다' 
        });
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('[Register] 이메일 형식 오류:', email);
        return res.status(400).json({ 
          error: '올바른 이메일 형식을 입력해주세요' 
        });
      }

      // 비밀번호 길이 검증
      if (password.length < 6) {
        console.log('[Register] 비밀번호 길이 오류:', password.length);
        return res.status(400).json({ 
          error: '비밀번호는 최소 6자 이상이어야 합니다' 
        });
      }

      console.log('[Register] 기본 검증 통과');

      console.log('[Register] 데이터베이스 연결 확인 중...');
      
      // 데이터베이스 연결 상태 확인
      try {
        await sequelize.authenticate();
        console.log('[Register] 데이터베이스 연결 확인 완료');
      } catch (dbError) {
        console.error('[Register] 데이터베이스 연결 오류:', dbError);
        return res.status(500).json({ 
          error: '데이터베이스 연결 오류가 발생했습니다',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

      console.log('[Register] 사용자 중복 확인 중...');
      
      // Check if user already exists by email
      const existingUserByEmail = await User.findOne({
        where: { email }
      });
      
      if (existingUserByEmail) {
        console.log('[Register] 이미 존재하는 이메일:', email);
        return res.status(400).json({ 
          error: '이미 존재하는 이메일입니다' 
        });
      }

      // Check if user already exists by username
      const existingUserByUsername = await User.findOne({
        where: { username }
      });
      
      if (existingUserByUsername) {
        console.log('[Register] 이미 존재하는 사용자명:', username);
        return res.status(400).json({ 
          error: '이미 존재하는 사용자명입니다' 
        });
      }

      console.log('[Register] 중복 검사 통과');

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      console.log('[Register] 비밀번호 해시 완료');

      // JWT_SECRET 확인
      if (!process.env.JWT_SECRET) {
        console.error('[Register] JWT_SECRET 환경변수가 설정되지 않음');
        return res.status(500).json({ 
          error: '서버 설정 오류가 발생했습니다' 
        });
      }

      console.log('[Register] 사용자 생성 중...');

      // Create new user
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        balance: 0.00, // 기본 잔액
        isAdmin: false,
        adminLevel: 0,
        isActive: true
      });

      console.log('[Register] 사용자 생성 완료:', user.id);

      // Create token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      console.log('[Register] 토큰 생성 완료');
      console.log('[Register] 회원가입 성공:', { 
        userId: user.id, 
        username: user.username, 
        email: user.email 
      });

      res.status(201).json({ 
        success: true,
        token,
        message: '회원가입이 완료되었습니다',
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          balance: Number(user.balance)
        }
      });
      
    } catch (err) {
      console.error('[Register] 서버 오류:', err);
      console.error('[Register] 오류 스택:', err.stack);
      console.error('[Register] 오류 타입:', err.name);
      console.error('[Register] 오류 메시지:', err.message);
      
      // Sequelize 오류 처리
      if (err.name === 'SequelizeValidationError') {
        console.log('[Register] Sequelize 검증 오류:', err.errors);
        return res.status(400).json({ 
          error: '입력 데이터가 올바르지 않습니다',
          details: err.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }
      
      if (err.name === 'SequelizeUniqueConstraintError') {
        console.log('[Register] Sequelize 중복 제약 오류:', err.errors);
        return res.status(400).json({ 
          error: '이미 존재하는 사용자명 또는 이메일입니다' 
        });
      }
      
      if (err.name === 'SequelizeConnectionError') {
        console.error('[Register] 데이터베이스 연결 오류:', err);
        return res.status(500).json({ 
          error: '데이터베이스 연결 오류가 발생했습니다',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      
      if (err.name === 'SequelizeDatabaseError') {
        console.error('[Register] 데이터베이스 스키마 오류:', err);
        return res.status(500).json({ 
          error: '데이터베이스 스키마 오류가 발생했습니다. 관리자에게 문의하세요.',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
      
      if (err.name === 'SequelizeForeignKeyConstraintError') {
        console.error('[Register] 외래키 제약 오류:', err);
        return res.status(500).json({ 
          error: '데이터베이스 관계 오류가 발생했습니다. 관리자에게 문의하세요.' 
        });
      }
      
      // 구체적인 오류 정보 반환
      res.status(500).json({ 
        error: '서버 오류가 발생했습니다',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        type: err.name
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user exists by email first, then by username
      let user = await User.findOne({
        where: { email: email }
      });

      // If not found by email, try username
      if (!user) {
        user = await User.findOne({
          where: { username: email }
        });
      }
      
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // 로그인 시 pending 베팅 결과 판정
      await checkAndUpdatePendingBets(user.id);

      // Update last login time
      await user.update({ lastLogin: new Date() });

      // Create token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // username, email, balance, 관리자 정보도 함께 반환
      res.json({ 
        token, 
        userId: user.id, // userId 직접 포함
        username: user.username, 
        email: user.email, 
        balance: Number(user.balance),
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.userId, {
        attributes: { exclude: ['password'] }
      });
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  logout: (req, res) => {
    res.json({ message: 'Logged out successfully' });
  }
};

export { authController }; 