# EpubCast

A full-stack application to turn EPUB files into podcasts using AI text-to-speech (Edge TTS).

## Structure

- `/frontend`: Next.js application for UI and EPUB parsing.
- `/backend`: Python FastAPI server for high-quality audio synthesis.

## Getting Started

### 1. Start the Backend
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.
