import express from 'express';
import { oddsController } from '../controllers/oddsController.js';

const router = express.Router();

router.get('/:sport', oddsController.getOdds);
router.post('/update-odds', oddsController.updateOdds);

export default router; 