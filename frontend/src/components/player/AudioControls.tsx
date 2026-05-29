import { Play, Pause, SkipBack, SkipForward, List, Volume2, Loader2, Download } from "lucide-react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioControlsProps {
    isPlaying: boolean;
    isLoadingAudio: boolean;
    currentChapter: any | null;
    metadata: any;
    playbackSpeed: number;
    currentTime: number;
    duration: number;
    onPlayPause: () => void;
    onDownload: () => void;
    onToggleChapterList: () => void;
    onSpeedChange: (speed: number) => void;
    onSeek: (time: number) => void;
}

export function AudioControls({
    isPlaying,
    isLoadingAudio,
    currentChapter,
    metadata,
    playbackSpeed,
    currentTime,
    duration,
    onPlayPause,
    onDownload,
    onToggleChapterList,
    onSpeedChange,
    onSeek,
}: AudioControlsProps) {
    const cycleSpeed = () => {
        const currentIndex = SPEEDS.indexOf(playbackSpeed);
        const nextIndex = (currentIndex + 1) % SPEEDS.length;
        onSpeedChange(SPEEDS[nextIndex]);
    };

    return (
        <div className="glass px-6 pt-3 pb-4 flex flex-col border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-10">
            {/* Seek bar */}
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    step={0.1}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    disabled={duration === 0}
                    className="flex-1 h-1 accent-white cursor-pointer disabled:cursor-default disabled:opacity-30"
                />
                <span className="text-xs text-gray-500 w-10 tabular-nums">{formatTime(duration)}</span>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 w-1/3">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                        {isPlaying ? (
                            <div className="flex gap-1">
                                <div className="w-1 h-4 bg-blue-500 animate-[bounce_1s_infinite_0ms]"></div>
                                <div className="w-1 h-5 bg-blue-500 animate-[bounce_1s_infinite_100ms]"></div>
                                <div className="w-1 h-3 bg-blue-500 animate-[bounce_1s_infinite_200ms]"></div>
                            </div>
                        ) : <Volume2 />}
                    </div>
                    <div className="truncate">
                        <p className="text-sm font-semibold truncate text-white">{currentChapter?.label || "No chapter selected"}</p>
                        <p className="text-xs text-gray-400 truncate">{metadata?.title}</p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center w-1/3 max-w-md gap-2">
                    <div className="flex items-center gap-6">
                        <button className="text-gray-400 hover:text-white transition hover:scale-110 disabled:opacity-50" disabled={!currentChapter}>
                            <SkipBack size={20} />
                        </button>

                        <button
                            onClick={onPlayPause}
                            disabled={!currentChapter}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!currentChapter ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-white text-black hover:scale-105 hover:bg-gray-100 shadow-xl shadow-white/10'}`}
                        >
                            {isLoadingAudio ? (
                                <Loader2 size={24} className="animate-spin text-gray-800" />
                            ) : isPlaying ? (
                                <Pause size={24} className="fill-current" />
                            ) : (
                                <Play size={24} className="fill-current ml-1" />
                            )}
                        </button>

                        <button className="text-gray-400 hover:text-white transition hover:scale-110 disabled:opacity-50" disabled={!currentChapter}>
                            <SkipForward size={20} />
                        </button>
                    </div>
                </div>

                <div className="w-1/3 flex justify-end items-center gap-4 text-gray-400">
                    <button
                        onClick={cycleSpeed}
                        className="hover:text-white transition hover:scale-110 text-xs font-semibold w-10 text-center tabular-nums"
                        title="Playback speed"
                    >
                        {playbackSpeed === 1 ? "1×" : `${playbackSpeed}×`}
                    </button>
                    <button
                        onClick={onDownload}
                        disabled={!currentChapter || isLoadingAudio}
                        className="hover:text-white transition hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download MP3"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={onToggleChapterList}
                        className="hover:text-white transition hover:scale-110"
                        title="Show chapters"
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
