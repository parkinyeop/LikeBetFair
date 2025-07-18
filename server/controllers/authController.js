import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import axios from 'axios';
import Bet from '../models/betModel.js';
import { Op } from 'sequelize';

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
      const { username, email, password } = req.body;

      console.log('[회원가입] 요청 데이터:', { username, email, hasPassword: !!password });

      // 필수 필드 검증
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: 'Username, email, and password are required' 
        });
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Invalid email format' 
        });
      }

      // 비밀번호 길이 검증
      if (password.length < 6) {
        return res.status(400).json({ 
          message: 'Password must be at least 6 characters long' 
        });
      }

      // Check if user already exists by email
      const existingUserByEmail = await User.findOne({
        where: { email }
      });
      
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Check if user already exists by username
      const existingUserByUsername = await User.findOne({
        where: { username }
      });
      
      if (existingUserByUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      console.log('[회원가입] 사용자 생성 시작...');

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

      console.log('[회원가입] 사용자 생성 완료:', user.id);

      // JWT_SECRET 확인
      if (!process.env.JWT_SECRET) {
        console.error('[회원가입] JWT_SECRET 환경변수가 설정되지 않음');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      // Create token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      console.log('[회원가입] 토큰 생성 완료');

      res.status(201).json({ 
        token,
        message: 'User registered successfully'
      });
    } catch (err) {
      console.error('[회원가입] 오류:', err);
      
      // Sequelize 오류 처리
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          message: 'Validation error', 
          details: err.errors.map(e => e.message) 
        });
      }
      
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ 
          message: 'Username or email already exists' 
        });
      }
      
      res.status(500).json({ message: 'Server error' });
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