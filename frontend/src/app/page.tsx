"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { UploadCloud, BookOpen, Trash2 } from "lucide-react";
import Player from "@/components/Player";
import { saveBook, getAllBooks, getBook, deleteBook, getPosition, StoredBook, SavedPosition } from "@/lib/storage";

export default function Home() {
  const [storedBooks, setStoredBooks] = useState<StoredBook[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activePosition, setActivePosition] = useState<SavedPosition | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllBooks()
      .then(setStoredBooks)
      .catch(() => {})
      .finally(() => setLibraryLoaded(true));
  }, []);

  const openFile = async (file: File) => {
    await saveBook(file).catch(() => {});
    setStoredBooks(await getAllBooks().catch(() => []));
    setActiveFile(file);
    setActivePosition(getPosition(file.name));
    setIsReading(true);
  };

  const openStoredBook = async (name: string) => {
    const file = await getBook(name).catch(() => null);
    if (!file) return;
    setActiveFile(file);
    setActivePosition(getPosition(name));
    setIsReading(true);
  };

  const removeBook = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteBook(name).catch(() => {});
    setStoredBooks(await getAllBooks().catch(() => []));
  };

  const handleBack = async () => {
    setIsReading(false);
    setActiveFile(null);
    setActivePosition(null);
    setStoredBooks(await getAllBooks().catch(() => []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "application/epub+zip" || file.name.endsWith(".epub") || file.type === "application/pdf" || file.name.endsWith(".pdf"))) {
      openFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openFile(file);
  };

  if (isReading && activeFile) {
    return (
      <Player
        file={activeFile}
        onBack={handleBack}
        initialChapterHref={activePosition?.chapterHref}
        initialTime={activePosition?.currentTime}
      />
    );
  }

  const hasBooks = storedBooks.length > 0;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background">
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight py-8">
          <BookOpen className="text-blue-500" />
          EpubCast
        </div>

        {!libraryLoaded ? null : hasBooks ? (
          <>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Your Library</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
              {storedBooks.map((book) => {
                const position = getPosition(book.name);
                return (
                  <div
                    key={book.name}
                    onClick={() => openStoredBook(book.name)}
                    className="group glass rounded-2xl p-4 flex flex-col gap-3 border border-gray-800 hover:border-blue-500/40 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="relative w-full aspect-[2/3] bg-gray-800/60 rounded-lg flex items-center justify-center overflow-hidden">
                      {book.coverDataUrl ? (
                        <Image src={book.coverDataUrl} alt={book.name} fill unoptimized className="object-cover" />
                      ) : (
                        <BookOpen size={32} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-white">{book.name.replace(/\.(epub|pdf)$/i, "")}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{(book.size / 1024 / 1024).toFixed(1)} MB</p>
                      {position && (
                        <p className="text-xs text-blue-400 mt-1 truncate">{position.chapterLabel}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openStoredBook(book.name); }}
                        className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 rounded-lg transition-colors"
                      >
                        {position ? "Continue" : "Listen"}
                      </button>
                      <button
                        onClick={(e) => removeBook(book.name, e)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Remove from library"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add new book card */}
              <label
                className="glass rounded-2xl p-4 flex flex-col gap-3 border border-dashed border-gray-700 hover:border-blue-500/50 cursor-pointer transition-all duration-200 hover:scale-[1.02] items-center justify-center aspect-auto min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input ref={fileInputRef} type="file" accept=".epub,application/epub+zip,.pdf,application/pdf" className="hidden" onChange={handleFileInput} />
                <UploadCloud size={28} className="text-gray-500" />
                <p className="text-xs text-gray-500 text-center">Add book</p>
              </label>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center mt-16 space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4 max-w-lg">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
                Listen to any <span className="text-blue-500">book</span>.
              </h1>
              <p className="text-lg text-gray-400 leading-relaxed">
                Turn your EPUB and PDF files into high-quality, chapter-by-chapter podcasts using neural text-to-speech.
              </p>
            </div>
            <label
              className="group relative w-full max-w-2xl h-80 rounded-3xl border-2 border-dashed border-gray-700 hover:border-blue-500/50 hover:bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input type="file" accept=".epub,application/epub+zip,.pdf,application/pdf" className="hidden" onChange={handleFileInput} />
              <div className="absolute inset-0 bg-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col items-center gap-4 text-gray-400 group-hover:text-gray-300 transition-colors z-10">
                <div className="p-4 rounded-full bg-gray-800/50 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors shadow-xl">
                  <UploadCloud size={40} />
                </div>
                <div>
                  <p className="text-xl font-medium mb-1">Click or drag & drop</p>
                  <p className="text-sm border opacity-70 border-gray-700 px-3 py-1 rounded-full inline-block mt-2">EPUB or PDF</p>
                </div>
              </div>
            </label>
          </div>
        )}
      </div>
    </main>
  );
}
