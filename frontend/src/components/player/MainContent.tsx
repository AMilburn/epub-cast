interface MainContentProps {
    currentChapter: any | null;
    chapterText: string;
}

export function MainContent({ currentChapter, chapterText }: MainContentProps) {
    return (
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 pb-32">
            {currentChapter ? (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-3xl font-bold mb-8 text-white/90">{currentChapter.label.trim()}</h1>
                    <div className="prose prose-invert prose-lg text-gray-300 leading-relaxed font-serif whitespace-pre-line">
                        {chapterText ? chapterText : <p className="animate-pulse">Loading text...</p>}
                    </div>
                </div>
            ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                    Select a chapter from the sidebar to begin.
                </div>
            )}
        </div>
    );
}
