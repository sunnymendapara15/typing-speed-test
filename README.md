# Typing Speed Test

Full-stack typing practice built with a React frontend and FastAPI backend. It delivers random challenge text, tracks timing, calculates accuracy/WPM, and keeps a record of every submitted attempt so you can compare against the previous best.

## Features

- React-powered typing UI with a live timer, per-character feedback, and a clean responsiveness-first layout.
- FastAPI backend that distributes random snippets, stores completed attempts, and exposes best score history.
- Accuracy, WPM, and completion stats visible in real time plus a history of previous top scores.
- Persistent storage of submissions in a lightweight JSON file.

## Getting started

### Backend

1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate` *(Windows: `.venv\\Scripts\\activate`)*
4. `pip install -r requirements.txt`
5. `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

The backend exposes the API on port `8000` by default and will create `scores.json` for storage when the first result is saved.

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm start`

The React app proxies requests to the FastAPI backend thanks to the `proxy` entry in `package.json`. If you need to point to a different API host, set `REACT_APP_API_BASE` to that URL.

## API reference

- `GET /api/snippet` – returns a new random typing challenge.
- `POST /api/results` – accepts `{ wpm, accuracy, timestamp }` when a test is completed.
- `GET /api/best-scores` – returns the highest WPM/accuracy recorded plus the recent history of attempts.

## Next steps

- Deploy the backend to a lightweight service (e.g., Railway, Render) and the frontend to Vercel/Netlify.
- Add authentication if you want per-user scoreboards.
- Enhance snippets by loading them from a remote file or CMS for more variety.
