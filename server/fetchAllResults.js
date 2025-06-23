import { fetchAndSaveAllResults } from './services/gameResultService.js';

(async () => {
  await fetchAndSaveAllResults();
})(); 