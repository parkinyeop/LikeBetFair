const { fetchAndSaveResultsFromSportsDB } = require('./services/gameResultService');

(async () => {
  await fetchAndSaveResultsFromSportsDB('kbo');
})(); 