"use client";

import { useState, useEffect, useRef } from "react";
import ePub, { Book } from "epubjs";
import { Sidebar } from "./player/Sidebar";
import { MainContent } from "./player/MainContent";
import { AudioControls } from "./player/AudioControls";
import { synthesizeAudio } from "@/lib/tts";
import { savePosition, updateBookCover } from "@/lib/storage";

interface PlayerProps {
    file: File;
    onBack: () => void;
    initialChapterHref?: string;
    initialTime?: number;
}

const BLOCK_ELEMENTS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "section", "article", "tr", "dd", "dt"]);
const SKIP_ELEMENTS = new Set(["head", "script", "style", "nav"]);

function walkText(node: Element): string {
    const parts: string[] = [];
    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
            parts.push(child.textContent ?? "");
        } else if (child.nodeType === 1) {
            const el = child as Element;
            const name = el.localName;
            if (SKIP_ELEMENTS.has(name)) continue;
            const epubType = el.getAttribute("epub:type");
            if (
                epubType?.includes("pagebreak") ||
                el.getAttribute("role") === "doc-pagebreak" ||
                el.getAttribute("aria-hidden") === "true"
            ) continue;
            const inner = walkText(el);
            if (name === "br") {
                parts.push("\n");
            } else if (BLOCK_ELEMENTS.has(name)) {
                const trimmed = inner.trim();
                if (trimmed) parts.push("\n\n" + trimmed);
            } else {
                parts.push(inner);
            }
        }
    }
    return parts.join("");
}

function extractReadableText(doc: Document | any, chapterLabel?: string): string {
    const findChild = (root: Element, localName: string): Element | null => {
        for (const child of Array.from(root.children ?? [])) {
            if (child.localName === localName) return child;
        }
        return null;
    };

    const root: Element | null =
        doc?.body ??
        doc?.documentElement ??
        (doc?.localName === "html" ? doc : null) ??
        doc ?? null;

    if (!root) return typeof doc === "string" ? doc : "";

    const body = root.localName === "html" ? (findChild(root, "body") ?? root) : root;

    try {
        let text = walkText(body).replace(/\n{3,}/g, "\n\n").trim();

        // Strip the leading paragraph if it duplicates the chapter label shown in the header
        if (chapterLabel) {
            const normalize = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
            const paragraphs = text.split("\n\n");
            if (paragraphs.length > 1 && normalize(paragraphs[0]).includes(normalize(chapterLabel))) {
                text = paragraphs.slice(1).join("\n\n").trim();
            }
        }

        return text || body.textContent?.trim() || "";
    } catch {
        return body.textContent?.trim() ?? "";
    }
}

