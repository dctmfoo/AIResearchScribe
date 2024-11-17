import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Volume2 } from "lucide-react";
import CitationList from "./CitationList";
import type { Article } from "../../db/schema";

interface ArticleCardProps {
  article: Article;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        const currentSrc = audioRef.current.src;
        audioRef.current.pause();
        audioRef.current.src = '';
        if (currentSrc.startsWith('blob:')) {
          URL.revokeObjectURL(currentSrc);
        }
      }
    };
  }, []);

  const handleListen = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dialog from closing
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/articles/${article.id}/speech`);
          if (!response.ok) throw new Error('Failed to generate speech');

          const blob = await response.blob();
          if (blob.size === 0) throw new Error('Empty audio response');

          const url = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.src = url;
            try {
              await audioRef.current.play();
              setIsPlaying(true);
            } catch (error) {
              console.error('Error playing audio:', error);
              throw new Error('Failed to play audio');
            }
          }
        } catch (error) {
          console.error('Error playing audio:', error);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  return (
    <>
      <Card 
        className="transition-shadow hover:shadow-lg cursor-pointer" 
        onClick={() => setIsOpen(true)}
      >
        <CardHeader>
          <h2 className="text-xl font-serif font-bold">{article.title}</h2>
          <p className="text-sm text-gray-500">
            {new Date(article.createdAt).toLocaleDateString()}
          </p>
        </CardHeader>

        {article.imageUrl && (
          <AspectRatio ratio={16/9} className="bg-muted">
            <img 
              src={article.imageUrl} 
              alt={article.title}
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
          />
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-describedby="article-content"
        >
          <DialogHeader className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-serif">{article.title}</DialogTitle>
                <p className="text-sm text-gray-500">
                  {new Date(article.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                className="flex gap-2 items-center"
                onClick={handleListen}
                disabled={isLoading}
              >
                {isLoading ? (
                  "Loading..."
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    {isPlaying ? "Pause" : "Listen"}
                  </>
                )}
              </Button>
            </div>
            {isPlaying && (
              <div className="w-full space-y-2">
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
                alt={article.title}
                className="object-cover w-full h-full rounded-md"
              />
            </AspectRatio>
          )}

          <div className="mt-6 prose prose-sm max-w-none">
            {article.content}
          </div>

          <CitationList articleId={article.id} />

          <div id="article-content" className="sr-only">
            Full article view for {article.title}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
