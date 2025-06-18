const { fetchAndSaveAllResults } = require('./services/gameResultService');

(async () => {
  await fetchAndSaveAllResults();
})(); 