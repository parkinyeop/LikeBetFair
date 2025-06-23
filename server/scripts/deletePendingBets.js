import Bet from '../models/betModel.js';
import sequelize from '../models/sequelize.js';

async function main() {
  try {
    await sequelize.authenticate();
    const deleted = await Bet.destroy({ where: { status: 'pending' } });
    console.log('Deleted pending bets:', deleted);
  } catch (err) {
    console.error('Error deleting pending bets:', err);
    process.exit(1);
  }
  process.exit(0);
}

main(); 