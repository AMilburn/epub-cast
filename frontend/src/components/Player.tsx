"use client";

import { useState, useEffect, useRef } from "react";
import ePub, { Book } from "epubjs";
import { Sidebar } from "./player/Sidebar";
import { MainContent } from "./player/MainContent";
import { AudioControls } from "./player/AudioControls";
import { synthesizeAudio } from "@/lib/tts";

interface PlayerProps {
    file: File;
    onBack: () => void;
}

export default function Player({ file, onBack }: PlayerProps) {
    const [book, setBook] = useState<Book | null>(null);
    const [toc, setToc] = useState<any[]>([]);
    const [currentChapter, setCurrentChapter] = useState<any | null>(null);
    const [chapterText, setChapterText] = useState<string>("");
    const [metadata, setMetadata] = useState<any>({});
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState("en-US-SteffanNeural");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const bookData = e.target?.result as ArrayBuffer;
            const newBook = ePub(bookData);
            setBook(newBook);

            newBook.ready.then(() => {
                setToc(newBook.navigation.toc);
                setMetadata((newBook as any).package.metadata);

                newBook.coverUrl().then(url => {
                    setCoverUrl(url);
                });
            });
        };
        reader.readAsArrayBuffer(file);

        return () => {
            if (book) {
                book.destroy();
            }
        };
    }, [file]);

    const loadChapterText = async (href: string) => {
        if (!book) return;
        try {
            const spineItem = book.spine.get(href);
            if (spineItem) {
                const doc = await spineItem.load(book.load.bind(book)) as Document | any;
                const text = doc?.body?.textContent || doc?.documentElement?.textContent || doc?.textContent || (typeof doc === 'string' ? doc : "") || "Could not extract text from chapter.";
                setChapterText(text);
                return text;
            }
        } catch (e) {
            console.error("Error loading chapter text", e);
        }
    };

    const selectChapter = async (item: any) => {
        setCurrentChapter(item);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setAudioUrl(null);
        await loadChapterText(item.href);
    };

    const handlePlayPause = async () => {
        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
        } else {
            if (audioUrl) {
                audioRef.current?.play();
                setIsPlaying(true);
            } else if (chapterText) {
                setIsLoadingAudio(true);
                const { url, error } = await synthesizeAudio(chapterText, selectedVoice);
                setIsLoadingAudio(false);
                if (url) {
                    setAudioUrl(url);
                    setIsPlaying(true);
                } else {
                    console.error("Synthesize failed", error);
                }
            }
        }
    }

    const handleVoiceChange = async (newVoice: string) => {
        setSelectedVoice(newVoice);

        if (currentChapter && chapterText) {
            setIsPlaying(false);
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setAudioUrl(null);

            setIsLoadingAudio(true);
            const { url, error } = await synthesizeAudio(chapterText, newVoice);
            setIsLoadingAudio(false);

            if (url) {
                setAudioUrl(url);
                setIsPlaying(true);
            } else {
                console.error("Synthesize failed", error);
            }
        }
    };

    const handleDownload = async () => {
        if (!currentChapter) return;

        if (audioUrl) {
            const a = document.createElement("a");
            a.href = audioUrl;
            a.download = `${currentChapter.label.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (chapterText) {
            setIsLoadingAudio(true);
            const { url, error } = await synthesizeAudio(chapterText, selectedVoice);
            setIsLoadingAudio(false);
            if (url) {
                setAudioUrl(url);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${currentChapter.label.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                console.error("Synthesize failed", error);
            }
        }
    };

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {isSidebarOpen && (
                <Sidebar
                    onBack={onBack}
                    coverUrl={coverUrl}
                    metadata={metadata}
                    toc={toc}
                    currentChapter={currentChapter}
                    onSelectChapter={selectChapter}
                    selectedVoice={selectedVoice}
                    onVoiceChange={handleVoiceChange}
                />
            )}

            <div className="flex-1 flex flex-col h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background relative">
                <MainContent
                    currentChapter={currentChapter}
                    chapterText={chapterText}
                />

                <AudioControls
                    isPlaying={isPlaying}
                    isLoadingAudio={isLoadingAudio}
                    currentChapter={currentChapter}
                    metadata={metadata}
                    onPlayPause={handlePlayPause}
                    onDownload={handleDownload}
                    onToggleChapterList={() => setIsSidebarOpen(!isSidebarOpen)}
                />

                {audioUrl && (
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        autoPlay
                        className="hidden"
                    />
                )}
            </div>
        </div>
    );
}
