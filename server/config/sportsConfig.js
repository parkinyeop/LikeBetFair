const sportsConfig = {
  football: {
    key: 'soccer_usa_mls',
    title: 'Football',
    subcategories: {
      'mls': 'Major League Soccer',
      'serie-a': 'Serie A - Italy',
      'la-liga': 'La Liga 2 - Spain',
      'j-league': 'J League',
      'k-league': 'K League 1',
      'brazil': 'Brazil Série A',
      'argentina': 'Primera División - Argentina',
      'china': 'Super League - China',
      'sweden': 'Allsvenskan - Sweden',
      'copa-libertadores': 'Copa Libertadores',
      'copa-sudamericana': 'Copa Sudamericana',
      'concacaf-gold-cup': 'CONCACAF Gold Cup'
    }
  },
  basketball: {
    key: 'basketball_nba',
    title: 'Basketball',
    subcategories: {
      'nba': 'NBA',
      'wnba': 'WNBA'
    }
  },
  baseball: {
    key: 'baseball_mlb',
    title: 'Baseball',
    subcategories: {
      'mlb': 'Major League Baseball',
      'kbo': 'KBO League',
      'ncaa': 'NCAA Baseball'
    }
  },
  icehockey: {
    key: 'icehockey_nhl',
    title: 'Ice Hockey',
    subcategories: {
      'nhl': 'NHL'
    }
  },
  americanfootball: {
    key: 'americanfootball_nfl',
    title: 'American Football',
    subcategories: {
      'nfl': 'NFL',
      'nfl-preseason': 'NFL Preseason',
      'ncaaf': 'NCAA Football',
      'cfl': 'CFL'
    }
  }
};

module.exports = sportsConfig; 