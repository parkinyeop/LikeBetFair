import gameResultService from './services/gameResultService.js';

const result = await gameResultService.collectMissingGameResults();
console.log(result);
process.exit(0); 