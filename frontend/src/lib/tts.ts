// edge-tts API interactions

export interface SynthesizeAudioResult {
    url: string | null;
    error?: string;
}

const CHUNK_SIZE = 4500;

function chunkText(text: string): string[] {
    const chunks: string[] = [];
    let remaining = text.trim();

    while (remaining.length > CHUNK_SIZE) {
        const slice = remaining.slice(0, CHUNK_SIZE);
        const lastBoundary = Math.max(
            slice.lastIndexOf('. '),
            slice.lastIndexOf('? '),
            slice.lastIndexOf('! '),
            slice.lastIndexOf('.\n'),
            slice.lastIndexOf('?\n'),
            slice.lastIndexOf('!\n'),
        );

        let splitAt: number;
        if (lastBoundary > 0) {
            splitAt = lastBoundary + 1;
        } else {
            const lastSpace = slice.lastIndexOf(' ');
            splitAt = lastSpace > 0 ? lastSpace : CHUNK_SIZE;
        }

        chunks.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
    }

    if (remaining.length > 0) {
        chunks.push(remaining);
    }

    return chunks;
}

async function synthesizeChunk(text: string, voice: string, endpoint: string): Promise<Blob | null> {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("voice", voice);

    const response = await fetch(endpoint, { method: "POST", body: formData });

    if (!response.ok) {
        console.error("Chunk synthesis failed with status:", response.status);
        return null;
    }

    return response.blob();
}

export const synthesizeAudio = async (
    text: string,
    voice: string = "en-US-AriaNeural",
    endpoint: string = "http://localhost:8000/synthesize",
    onProgress?: (current: number, total: number) => void,
): Promise<SynthesizeAudioResult> => {
    try {
        const chunks = chunkText(text);
        const blobs: Blob[] = [];

        for (let i = 0; i < chunks.length; i++) {
            onProgress?.(i, chunks.length);
            const blob = await synthesizeChunk(chunks[i], voice, endpoint);
            if (!blob) {
                return { url: null, error: `Failed to synthesize chunk ${i + 1} of ${chunks.length}` };
            }
            blobs.push(blob);
        }

        onProgress?.(chunks.length, chunks.length);
        const combined = new Blob(blobs, { type: "audio/mpeg" });
        return { url: URL.createObjectURL(combined) };
    } catch (error: any) {
        console.error("Error connecting to TTS backend", error);
        return { url: null, error: error.message };
    }
};
