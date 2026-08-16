# MYSTIQ — Every Clue Matters

A premium, cinematic murder-mystery investigation web application for college events.

## Quick Start

### Backend (FastAPI + Python)

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API server starts at `http://localhost:8000`.

### Frontend (React + TypeScript + Vite)

```bash
npm install
npm run dev
```

The frontend starts at `http://localhost:3000` and proxies API calls to the backend.

## Admin Access

- URL: `http://localhost:3000/admin`
- Username: `admin`
- Password: `mystiq2024`

## Architecture

- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, Zustand, Howler.js
- **Backend:** FastAPI, SQLAlchemy (async), SQLite (dev), Pydantic
- **Database:** SQLite for development (auto-created at `backend/mystiq.db`)

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   │   ├── effects/        # Visual effects (particles, grain, grid)
│   │   └── ui/             # UI components (panels, modals, etc.)
│   ├── lib/                # Utilities (API, store, sounds, data)
│   └── pages/              # Page components
│       └── admin/          # Admin dashboard pages
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── routes/         # API route handlers
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── auth.py         # Authentication
│   │   ├── database.py     # Database setup
│   │   ├── config.py       # Configuration
│   │   └── seed.py         # Initial data seeding
│   ├── requirements.txt
│   └── run.py
└── public/
    └── sounds/             # Sound effect files (add .mp3 files here)
```

## Features

- Cinematic opening experience with particles and animations
- Randomized qualification quiz (5 correct answers required)
- 10 themed case identities with unique colors and icons
- Physical clue reveal with typewriter animation
- Final code verification with forensic scanning animation
- Professional admin dashboard (Case Command Center)
- Question bank management (CRUD + bulk import)
- Live participant tracking
- Event reset controls
- Mobile-first responsive design
- Film grain and particle effects
- Smooth Framer Motion transitions throughout

## Sound Effects

Place `.mp3` files in `public/sounds/` with these names:
- `click.mp3`, `correct.mp3`, `incorrect.mp3`
- `unlock.mp3`, `reveal.mp3`, `verify.mp3`
- `success.mp3`, `reject.mp3`, `transition.mp3`

Sounds are optional — the app works without them.
