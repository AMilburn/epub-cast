import { BookOpen, Settings2 } from "lucide-react";

interface SidebarProps {
    onBack: () => void;
    coverUrl: string | null;
    metadata: any;
    toc: any[];
    currentChapter: any | null;
    onSelectChapter: (item: any) => void;
    selectedVoice: string;
    onVoiceChange: (voice: string) => void;
}

const VOICES = [
    { id: "en-US-AriaNeural", name: "Aria (Female)" },
    { id: "en-US-SteffanNeural", name: "Steffan (Male)" },
    { id: "en-US-GuyNeural", name: "Guy (Male)" },
    { id: "en-US-JennyNeural", name: "Jenny (Female)" },
    { id: "en-GB-SoniaNeural", name: "Sonia (UK Female)" },
    { id: "en-GB-RyanNeural", name: "Ryan (UK Male)" },
    { id: "en-AU-NatashaNeural", name: "Natasha (AU Female)" },
    { id: "en-AU-WilliamNeural", name: "William (AU Male)" }
];

export function Sidebar({ onBack, coverUrl, metadata, toc, currentChapter, onSelectChapter, selectedVoice, onVoiceChange }: SidebarProps) {
    return (
        <div className="w-80 border-r border-gray-800 bg-[#0d0d0f] flex flex-col h-full shrink-0">
            <div className="p-6 border-b border-gray-800 shrink-0">
                <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-4 transition-colors">
                    &larr; Back to Upload
                </button>
                <div className="flex gap-4 items-center">
                    {coverUrl ? (
                        <img src={coverUrl} alt="Cover" className="w-16 h-20 object-cover rounded shadow-md" />
                    ) : (
                        <div className="w-16 h-20 bg-gray-800 rounded flex items-center justify-center shadow-md">
                            <BookOpen size={24} className="text-gray-500" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-lg truncate whitespace-normal line-clamp-2">{metadata?.title || "Loading..."}</h2>
                        <p className="text-sm text-gray-400 truncate">{metadata?.creator}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Settings2 size={14} /> Voice Settings
                    </label>
                    <select
                        value={selectedVoice}
                        onChange={(e) => onVoiceChange(e.target.value)}
                        className="w-full bg-[#18191a] border border-gray-700 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
                    >
                        {VOICES.map(voice => (
                            <option key={voice.id} value={voice.id}>{voice.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-2">Chapters</h3>
                {toc.map((item, i) => (
                    <button
                        key={i}
                        onClick={() => onSelectChapter(item)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors duration-200 truncate ${currentChapter?.href === item.href
                            ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-900/20"
                            : "text-gray-300 hover:bg-gray-800 hover:text-white"
                            }`}
                    >
                        {item.label.trim()}
                    </button>
                ))}
            </div>
        </div>
    );
}
