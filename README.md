# SocietyFlats - India's First Society Intelligence Platform

> **Making finding a home as transparent as booking a hotel.**

SocietyFlats is India's first Society Intelligence Platform that evaluates residential societies on 8 verified parameters before you even visit. Built for Gurgaon's premium rental market with plans to expand to Bangalore and other metros.

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| **Backend** | Laravel 12 + PHP 8.3 |
| **Database** | PostgreSQL 15 + PostGIS |
| **Search** | Meilisearch |
| **Cache** | Redis 7 |
| **Web Server** | Nginx + Cloudflare CDN |
| **Containerization** | Docker + Docker Compose |

## 📁 Project Structure

```
societyflats/
├── frontend/                 # React 19 SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/           # shadcn/ui primitives
│   │   │   ├── layout/       # Navbar, Footer
│   │   │   ├── society/      # SocietyScoreCard, SocietyCard
│   │   │   ├── search/       # SearchFilters, SearchResults
│   │   │   └── home/         # HeroSearch, FeaturedSection
│   │   ├── pages/            # Route-level pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── SocietyPage.tsx
│   │   │   ├── PropertyPage.tsx
│   │   │   ├── AIAdvisorPage.tsx
│   │   │   ├── ComparePage.tsx
│   │   │   ├── InsightsPage.tsx
│   │   │   ├── OwnerDashboard.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── services/         # API service layer
│   │   ├── store/            # Zustand state management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript interfaces
│   │   └── lib/              # Utility functions
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                  # Laravel 12 API
│   ├── app/
│   │   ├── Http/
│   │   │   └── Controllers/
│   │   │       └── Api/      # API controllers
│   │   │           ├── SocietyController.php
│   │   │           ├── PropertyController.php
│   │   │           ├── SearchController.php
│   │   │           ├── ReviewController.php
│   │   │           ├── LeadController.php
│   │   │           ├── AIController.php
│   │   │           └── AuthController.php
│   │   ├── Models/           # Eloquent models
│   │   │   ├── Society.php
│   │   │   ├── Property.php
│   │   │   ├── User.php
│   │   │   └── ...
│   │   └── Services/         # Business logic services
│   ├── database/
│   │   ├── schema.sql        # Complete PostgreSQL schema
│   │   └── seeders.sql       # Real Gurgaon market data
│   ├── routes/
│   │   └── api.php           # REST API routes
│   ├── config/
│   └── Dockerfile
│
├── docker/                   # Docker configuration
│   └── nginx/
│       └── nginx.conf
│
├── docker-compose.yml        # Full stack orchestration
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- PHP 8.3+ & Composer (for local backend development)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/societyflats/societyflats.git
cd societyflats

# Start all services
docker-compose up -d

# Run database migrations and seeders
docker-compose exec backend php artisan migrate --seed

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:8000/api/v1
# Meilisearch: http://localhost:7700
```

### Local Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

## 📊 Database Schema

The platform uses a comprehensive PostgreSQL schema with:

- **Core Tables**: builders, localities, societies, properties
- **User Management**: users, saved_searches, shortlists
- **Review Ecosystem**: reviews, review_helpful_votes
- **Lead Management**: leads, lead_activities, tenant_requirements
- **Verification**: verification_requests
- **Payments**: subscription_plans, subscriptions, payments
- **Content**: blog_posts, seo_pages
- **System**: notifications, audit_logs

### Society Intelligence Scoring

Each society is scored on 8 weighted parameters:

| Parameter | Weight | Description |
|-----------|--------|-------------|
| Security | 20% | Guards, CCTV, access control |
| Maintenance | 20% | Upkeep quality, response time |
| Amenities | 15% | Pools, gyms, clubhouses |
| Connectivity | 15% | Metro, roads, airport access |
| Family Friendly | 10% | Schools, parks, safety |
| Pet Friendly | 5% | Pet policies & spaces |
| Construction Quality | 10% | Build quality & materials |
| Rental Demand | 5% | Market popularity |

## 🔌 API Endpoints

### Societies
```
GET    /api/v1/societies              # List societies with filters
GET    /api/v1/societies/featured     # Featured societies
GET    /api/v1/societies/{slug}       # Society details
GET    /api/v1/societies/{id}/intelligence  # Intelligence scores
GET    /api/v1/societies/{id}/properties    # Properties in society
GET    /api/v1/societies/{id}/reviews       # Society reviews
```

### Properties
```
GET    /api/v1/properties             # List properties
GET    /api/v1/properties/{slug}      # Property details
GET    /api/v1/properties/{id}/similar # Similar properties
```

### Search
```
GET    /api/v1/search                 # Search with filters
GET    /api/v1/search/autocomplete    # Autocomplete suggestions
```

### AI
```
POST   /api/v1/ai/recommendations    # AI-powered recommendations
GET    /api/v1/ai/rent-estimate       # Rent estimation
```

### Auth
```
POST   /api/v1/auth/register        # User registration
POST   /api/v1/auth/login           # Email/password login
POST   /api/v1/auth/otp/send        # Send OTP
POST   /api/v1/auth/otp/verify      # Verify OTP & login
GET    /api/v1/user                 # Current user
```

## 🎨 Design System

### Colors
- **Navy**: #1a365d (Primary brand color)
- **Ivory**: #fdfcf9 (Background)
- **Gold**: #c9a84c (Accent)

### Typography
- **Display**: Playfair Display (headings)
- **Body**: Inter (UI text)

### Components
- Society Score Card with animated progress bars
- Intelligence Meter with color-coded scores
- Glass Card overlays for hero sections
- Responsive grid layouts for all screen sizes

## 🧠 AI Advisor

The AI Rental Advisor uses a multi-parameter matching algorithm:

1. **Budget Analysis** (30%): Matches rent to budget with tolerance
2. **Priority Matching** (40%): Scores based on user-selected priorities
3. **Lifestyle Factors** (10%): Pet-friendly, family size
4. **Overall Quality** (20%): Society intelligence score

## 📈 Market Data

The seed data includes real Gurgaon market information:

- **12 Localities**: DLF Phase 1-5, Golf Course Road, Golf Course Extension, Sohna Road, etc.
- **12 Societies**: DLF The Aralias, Park Place, M3M Golf Estate, Ireo Corridors, etc.
- **15 Properties**: Real rent data ranging from ₹32K to ₹1.5L/month
- **Real Scores**: Intelligence scores based on actual market research

## 🔒 Security

- JWT-based authentication via Laravel Sanctum
- Rate limiting on API endpoints
- SQL injection protection via Eloquent ORM
- XSS protection via React's built-in escaping
- CSRF protection on all forms

## 🚢 Deployment

### Production Checklist
- [ ] Set APP_ENV=production
- [ ] Generate strong APP_KEY
- [ ] Configure SSL certificates
- [ ] Set up Cloudflare CDN
- [ ] Configure AWS S3 for image storage
- [ ] Set up Meilisearch production instance
- [ ] Configure Redis for caching
- [ ] Set up monitoring (Sentry, New Relic)
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

## 📱 PWA Features

- Service Worker for offline capability
- Manifest.json for installability
- Push notifications for new leads
- Background sync for saved searches

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential. All rights reserved.

## 📞 Contact

- **Website**: [societyflats.in](https://societyflats.in)
- **Email**: hello@societyflats.in
- **Phone**: +91 99999 88888
- **Address**: DLF Cyber City, Gurgaon, Haryana 122002

---

Built with ❤️ in Gurgaon, India
