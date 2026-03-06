// edge-tts API interactions

export interface SynthesizeAudioResult {
    url: string | null;
    error?: string;
}

/**
 * Sends text to the TTS backend and returns an object URL for the resulting audio.
 */
export const synthesizeAudio = async (text: string, voice: string = "en-US-AriaNeural", endpoint: string = "http://localhost:8000/synthesize"): Promise<SynthesizeAudioResult> => {
    try {
        const formData = new FormData();
        // Assuming MVP chunking - we limit text to 5000 chars to avoid timeouts for now
        formData.append("text", text.slice(0, 5000));
        formData.append("voice", voice);

        const response = await fetch(endpoint, {
            method: "POST",
            body: formData,
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            return { url };
        } else {
            console.error("Synthesize failed with status:", response.status);
            return { url: null, error: `Failed with status ${response.status}` };
        }
    } catch (error: any) {
        console.error("Error connecting to TTS backend", error);
        return { url: null, error: error.message };
    }
};
