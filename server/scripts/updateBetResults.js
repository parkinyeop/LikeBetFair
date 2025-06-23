import dotenv from 'dotenv';
dotenv.config();
import betResultService from '../services/betResultService.js';

async function main() {
  try {
    const result = await betResultService.updateBetResults();
    console.log('Bet results update finished:', result);
  } catch (err) {
    console.error('Bet results update error:', err);
    process.exit(1);
  }
  process.exit(0);
}

main(); 