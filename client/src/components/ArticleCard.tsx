import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Volume2, Loader2, Share2, Archive, ArchiveRestore } from "lucide-react";
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
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ArticleCardProps {
  article: Article;
  onArchiveStatusChange?: (archived: boolean) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ArticleCard({ article, onArchiveStatusChange }: ArticleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleArchiveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/articles/${article.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !article.archived })
      });

      if (!response.ok) {
        throw new Error('Failed to update article archive status');
      }

      onArchiveStatusChange?.(!article.archived);
    } catch (error) {
      console.error('Error updating archive status:', error);
      setError('Failed to update archive status');
    }
  };

  const sanitizedContent = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'ul', 'li', 'ol', 'strong', 'em', 'blockquote'],
    ALLOWED_ATTR: ['class']
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Card 
        className="transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer relative h-full flex flex-col"
        onClick={() => setIsOpen(true)}
        role="article"
        aria-labelledby={`article-title-${article.id}`}
      >
        <CardHeader className="flex-none">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h2 
                id={`article-title-${article.id}`} 
                className="text-xl font-serif font-bold text-foreground line-clamp-2"
              >
                {article.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(article.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="flex-none"
              aria-label="Share article"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {article.imageUrl && (
          <div className="px-6">
            <AspectRatio ratio={16/9} className="bg-muted rounded-md overflow-hidden">
              <img 
                src={article.imageUrl} 
                alt=""
                role="presentation"
                className="object-cover w-full h-full"
              />
            </AspectRatio>
          </div>
        )}

        <CardContent className="flex-1 mt-4">
          <p className="text-muted-foreground line-clamp-3">{article.summary}</p>
          
          <div className="flex justify-between items-center mt-6 gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              aria-label={`Read full article: ${article.title}`}
            >
              Read More
            </Button>
            
            <div className="flex gap-2">
              {article.audioUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleListen}
                  disabled={isLoading}
                  aria-label={`${isPlaying ? 'Pause' : 'Listen to'} article`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleArchiveToggle}
                aria-label={article.archived ? 'Restore article' : 'Archive article'}
              >
                {article.archived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                aria-label="Share article"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-labelledby={`dialog-title-${article.id}`}
        >
          <DialogHeader>
            <DialogTitle>{article.title}</DialogTitle>
            <DialogDescription>
              Published on {formatDate(article.createdAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              aria-label="Share article"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            {article.audioUrl && (
              <Button
                variant="outline"
                className="flex gap-2 items-center"
                onClick={handleListen}
                disabled={isLoading}
                aria-label={`${isPlaying ? 'Pause' : 'Listen to'} article`}
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

          {error && (
            <p className="text-destructive text-sm mt-2" role="alert">
              {error}
            </p>
          )}

          {isPlaying && (
            <div className="w-full space-y-2 mt-4" role="timer" aria-label="Audio progress">
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

          {article.imageUrl && (
            <AspectRatio ratio={16/9} className="bg-muted mt-6">
              <img 
                src={article.imageUrl} 
                alt=""
                role="presentation"
                className="object-cover w-full h-full rounded-md"
              />
            </AspectRatio>
          )}

          <div 
            className="mt-6 prose prose-sm max-w-none dark:prose-invert
              prose-p:text-foreground prose-headings:text-foreground 
              prose-strong:text-foreground prose-em:text-foreground 
              prose-li:text-foreground prose-blockquote:text-foreground
              prose-blockquote:border-l-primary
              prose-h2:text-xl prose-h2:font-serif prose-h2:font-bold
              prose-h3:text-lg prose-h3:font-serif prose-h3:font-semibold
              prose-p:leading-relaxed prose-li:leading-relaxed
              prose-blockquote:italic prose-blockquote:pl-4"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <CitationList articleId={article.id} />

          <audio 
            ref={audioRef}
            src={article.audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            aria-hidden="true"
          />
        </DialogContent>
      </Dialog>

      {showShareMenu && (
        <Dialog open={showShareMenu} onOpenChange={setShowShareMenu}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Article</DialogTitle>
              <DialogDescription>
                Share this article on your favorite social media platform
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center items-center gap-4 py-4">
              <FacebookShareButton url={shareUrl} quote={article.title}>
                <FacebookIcon size={32} round />
                <VisuallyHidden>Share on Facebook</VisuallyHidden>
              </FacebookShareButton>
              <TwitterShareButton url={shareUrl} title={article.title}>
                <TwitterIcon size={32} round />
                <VisuallyHidden>Share on Twitter</VisuallyHidden>
              </TwitterShareButton>
              <LinkedinShareButton url={shareUrl} title={article.title}>
                <LinkedinIcon size={32} round />
                <VisuallyHidden>Share on LinkedIn</VisuallyHidden>
              </LinkedinShareButton>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}