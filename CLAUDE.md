# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LikeBetFair is a sports betting platform built as a full-stack application with:
- **Frontend**: Next.js 14 with TypeScript, TailwindCSS, and React 18
- **Backend**: Express.js with PostgreSQL database using Sequelize ORM
- **Architecture**: Monorepo with integrated server that serves both API and frontend
- **Deployment**: Render platform with automated builds

The application features traditional sports betting, an exchange betting system (like Betfair), real-time odds updates, user authentication, admin management, and comprehensive game result tracking.

## Development Commands

### Essential Commands
```bash
# Start development (builds frontend and starts server)
npm start

# Start only the server (requires pre-built frontend)
npm run start:server

# Build optimized production version
npm run build

# Run database migrations
npm run migrate

# Lint code
npm run lint

# Environment checks
npm run check-env          # Basic environment check
npm run check-env:api      # API endpoint validation
npm run check-env:db       # Database connection check
npm run check-env:full     # Complete environment validation
```

### Server-Specific Commands (in server/ directory)
```bash
cd server && npm run dev           # Development with nodemon
cd server && npm run migrate       # Run Sequelize migrations
cd server && npm run migrate:undo  # Rollback last migration
```

## Architecture & Structure

### Backend Architecture
The server uses a layered architecture:
- **Routes** (`server/routes/`): API endpoint definitions
- **Controllers** (`server/controllers/`): Business logic handling
- **Services** (`server/services/`): Core business services (odds API, betting, results)
- **Models** (`server/models/`): Sequelize database models
- **Migrations** (`server/migrations/`): Database schema changes

Key services:
- `oddsApiService.js`: External odds API integration and caching
- `betResultService.js`: Betting result calculation and settlement
- `exchangeWebSocketService.js`: Real-time exchange betting updates
- `gameResultService.js`: Sports game result fetching and processing

### Frontend Architecture
Next.js application with:
- **Pages** (`pages/`): Route components and API routes
- **Components** (`components/`): Reusable UI components
- **Contexts** (`contexts/`): React context providers (Auth, Exchange)
- **Hooks** (`hooks/`): Custom React hooks for data fetching
- **Stores** (`stores/`): Zustand state management
- **Utils** (`utils/`): Utility functions

### Database Architecture
PostgreSQL with Sequelize ORM:
- **Users**: User accounts with balance and admin levels
- **OddsCaches**: Cached sports betting odds
- **Bets**: Traditional betting records
- **ExchangeOrders**: Exchange betting orders (back/lay)
- **GameResults**: Sports game results for settlement
- **AdminCommissions**: Admin referral tracking

## Development Workflow

### Database Changes
1. Always create migrations for schema changes: `cd server && npx sequelize-cli migration:generate --name your-migration-name`
2. Implement migration in `server/migrations/`
3. Run migration: `npm run migrate`
4. Update corresponding Sequelize models in `server/models/`

### Sports Integration
The application supports multiple sports leagues with mapping in:
- `server/config/sportsMapping.js`: API key mappings
- `server/controllers/oddsController.js`: Sport key normalization
- Uses external APIs: Odds API and SportsDB for results

### Environment Management
- Development: Local PostgreSQL, `http://localhost:5050` API
- Production: Render PostgreSQL, `https://likebetfair.onrender.com` API
- Environment validation scripts available via `npm run check-env:*`
- See `docs/ENVIRONMENT_MANAGEMENT.md` for detailed environment setup

### Real-time Features
- WebSocket integration for exchange betting updates
- Scheduled jobs for odds updates and result processing
- Auto-settlement of bets based on game results

## Important Notes

### Database Considerations
- Uses both Knex (`knexfile.cjs`) and Sequelize for different operations
- Migrations run automatically in production on Render
- Balance fields are DECIMAL(10,2) for precision
- Foreign key relationships between orders and game results

### API Integration
- Odds API for real-time betting odds
- SportsDB API for game results
- Rate limiting and caching implemented
- Comprehensive error handling and logging

### Security
- JWT authentication with configurable expiration
- CORS configured for cross-origin requests
- Admin levels for different user permissions
- Input validation on all API endpoints

### Performance
- Optimized Next.js build with code splitting
- Database indexing on frequently queried fields
- Efficient WebSocket connection management
- Scheduled jobs to minimize real-time processing load

This is a complex betting platform requiring careful handling of financial data, real-time updates, and sports data integration. Always test thoroughly when making changes to betting logic or database schemas.