export default function Player({ file, onBack, initialChapterHref, initialTime }: PlayerProps) {
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
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const pendingTimeRef = useRef<number | null>(initialTime ?? null);
    const currentChapterRef = useRef<{ href: string; label: string } | null>(null);
    const lastSaveRef = useRef<number>(0);
    const hasAutoSelectedRef = useRef(false);

    const isPdf = file.name.endsWith(".pdf") || file.type === "application/pdf";
    const pdfGetPageTextRef = useRef<((pageIndex: number) => Promise<string>) | null>(null);

    useEffect(() => {
        let localBook: Book | null = null;

        if (isPdf) {
            import("@/lib/pdf").then(({ loadPdf }) => {
                loadPdf(file).then(({ toc, getPageText, title }: { toc: { id: string; label: string; href: string }[]; getPageText: (pageIndex: number) => Promise<string>; title: string }) => {
                    setToc(toc);
                    setMetadata({ title, creator: "" });
                    setCoverUrl(null);
                    pdfGetPageTextRef.current = getPageText;
                }).catch((error: unknown) => {
                    console.error("Failed to load PDF", error);
                });
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const bookData = e.target?.result as ArrayBuffer;
                localBook = ePub(bookData);
                setBook(localBook);

                localBook.ready.then(() => {
                    if (!localBook) return;
                    setToc(localBook.navigation.toc);
                    setMetadata((localBook as Book & { package: { metadata: Record<string, string> } }).package.metadata);

                    localBook.coverUrl().then(async (url) => {
                        setCoverUrl(url);
                        if (!url) return;
                        try {
                            const resp = await fetch(url);
                            const blob = await resp.blob();
                            const reader2 = new FileReader();
                            reader2.onload = () => {
                                updateBookCover(file.name, reader2.result as string).catch(() => {});
                            };
                            reader2.readAsDataURL(blob);
                        } catch {
                            // non-critical
                        }
                    });
                });
            };
            reader.readAsArrayBuffer(file);
        }

        return () => {
            if (localBook) {
                localBook.destroy();
                setBook(null);
            }
        };
    }, [file, isPdf]);

    // Acquire/release screen wake lock based on playback state
    useEffect(() => {
        if (!("wakeLock" in navigator)) return;

        if (isPlaying) {
            navigator.wakeLock.request("screen")
                .then(lock => { wakeLockRef.current = lock; })
                .catch(err => console.warn("Wake lock request failed:", err));
        } else {
            wakeLockRef.current?.release().then(() => { wakeLockRef.current = null; });
        }
    }, [isPlaying]);

    // Auto-restore saved chapter when TOC becomes available
    useEffect(() => {
        if (!initialChapterHref || hasAutoSelectedRef.current || toc.length === 0) return;
        hasAutoSelectedRef.current = true;
        const saved = toc.find((item: { href: string }) => item.href === initialChapterHref);
        if (saved) selectChapter(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toc]);

    // Re-acquire wake lock if page becomes visible again while playing
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && isPlaying && !wakeLockRef.current) {
                navigator.wakeLock?.request("screen")
                    .then(lock => { wakeLockRef.current = lock; })
                    .catch(err => console.warn("Wake lock re-acquire failed:", err));
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isPlaying]);

    const loadChapterText = async (href: string, label?: string) => {
        if (isPdf) {
            const pageIndex = parseInt(href, 10);
            if (!isNaN(pageIndex) && pdfGetPageTextRef.current) {
                try {
                    const text = await pdfGetPageTextRef.current(pageIndex);
                    setChapterText(text);
                    return text;
                } catch (e) {
                    console.error("Error loading PDF page text", e);
                }
            }
            return;
        }

        if (!book) return;
        try {
            const spineItem = book.spine.get(href);
            if (spineItem) {
                const doc = await spineItem.load(book.load.bind(book)) as Document | any;
                const text = extractReadableText(doc, label) || "Could not extract text from chapter.";
                setChapterText(text);
                return text;
            }
        } catch (e) {
            console.error("Error loading chapter text", e);
        }
    };

    const selectChapter = async (item: any) => {
        setCurrentChapter(item);
        currentChapterRef.current = { href: item.href, label: item.label };
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setAudioUrl(null);
        setCurrentTime(0);
        setDuration(0);
        savePosition(file.name, { chapterHref: item.href, chapterLabel: item.label, currentTime: 0 });
        await loadChapterText(item.href, item.label);
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
    };

    const handleVoiceChange = async (newVoice: string) => {
        setSelectedVoice(newVoice);

        if (currentChapter && chapterText) {
            setIsPlaying(false);
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setAudioUrl(null);
            setCurrentTime(0);
            setDuration(0);

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

    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
    }, [playbackSpeed, audioUrl]);

    const handleSeek = (time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
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
                    playbackSpeed={playbackSpeed}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={handlePlayPause}
                    onDownload={handleDownload}
                    onToggleChapterList={() => setIsSidebarOpen(!isSidebarOpen)}
                    onSpeedChange={(speed) => {
                        setPlaybackSpeed(speed);
                        if (audioRef.current) audioRef.current.playbackRate = speed;
                    }}
                    onSeek={handleSeek}
                />

                {audioUrl && (
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        onTimeUpdate={() => {
                            const time = audioRef.current?.currentTime ?? 0;
                            setCurrentTime(time);
                            const now = Date.now();
                            if (currentChapterRef.current && now - lastSaveRef.current > 10_000) {
                                lastSaveRef.current = now;
                                savePosition(file.name, {
                                    chapterHref: currentChapterRef.current.href,
                                    chapterLabel: currentChapterRef.current.label,
                                    currentTime: time,
                                });
                            }
                        }}
                        onLoadedMetadata={() => {
                            setDuration(audioRef.current?.duration ?? 0);
                            if (pendingTimeRef.current !== null && audioRef.current) {
                                audioRef.current.currentTime = pendingTimeRef.current;
                                setCurrentTime(pendingTimeRef.current);
                                pendingTimeRef.current = null;
                            }
                        }}
                        autoPlay
                        className="hidden"
                    />
                )}
            </div>
        </div>
    );
}
