# Project Overview

## Tech Stack

### Frontend
- **Framework**: React + TypeScript
- **UI Library**: Custom CSS + React Components
- **State Management**: React Hooks + Context API
- **API Client**: Axios with Auth0 integration
- **Deployment**: Railway (intuitive-learning-production.up.railway.app)

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: AWS RDS PostgreSQL
  - Host: `eonmeds-dev-db.cxy4o6eyy4sq.us-west-2.rds.amazonaws.com`
  - Port: `5432`
  - Database: `eonmeds`
  - Instance: `db.t3.micro`
- **ORM/Query Builder**: Direct SQL with `pg` library (no ORM)
- **Authentication**: Auth0 with JWT
- **Payment Processing**: Stripe
- **AI Integration**: OpenAI GPT-4
- **Deployment**: Railway (eonmeds-platform2025-production.up.railway.app)

### Infrastructure
- **Database Hosting**: AWS RDS (PostgreSQL)
- **Application Hosting**: Railway
- **Domain**: eonmeds.com (pending)
- **SSL**: Enabled on all services
- **Environment**: Production + Development

### Key Services
- **Auth Provider**: Auth0
  - Domain: `eonmeds.us.auth0.com`
  - Audience: `https://api.eonmeds.com`
- **Payment**: Stripe (Live mode in production)
- **Webhooks**: HeyFlow integration for patient intake
- **Email**: (TBD - SendGrid/AWS SES planned)

### Development Tools
- **Version Control**: Git + GitHub
- **Package Manager**: npm (with lerna for monorepo)
- **Build Tools**: TypeScript compiler + nodemon
- **Testing**: Jest (planned)
- **Linting**: ESLint

### Security & Compliance
- **HIPAA Compliance**: Audit logging, encrypted connections
- **Authentication**: JWT with refresh tokens
- **API Security**: Rate limiting, CORS, Helmet.js
- **Database**: SSL/TLS required, encrypted at rest

### API Structure
- **Base URL**: `https://eonmeds-platform2025-production.up.railway.app/api/v1`
- **Auth Endpoints**: `/auth/*`
- **Patient Management**: `/patients/*`
- **Billing**: `/billing/*`, `/payments/*`
- **Webhooks**: `/webhooks/*` (no auth required)

### GitHub Repository
- **Organization**: eonpro
- **Repository**: eonmeds-platform2025
- **URL**: https://github.com/eonpro/eonmeds-platform2025

### Environment Variables
Key environment variables required:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `JWT_SECRET` (for legacy auth)
- `HEYFLOW_WEBHOOK_SECRET`

### Current Status
- ✅ Backend API operational
- ✅ Frontend application deployed
- ✅ Database connected and running
- ✅ Auth0 integration working
- ✅ Stripe payment processing active
- ✅ Invoice generation fixed (INV-2025-XXXXX format)
- ⚠️  Some users need to re-login for refresh tokens

### Known Issues
- Auth0 refresh token errors for old sessions (users need to re-login)
- Multiple merge conflicts in current branch (34 files)

### Quick Start
```bash
# Clone repository
git clone https://github.com/eonpro/eonmeds-platform2025.git

# Install dependencies
cd eonmeds-platform2025
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your credentials

# Start development
cd packages/backend && npm run dev
cd packages/frontend && npm start
```

### Support Contacts
- Technical Issues: Create GitHub issue
- Security Concerns: Email security@eonmeds.com
- Business Inquiries: Contact admin team
