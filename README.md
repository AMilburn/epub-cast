# EpubCast

A full-stack application to turn EPUB files into podcasts using AI text-to-speech (Edge TTS).

> **Status**: Working prototype — actively under development 🚀

<table>
  <tr>
    <td><img src="/assets/EpubCast-homescreen.png" width="100%" /></td>
    <td><img src="/assets/EpubCast-chapter.png" width="100%" /></td>
  </tr>
</table>

## Overview

EpubCast transforms your EPUB books into natural-sounding audio files. Upload an EPUB, customize voice settings, and generate a podcast-style audio version of your book. Perfect for enjoying books while commuting, exercising, or multitasking.

## Current Features

- ✅ EPUB file upload and parsing
- ✅ Text extraction from EPUB chapters
- ✅ Multiple AI voice options via Edge TTS
- ✅ Adjustable speech rate and pitch
- ✅ Real-time audio generation

## Tech Stack

**Frontend**

- Next.js 16.2.1 (React 19)
- TypeScript
- Tailwind CSS
- EPUB.js for book parsing

**Backend**

- Python 3.9+
- FastAPI
- Edge TTS (Microsoft's text-to-speech)
- Uvicorn

## Project Structure

- `/frontend`: Next.js application for UI and EPUB parsing
- `/backend`: Python FastAPI server for audio synthesis

## Getting Started

### 1. Start the Backend

```bash
cd backend
python3 -m venv venv
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

### Try It Out

A sample EPUB file is included in this repository to help you get started immediately:

- **Sample Book:** *Wuthering Heights* by Emily Brontë (public domain)
- **Location:** `/sample/WutheringHeights.epub`
- **Download:** [WutheringHeights.epub](https://raw.githubusercontent.com/AMilburn/epub-cast/main/sample/WutheringHeights.epub)

Simply upload this file in the app to test the audio generation and voice selection features.

## Known Limitations & WIP Items

- Single file processing only (batch mode coming soon)
- Edge TTS rate limits apply for large files
- Audio generation can be slow for long books (optimization in progress)
- Web-based audio editing not yet implemented
- No persistent file storage (sessions cleared on restart)

## Roadmap (Priority Order)

- [ ] Database persistence - store progress, books, and conversion history
- [ ] PDF file support - extend beyond EPUB to PDF documents
- [ ] Improve voice selection UX - streamline switching between voices
- [ ] Performance optimization - faster audio generation and processing
- [ ] Smart content filtering - skip metadata/headers (source citations, etc.)
- [ ] User authentication - accounts and saved projects
- [ ] Cloud deployment - host application on production platform

## Contributing

This is an active portfolio project. Feedback and suggestions are welcome!

## License

MIT
