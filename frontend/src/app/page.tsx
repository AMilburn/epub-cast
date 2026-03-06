"use client";

import { useState } from "react";
import { UploadCloud, BookOpen } from "lucide-react";
import Player from "@/components/Player";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isReading, setIsReading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/epub+zip" || droppedFile.name.endsWith(".epub")) {
        setFile(droppedFile);
      } else {
        alert("Please upload an EPUB file.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  if (isReading && file) {
    return <Player file={file} onBack={() => { setIsReading(false); setFile(null); }} />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background">
      <div className="absolute top-8 left-8 flex items-center gap-2 text-xl font-bold tracking-tight">
        <BookOpen className="text-blue-500" />
        EpubCast
      </div>

      <div className="max-w-2xl w-full flex flex-col items-center space-y-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
            Listen to any <span className="text-blue-500">book</span>.
          </h1>
          <p className="text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
            Turn your EPUB files into high-quality, chapter-by-chapter podcasts using neural text-to-speech.
          </p>
        </div>

        {!file ? (
          <label
            className="group relative w-full h-80 rounded-3xl border-2 border-dashed border-gray-700 hover:border-blue-500/50 hover:bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ease-out mt-8"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".epub,application/epub+zip"
              className="hidden"
              onChange={handleFileInput}
            />

            <div className="absolute inset-0 bg-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex flex-col items-center gap-4 text-gray-400 group-hover:text-gray-300 transition-colors z-10">
              <div className="p-4 rounded-full bg-gray-800/50 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors shadow-xl">
                <UploadCloud size={40} />
              </div>
              <div>
                <p className="text-xl font-medium mb-1">Click or drag & drop</p>
                <p className="text-sm border opacity-70 border-gray-700 px-3 py-1 rounded-full inline-block mt-2">EPUB up to 20MB</p>
              </div>
            </div>
          </label>
        ) : (
          <div className="w-full glass p-8 rounded-3xl mt-8 flex flex-col items-center gap-6">
            <BookOpen size={48} className="text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold">{file.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={() => setIsReading(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-full transition-colors shadow-lg shadow-blue-500/20 w-full md:w-auto"
            >
              Start Listening
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
