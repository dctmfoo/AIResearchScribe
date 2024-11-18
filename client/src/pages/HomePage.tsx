import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ArticleCard from "../components/ArticleCard";
import ResearchForm from "../components/ResearchForm";
import { Archive, ArchiveRestore, Loader2, ChevronDown, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Article } from "../../db/schema";

// Academic-themed decorative SVG
const AcademicDecoration = () => (
  <svg
    className="absolute opacity-10 pointer-events-none"
    width="100"
    height="100"
    viewBox="0 0 100 100"
    fill="currentColor"
  >
    <path d="M50 0L93.3 25V75L50 100L6.7 75V25L50 0z"/>
    <path d="M50 20L76.7 35V65L50 80L23.3 65V35L50 20z" fill="transparent" stroke="currentColor"/>
  </svg>
);

interface PaginationResponse {
  articles: Article[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Error Boundary Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        {error.message}
      </AlertDescription>
      <Button onClick={resetErrorBoundary} variant="outline" size="sm" className="mt-2">
        Try Again
      </Button>
    </Alert>
  );
}

export default function HomePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const articlesPerPage = 9;

  // Enhanced SWR configuration
  const { data, error, isLoading, mutate: mutateArticles } = useSWR<PaginationResponse>(
    `/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`,
    {
      retryCount: 3,
      retryDelay: 1000,
      shouldRetryOnError: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryInterval: 5000,
      dedupingInterval: 2000,
      onError: (err) => {
        console.error('SWR Error:', err);
        toast({
          title: "Error",
          description: "Failed to load articles. Retrying...",
          variant: "destructive"
        });
      }
    }
  );

  const { toast } = useToast();

  const handleGenerate = async (topic: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      
      if (!response.ok) throw new Error("Failed to generate article");
      
      await mutateArticles(`/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`);
      toast({
        title: "Article Generated",
        description: "Your research article has been generated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate article',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleArchived = () => {
    setShowArchived(!showArchived);
    setSelectedArticles([]);
    setPage(1);
  };

  const handleSelectArticle = (articleId: number, selected: boolean) => {
    setSelectedArticles(prev => {
      if (selected && !prev.includes(articleId)) {
        return [...prev, articleId];
      }
      return prev.filter(id => id !== articleId);
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!data?.articles) return;
    setSelectedArticles(
      checked ? [...new Set(data.articles.map(article => article.id))] : []
    );
  };

  const handleLoadMore = useCallback(async () => {
    if (!data || page >= data.pagination.totalPages) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(
        `/api/articles?showArchived=${showArchived}&page=${nextPage}&limit=${articlesPerPage}`
      );
      
      if (!response.ok) throw new Error('Failed to load more articles');
      
      const newData = await response.json();
      
      // Merge the new articles with existing ones
      await mutateArticles(
        `/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`,
        {
          articles: [...(data.articles || []), ...newData.articles],
          pagination: newData.pagination
        },
        false
      );
      
      setPage(nextPage);
    } catch (error) {
      toast({
        title: "Error",
        description: 'Failed to load more articles',
        variant: "destructive"
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [data, page, showArchived, toast]);

  const handleBulkArchive = async (archive: boolean) => {
    const uniqueArticleIds = [...new Set(selectedArticles)];
    if (uniqueArticleIds.length === 0) return;

    setIsBulkProcessing(true);
    try {
      const response = await fetch('/api/articles/bulk/archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          articleIds: uniqueArticleIds,
          archived: archive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update articles');
      }

      await mutateArticles(`/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`);
      setSelectedArticles([]);
      
      toast({
        title: `Articles ${archive ? 'Archived' : 'Restored'}`,
        description: `Successfully ${archive ? 'archived' : 'restored'} ${uniqueArticleIds.length} articles.`
      });
    } catch (error) {
      console.error('Bulk archive error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update articles',
        variant: "destructive"
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const articles = data?.articles || [];
  const hasMore = data ? page < data.pagination.totalPages : false;

  // Add loading and error states
  if (error) {
    return (
      <ErrorFallback 
        error={error} 
        resetErrorBoundary={() => mutateArticles()} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-academic-gradient overflow-hidden">
        <div className="absolute top-0 left-0 transform -translate-x-1/2">
          <AcademicDecoration />
        </div>
        <div className="absolute top-0 right-0 transform translate-x-1/2">
          <AcademicDecoration />
        </div>
        
        <div className="container mx-auto px-4 py-16">
          <header className="relative text-center space-y-6 animate-fade-in">
            <h1 className="text-5xl font-serif font-bold tracking-tight">
              Academic Research Assistant
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Generate comprehensive research articles powered by AI, with academic
              precision and scholarly depth.
            </p>
          </header>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto mb-16 animate-slide-in">
          <ResearchForm onSubmit={handleGenerate} isLoading={isGenerating} />
        </div>

        <div className="relative">
          {articles.length > 0 && (
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4 mb-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedArticles.length === articles.length}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      id="select-all"
                      aria-label="Select all articles"
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      Select All
                    </label>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedArticles.length > 0
                      ? `${selectedArticles.length} of ${articles.length} selected`
                      : "Select articles to archive or restore them"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {selectedArticles.length > 0 && (
                    <Button
                      variant="default"
                      onClick={() => handleBulkArchive(!showArchived)}
                      disabled={isBulkProcessing}
                      className="flex items-center gap-2"
                    >
                      {isBulkProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {showArchived ? (
                            <ArchiveRestore className="w-4 h-4" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                          {showArchived ? "Restore" : "Archive"} Selected ({selectedArticles.length})
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleToggleArchived}
                    className="flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    {showArchived ? "Show Active" : "Show Archived"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-600px)] min-h-[400px] px-4">
            {!isLoading && articles.length === 0 && (
              <div className="text-muted-foreground text-center py-4">
                {showArchived 
                  ? "No archived articles found."
                  : "No articles yet. Generate your first article above!"}
              </div>
            )}

            {isLoading && (
              <div className="text-muted-foreground text-center py-4">
                Loading articles...
              </div>
            )}

            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {articles.map((article, index) => (
                <div
                  key={article.id}
                  className="animate-fade-in"
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    height: "fit-content"
                  }}
                >
                  <ArticleCard
                    article={article}
                    onArchiveStatusChange={() => {
                      mutateArticles(`/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`);
                    }}
                    selected={selectedArticles.includes(article.id)}
                    onSelect={(selected) => handleSelectArticle(article.id, selected)}
                    showCheckbox={true}
                  />
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full max-w-xs"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Load More Articles
                    </>
                  )}
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}