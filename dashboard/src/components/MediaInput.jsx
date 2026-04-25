import React, { useState } from 'react';
import { Youtube, Upload, FileVideo, X, Sliders } from 'lucide-react';

const DURATION_PRESETS = [
  { label: '15–30s', min: 15, max: 30 },
  { label: '30–60s', min: 30, max: 60 },
  { label: '15–60s', min: 15, max: 60 },
  { label: '60–90s', min: 60, max: 90 },
];

export default function MediaInput({ onProcess, isProcessing }) {
    const [mode, setMode] = useState('url');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null);

    const [numClips, setNumClips] = useState(5);
    const [durationPreset, setDurationPreset] = useState(2);

    const handleSubmit = (e) => {
        e.preventDefault();
        const preset = DURATION_PRESETS[durationPreset];
        const settings = {
            num_clips: numClips,
            min_duration: preset.min,
            max_duration: preset.max,
        };
        if (mode === 'url' && url) {
            onProcess({ type: 'url', payload: url, settings });
        } else if (mode === 'file' && file) {
            onProcess({ type: 'file', payload: file, settings });
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setMode('file');
        }
    };

    return (
        <div className="bg-surface border border-white/5 rounded-2xl p-6 animate-[fadeIn_0.6s_ease-out]">
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                <button
                    onClick={() => setMode('url')}
                    className={`flex items-center gap-2 pb-2 px-2 transition-all ${mode === 'url'
                        ? 'text-primary border-b-2 border-primary -mb-[17px]'
                        : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Youtube size={18} />
                    YouTube URL
                </button>
                <button
                    onClick={() => setMode('file')}
                    className={`flex items-center gap-2 pb-2 px-2 transition-all ${mode === 'file'
                        ? 'text-primary border-b-2 border-primary -mb-[17px]'
                        : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Upload size={18} />
                    Upload File
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {mode === 'url' ? (
                    <div className="space-y-4">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="input-field"
                            required
                        />
                    </div>
                ) : (
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-primary/50 bg-primary/5' : 'border-zinc-700 hover:border-zinc-500 bg-white/5'
                            }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="flex items-center justify-center gap-3 text-white">
                                <FileVideo className="text-primary" />
                                <span className="font-medium">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="p-1 hover:bg-white/10 rounded-full"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer block">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                <Upload className="mx-auto mb-3 text-zinc-500" size={24} />
                                <p className="text-zinc-400">Click to upload or drag and drop</p>
                                <p className="text-xs text-zinc-600 mt-1">MP4, MOV up to 500MB</p>
                            </label>
                        )}
                    </div>
                )}

                {/* Clip Settings */}
                <div className="mt-5 p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium uppercase tracking-wider">
                        <Sliders size={14} />
                        Clip Settings
                    </div>

                    {/* Number of clips */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-zinc-300">Number of clips</label>
                            <span className="text-sm font-mono text-white bg-white/10 px-2.5 py-0.5 rounded-md">{numClips}</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={15}
                            value={numClips}
                            onChange={(e) => setNumClips(Number(e.target.value))}
                            className="w-full accent-violet-500 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-violet-500/30"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-600 px-0.5">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                            <span>15</span>
                        </div>
                    </div>

                    {/* Duration range */}
                    <div className="space-y-2">
                        <label className="text-sm text-zinc-300">Clip duration</label>
                        <div className="grid grid-cols-4 gap-2">
                            {DURATION_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setDurationPreset(idx)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                        durationPreset === idx
                                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/10'
                                            : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-300'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isProcessing || (mode === 'url' && !url) || (mode === 'file' && !file)}
                    className="w-full btn-primary mt-6 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing Video...
                        </>
                    ) : (
                        <>
                            Generate {numClips} Clip{numClips > 1 ? 's' : ''}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
