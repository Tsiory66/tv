import React, { useEffect, useRef, useState } from "react";
import { Play, Volume2, Maximize, AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  url: string;
  title: string;
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setIsPlaying(false);
  }, [url]);

  const isEmbed = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("embed") || url.includes("vimeo.com") || url.includes("<iframe");

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#0C0C0E] rounded-xl border border-white/5 text-slate-400 p-6">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <p className="text-sm font-medium">Aucun flux vidéo fourni pour ce match.</p>
      </div>
    );
  }

  // Handle direct HTML iframe code
  if (url.trim().startsWith("<iframe")) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/5">
        <div 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: url }}
        />
      </div>
    );
  }

  // Handle standard YouTube embed
  if (isEmbed) {
    let embedUrl = url;
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/5">
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // Standard video tag for direct MP4 or native HLS
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/5 group">
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        controls
        autoPlay
        playsInline
        onError={() => {
          setError("Le format vidéo n'est pas supporté directement par votre navigateur ou le flux est hors ligne.");
        }}
      />
      {error && (
        <div className="absolute inset-0 bg-[#0C0C0E]/95 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
          <h4 className="font-bold text-white mb-1">Ressource vidéo inaccessible</h4>
          <p className="text-xs text-slate-400 max-w-md mb-4">{error}</p>
          <div className="flex flex-col gap-2 bg-[#121214] rounded-lg p-3 text-left w-full max-w-md text-xs text-slate-300 border border-white/5">
            <span className="font-semibold text-slate-200">Source fournie :</span>
            <code className="break-all bg-[#09090B] p-1 rounded text-emerald-400 border border-white/5">{url}</code>
          </div>
          <p className="text-xs text-amber-400/80 mt-4">
            Conseil : Pour les MVP, vous pouvez configurer des liens Youtube de résumés ou des fichiers MP4 publics.
          </p>
        </div>
      )}
    </div>
  );
}
