import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Volume2, Loader2, Share2 } from "lucide-react";
import DOMPurify from 'dompurify';
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon
} from 'next-share';
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
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get the current URL for sharing
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/article/${article.id}` : '';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handleListen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    
    if (!article.audioUrl) {
      setError("Audio is not available for this article");
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      try {
        setIsLoading(true);
        audioRef.current.src = article.audioUrl;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        setError('Failed to play audio. Please check your audio device and try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const sanitizedContent = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'ul', 'li', 'ol', 'strong', 'em', 'blockquote'],
    ALLOWED_ATTR: []
  });

  return (
    <>
      <Card 
        className="transition-shadow hover:shadow-lg cursor-pointer relative" 
        onClick={() => setIsOpen(true)}
        role="article"
        aria-labelledby={`article-title-${article.id}`}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <h2 id={`article-title-${article.id}`} className="text-xl font-serif font-bold text-foreground">
                {article.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {new Date(article.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                aria-label="Share article"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              {showShareMenu && (
                <div 
                  className="absolute right-0 top-10 bg-background border border-border shadow-lg rounded-md p-2 flex gap-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FacebookShareButton url={shareUrl} quote={article.title}>
                    <FacebookIcon size={32} round />
                  </FacebookShareButton>
                  <TwitterShareButton url={shareUrl} title={article.title}>
                    <TwitterIcon size={32} round />
                  </TwitterShareButton>
                  <LinkedinShareButton url={shareUrl} title={article.title}>
                    <LinkedinIcon size={32} round />
                  </LinkedinShareButton>
                </div>
              )}
            </div>
          </div>
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
          <p className="text-muted-foreground">{article.summary}</p>
          
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
        >
          <DialogTitle id={`dialog-title-${article.id}`} className="text-2xl font-serif text-foreground">
            {article.title}
          </DialogTitle>

          <DialogHeader className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <DialogDescription className="text-sm text-muted-foreground">
                Published on {new Date(article.createdAt).toLocaleDateString()}
              </DialogDescription>
              <div className="flex gap-2">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleShare}
                    aria-label="Share article"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  {showShareMenu && (
                    <div 
                      className="absolute right-0 top-10 bg-background border border-border shadow-lg rounded-md p-2 flex gap-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FacebookShareButton url={shareUrl} quote={article.title}>
                        <FacebookIcon size={32} round />
                      </FacebookShareButton>
                      <TwitterShareButton url={shareUrl} title={article.title}>
                        <TwitterIcon size={32} round />
                      </TwitterShareButton>
                      <LinkedinShareButton url={shareUrl} title={article.title}>
                        <LinkedinIcon size={32} round />
                      </LinkedinShareButton>
                    </div>
                  )}
                </div>
                {article.audioUrl && (
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
                )}
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}

            {isPlaying && (
              <div className="w-full space-y-2" role="timer" aria-label="Audio progress">
                <div className="bg-muted h-1 rounded-full">
                  <div 
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${(progress / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
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
            className="mt-6 prose prose-sm max-w-none dark:prose-invert prose-p:text-foreground dark:prose-p:text-foreground prose-headings:text-foreground dark:prose-headings:text-foreground prose-strong:text-foreground dark:prose-strong:text-foreground prose-em:text-foreground dark:prose-em:text-foreground prose-li:text-foreground dark:prose-li:text-foreground prose-blockquote:text-foreground dark:prose-blockquote:text-foreground prose-a:text-primary dark:prose-a:text-primary prose-code:text-foreground dark:prose-code:text-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <CitationList articleId={article.id} />
        </DialogContent>
      </Dialog>
    </>
  );
}
