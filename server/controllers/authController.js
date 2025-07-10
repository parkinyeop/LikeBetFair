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

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const user = await User.create({
        username,
        email,
        password: hashedPassword
      });

      // Create token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({ token });
    } catch (err) {
      console.error(err);
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