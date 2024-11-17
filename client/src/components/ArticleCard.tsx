import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Volume2, Loader2 } from "lucide-react";
import CitationList from "./CitationList";
import type { Article } from "../../db/schema";

interface ArticleCardProps {
  article: Article;
}

// Supported audio formats and their MIME types
const SUPPORTED_AUDIO_FORMATS = {
  'audio/mpeg': ['mp3'],
  'audio/wav': ['wav'],
  'audio/ogg': ['ogg'],
  'audio/aac': ['aac']
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const validateAudioFormat = (blob: Blob): boolean => {
    const mimeType = blob.type.toLowerCase();
    return Object.keys(SUPPORTED_AUDIO_FORMATS).includes(mimeType);
  };

  const handleListen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (audioUrlRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          return;
        } catch (error) {
          console.error('Error resuming audio:', error);
          setError('Failed to resume audio playback. Please try again.');
          cleanup();
        }
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/articles/${article.id}/speech`);
        if (!response.ok) {
          throw new Error('Failed to generate speech. Please try again later.');
        }

        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Received empty audio response. Please try again.');
        }

        if (!validateAudioFormat(blob)) {
          throw new Error(`Unsupported audio format. Supported formats are: ${Object.values(SUPPORTED_AUDIO_FORMATS).flat().join(', ')}`);
        }

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        audioRef.current.src = url;
        
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Error playing audio:', error);
          throw new Error('Failed to play audio. Please check your audio device and try again.');
        }
      } catch (error) {
        console.error('Error playing audio:', error);
        setError(error instanceof Error ? error.message : 'Failed to play audio');
        cleanup();
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <Card 
        className="transition-shadow hover:shadow-lg cursor-pointer" 
        onClick={() => setIsOpen(true)}
        role="article"
        aria-labelledby={`article-title-${article.id}`}
      >
        <CardHeader>
          <h2 id={`article-title-${article.id}`} className="text-xl font-serif font-bold">
            {article.title}
          </h2>
          <p className="text-sm text-gray-500">
            {new Date(article.createdAt).toLocaleDateString()}
          </p>
        </CardHeader>

        {article.imageUrl && (
          <AspectRatio ratio={16/9} className="bg-muted">
            <img 
              src={article.imageUrl} 
              alt=""
              role="presentation"
              className="object-cover w-full h-full"
            />
          </AspectRatio>
        )}

        <CardContent className="mt-4">
          <p className="text-gray-600">{article.summary}</p>
          
          <div className="flex justify-center mt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              aria-label={`Read full article: ${article.title}`}
            >
              Read More
            </Button>
          </div>

          <audio 
            ref={audioRef}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            aria-hidden="true"
          />
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-labelledby={`dialog-title-${article.id}`}
          aria-describedby={`dialog-description-${article.id}`}
        >
          <DialogTitle id={`dialog-title-${article.id}`} className="text-2xl font-serif">
            {article.title}
          </DialogTitle>

          <DialogHeader className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <DialogDescription className="text-sm text-gray-500">
                Published on {new Date(article.createdAt).toLocaleDateString()}
              </DialogDescription>
              <Button
                variant="outline"
                className="flex gap-2 items-center"
                onClick={handleListen}
                disabled={isLoading}
                aria-label={`${isPlaying ? 'Pause' : 'Listen to'} article: ${article.title}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    {isPlaying ? "Pause" : "Listen"}
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="text-red-500 text-sm" role="alert">
                {error}
              </p>
            )}

            {isPlaying && (
              <div className="w-full space-y-2" role="timer" aria-label="Audio progress">
                <div className="bg-gray-200 h-1 rounded-full">
                  <div 
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${(progress / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
          </DialogHeader>

          {article.imageUrl && (
            <AspectRatio ratio={16/9} className="bg-muted mt-4">
              <img 
                src={article.imageUrl} 
                alt=""
                role="presentation"
                className="object-cover w-full h-full rounded-md"
              />
            </AspectRatio>
          )}

          <div 
            id={`dialog-description-${article.id}`}
            className="mt-6 prose prose-sm max-w-none"
          >
            {article.content}
          </div>

          <CitationList articleId={article.id} />
        </DialogContent>
      </Dialog>
    </>
  );
}
