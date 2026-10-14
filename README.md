# E-learning

Internal training platform for company operators: courses with lessons, videos and tests, built from
company documents with the help of AI. Sign-in with a company email and password; roles are
**Admin**, **Manager** (Руководитель / Rahbar) and **Employee**. Interface in Uzbek and Russian.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React (Vite)
- **AI:** Claude API (lessons and tests drafted from an uploaded document)
- **Run:** Docker Compose

## Quick start

```bash
cp .env.example .env      # fill in ANTHROPIC_API_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up --build
```

Open http://localhost:8080 and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
The SQLite database and uploaded videos live in `./data`.

## How a course is made

1. Admin opens **Manage courses** and uploads a PDF, DOCX or TXT document.
2. Claude drafts the course: lessons (Markdown, with client-conversation examples) and a multiple-choice test, in Uzbek or Russian.
3. The course is saved as a **draft**. The admin edits lessons and questions, attaches videos (upload a file or paste a YouTube link) and publishes.
4. Employees see published courses, go through lessons, and take the test. The best score and pass/fail are stored.

Courses can also be created by hand.

## Development

```bash
# backend
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
cp ../.env.example .env
.venv/bin/uvicorn app.main:app --reload     # http://localhost:8000/docs
.venv/bin/pytest

# frontend (proxies /api to localhost:8000)
cd frontend
npm install
npm run dev                                  # http://localhost:5173
```

## Roadmap

- [x] Login, roles, uz/ru interface
- [x] Courses from documents (AI draft, admin review), videos, tests
- [ ] Telegram bot: link account, new video lesson notifications, daily lesson reminders, videos sent to chat
- [ ] Operator practice scenarios, FAQ / knowledge base with search, manager progress dashboard
