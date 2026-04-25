import React, { useState, useEffect } from 'react';
import { Download, Wand2, Type, Loader2, AlertCircle, X } from 'lucide-react';
import { getApiUrl, getVideoUrl } from '../config';
import SubtitleModal from './SubtitleModal';
import HookModal from './HookModal';
import { renderInBrowser } from '../lib/renderInBrowser';

export default function ResultCard({ clip, index, jobId, onPlay, onPause }) {
    const [showSubtitleModal, setShowSubtitleModal] = useState(false);
    const videoRef = React.useRef(null);
    const originalVideoUrl = getVideoUrl(clip.video_url);
    const [currentVideoUrl, setCurrentVideoUrl] = useState(originalVideoUrl);

    const [isEditing, setIsEditing] = useState(false);
    const [isSubtitling, setIsSubtitling] = useState(false);
    const [isHooking, setIsHooking] = useState(false);
    const [showHookModal, setShowHookModal] = useState(false);
    const [editError, setEditError] = useState(null);

    const [clipDuration, setClipDuration] = useState(clip.end && clip.start ? clip.end - clip.start : 30);

    // Accumulate Remotion layers across operations
    const [activeLayers, setActiveLayers] = useState({ subtitles: null, hook: null, effects: null });

    // Fetch clip duration from transcript endpoint
    useEffect(() => {
        if (!jobId || index === undefined) return;
        fetch(getApiUrl(`/api/clip/${jobId}/${index}/transcript`))
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.durationSec) setClipDuration(data.durationSec);
            })
            .catch(() => {});
    }, [jobId, index]);

    const handleAutoEdit = async () => {
        setIsEditing(true);
        setEditError(null);
        try {
            const effectsRes = await fetch(getApiUrl('/api/effects/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    input_filename: currentVideoUrl.split('/').pop()
                })
            });

            if (effectsRes.ok) {
                const data = await effectsRes.json();
                if (data.effects && data.effects.segments) {
                    const newLayers = { ...activeLayers, effects: data.effects };
                    setActiveLayers(newLayers);
                    const blobUrl = await renderInBrowser({
                        videoUrl: originalVideoUrl,
                        durationInSeconds: clipDuration,
                        subtitles: newLayers.subtitles,
                        hook: newLayers.hook,
                        effects: newLayers.effects,
                    });
                    setCurrentVideoUrl(blobUrl);
                    if (videoRef.current) videoRef.current.load();
                    return;
                }
            }

            // Fallback: legacy FFmpeg edit endpoint
            const res = await fetch(getApiUrl('/api/edit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    input_filename: currentVideoUrl.split('/').pop()
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText);
            }

            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getVideoUrl(data.new_video_url));
                if (videoRef.current) videoRef.current.load();
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsEditing(false);
        }
    };

    const handleSubtitle = async (options) => {
        setIsSubtitling(true);
        setEditError(null);
        try {
            if (options.remotion) {
                const newLayers = { ...activeLayers, subtitles: options.remotion };
                setActiveLayers(newLayers);
                const blobUrl = await renderInBrowser({
                    videoUrl: originalVideoUrl,
                    durationInSeconds: clipDuration,
                    subtitles: newLayers.subtitles,
                    hook: newLayers.hook,
                    effects: newLayers.effects,
                });
                setCurrentVideoUrl(blobUrl);
                if (videoRef.current) videoRef.current.load();
                setShowSubtitleModal(false);
                return;
            }

            // Fallback: legacy FFmpeg
            const res = await fetch(getApiUrl('/api/subtitle'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    position: options.position,
                    font_size: options.fontSize,
                    font_name: options.fontName,
                    font_color: options.fontColor,
                    border_color: options.borderColor,
                    border_width: options.borderWidth,
                    bg_color: options.bgColor,
                    bg_opacity: options.bgOpacity,
                    input_filename: currentVideoUrl.split('/').pop()
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getVideoUrl(data.new_video_url));
                if (videoRef.current) videoRef.current.load();
                setShowSubtitleModal(false);
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsSubtitling(false);
        }
    };

    const handleHook = async (hookData) => {
        setIsHooking(true);
        setEditError(null);
        try {
            if (hookData.remotion) {
                const newLayers = { ...activeLayers, hook: hookData.remotion };
                setActiveLayers(newLayers);
                const blobUrl = await renderInBrowser({
                    videoUrl: originalVideoUrl,
                    durationInSeconds: clipDuration,
                    subtitles: newLayers.subtitles,
                    hook: newLayers.hook,
                    effects: newLayers.effects,
                });
                setCurrentVideoUrl(blobUrl);
                if (videoRef.current) videoRef.current.load();
                setShowHookModal(false);
                return;
            }

            // Fallback: legacy FFmpeg
            const payload = typeof hookData === 'string'
                ? { text: hookData, position: 'top', size: 'M' }
                : hookData;

            const res = await fetch(getApiUrl('/api/hook'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    clip_index: index,
                    text: payload.text,
                    position: payload.position,
                    size: payload.size,
                    input_filename: currentVideoUrl.split('/').pop()
                })
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (data.new_video_url) {
                setCurrentVideoUrl(getVideoUrl(data.new_video_url));
                if (videoRef.current) videoRef.current.load();
                setShowHookModal(false);
            }
        } catch (e) {
            setEditError(e.message);
            setTimeout(() => setEditError(null), 5000);
        } finally {
            setIsHooking(false);
        }
    };

    return (
        <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row group hover:border-white/10 transition-all animate-[fadeIn_0.5s_ease-out] min-h-[300px] h-auto" style={{ animationDelay: `${index * 0.1}s` }}>
            {/* Left: Video Preview */}
            <div className="w-full md:w-[180px] lg:w-[200px] bg-black relative shrink-0 aspect-[9/16] md:aspect-auto group/video">
                <video
                    ref={videoRef}
                    src={currentVideoUrl}
                    poster={originalVideoUrl}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                    onPlay={() => {
                        const startTime = clip.start || 0;
                        onPlay(startTime);
                    }}
                    onPause={onPause}
                />

                {/* Clip Index Badge */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-bold text-white border border-white/10">
                    #{index + 1}
                </div>

                {/* Auto Edit Overlay */}
                {isEditing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-4 text-center">
                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                        <p className="text-xs font-medium text-white">AI Editing...</p>
                    </div>
                )}
            </div>

            {/* Right: Content & Details */}
            <div className="flex-1 p-4 md:p-5 flex flex-col bg-[#121214] overflow-hidden min-w-0">
                <div className="mb-4">
                    <h3 className="font-bold text-white text-sm mb-1 truncate">
                        {clip.video_title_for_youtube_short || `Clip ${index + 1}`}
                    </h3>
                    <p className="text-xs text-zinc-500">
                        {Math.round((clip.end - clip.start) || 30)}s · {clip.start?.toFixed(1)}s - {clip.end?.toFixed(1)}s
                    </p>
                </div>

                {/* Descriptions */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-4">
                    {/* YouTube */}
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 mb-1.5 uppercase tracking-wider">
                            YouTube
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-2">
                            {clip.video_title_for_youtube_short || "No title generated"}
                        </p>
                    </div>

                    {/* TikTok / IG */}
                    <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                            TikTok / Instagram
                        </div>
                        <p className="text-xs text-zinc-300 line-clamp-3">
                            {clip.video_description_for_tiktok || clip.video_description_for_instagram || "No description generated"}
                        </p>
                    </div>
                </div>

                {/* Error Message */}
                {editError && (
                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-lg flex items-center gap-2">
                        <AlertCircle size={12} className="shrink-0" />
                        {editError}
                    </div>
                )}

                {/* Actions Footer */}
                <div className="grid grid-cols-3 gap-3 mt-auto pt-4 border-t border-white/5">
                    <button
                        onClick={handleAutoEdit}
                        disabled={isEditing}
                        className="py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 truncate px-1"
                    >
                        {isEditing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        {isEditing ? 'Editing...' : 'Auto Edit'}
                    </button>

                    <button
                        onClick={() => setShowSubtitleModal(true)}
                        disabled={isSubtitling}
                        className="py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 truncate px-1"
                    >
                        {isSubtitling ? <Loader2 size={14} className="animate-spin" /> : <Type size={14} />}
                        {isSubtitling ? 'Adding...' : 'Subtitles'}
                    </button>

                    <button
                        onClick={() => setShowHookModal(true)}
                        disabled={isHooking}
                        className="py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black rounded-lg text-xs font-bold shadow-lg shadow-yellow-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 truncate px-1"
                    >
                        {isHooking ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        {isHooking ? 'Adding...' : 'Viral Hook'}
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const response = await fetch(currentVideoUrl);
                                if (!response.ok) throw new Error('Download failed');
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = `clip-${index + 1}.mp4`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                            } catch (e) {
                                window.open(currentVideoUrl, '_blank');
                            }
                        }}
                        className="col-span-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Download size={14} /> Download Clip
                    </button>
                </div>
            </div>

            <SubtitleModal
                isOpen={showSubtitleModal}
                onClose={() => setShowSubtitleModal(false)}
                onGenerate={handleSubtitle}
                isProcessing={isSubtitling}
                videoUrl={originalVideoUrl}
                jobId={jobId}
                clipIndex={index}
                existingHook={activeLayers.hook}
            />

            <HookModal
                isOpen={showHookModal}
                onClose={() => setShowHookModal(false)}
                onGenerate={handleHook}
                isProcessing={isHooking}
                videoUrl={originalVideoUrl}
                initialText={clip.viral_hook_text}
                durationInSeconds={clip.end && clip.start ? clip.end - clip.start : 30}
                existingSubtitles={activeLayers.subtitles}
            />
        </div>
    );
}
