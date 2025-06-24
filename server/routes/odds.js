import express from 'express';
import { oddsController } from '../controllers/oddsController.js';

const router = express.Router();

router.get('/:sport', oddsController.getOdds);

export default router; 