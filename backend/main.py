"""
EpubCast Backend Service

This FastAPI service provides an API for generating text-to-speech (TTS) audio.
It serves as the backend for the EpubCast frontend, handling requests to convert 
parsed EPUB text content into MP3 audio streams using the edge-tts library.
"""

from fastapi import FastAPI, BackgroundTasks, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import edge_tts
import uuid
import os
import asyncio

app = FastAPI(
    title="EpubCast API",
    description="Text-to-Speech API for the EpubCast application.",
    version="1.0.0"
)

# Configure Cross-Origin Resource Sharing (CORS)
# This enables the Next.js frontend to securely consume this API.
# For production deployment, `allow_origins` should be restricted 
# to the specific domains hosting the frontend applications.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage for generated audio artifacts.
# We use a local cache directory to store temporary audio files before serving them.
os.makedirs("audio_cache", exist_ok=True)

# Define the default voice model. This can be overridden by the client per request.
# The AriaNeural model provides a natural, conversational tone suitable for audiobooks.
VOICE = "en-US-AriaNeural"

@app.get("/", tags=["Health"])
def read_root():
    """
    Health check endpoint to verify the service is operational.
    """
    return {"message": "EpubCast API is running and ready to accept requests."}

@app.post("/synthesize", tags=["Audio Generation"])
async def synthesize_audio(
    text: str = Form(..., description="The text content to be synthesized into audio."),
    voice: str = Form("en-US-AriaNeural", description="The Microsoft Edge TTS voice identifier."),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Synthesizes speech from text and returns an audio file.
    
    This endpoint:
    1. Validates the incoming text payload.
    2. Uses the edge-tts engine to asynchronously generate an MP3 file.
    3. Streams the generated file back to the client for immediate playback.
    """
    if not text or len(text.strip()) == 0:
        return JSONResponse(status_code=400, content={"error": "Text payload is empty or invalid."})

    # Architecture Note: 
    # For very large texts (e.g., entire chapters), the frontend is responsible for 
    # chunking the content. This prevents API timeouts and ensures we stay within TTS service limits.
    
    # Generate a unique identifier for the audio artifact to prevent file collisions
    file_id = str(uuid.uuid4())
    output_path = f"audio_cache/{file_id}.mp3"
    
    try:
        # Utilize the asynchronous interface of edge-tts for non-blocking audio generation
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_path)
        
        # Note on caching strategy:
        # Files are temporarily persisted on disk rather than streaming directly from memory.
        # This allows the frontend audio player to support features like seeking and 
        # repeating sections without needing to regenerate the underlying audio payload. 
        # In a scaled production environment, this could be extended to use a distributed 
        # object store (e.g., AWS S3) and an automated cache eviction policy.
        return FileResponse(output_path, media_type="audio/mpeg", filename=f"{file_id}.mp3")
        
    except Exception as e:
        # In a real production system, this exception would be logged to monitoring services
        return JSONResponse(status_code=500, content={"error": f"Internal server error during synthesis: {str(e)}"})

if __name__ == "__main__":
    import uvicorn
    # Run the ASGI server with Uvicorn.
    # In a production environment, this would typically be managed by Gunicorn with Uvicorn workers.
    uvicorn.run(app, host="0.0.0.0", port=8000)
