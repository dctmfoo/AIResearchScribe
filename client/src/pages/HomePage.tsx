import { useState, useCallback, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import ArticleCard from "../components/ArticleCard";
import ResearchForm from "../components/ResearchForm";
import { Archive, ArchiveRestore, Loader2, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  error?: string;
  message?: string;
  retry?: boolean;
}

export default function HomePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const articlesPerPage = 9;

  const { data, error, isLoading, mutate: refreshData } = useSWR<PaginationResponse>(
    `/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`,
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch articles');
      }
      return res.json();
    },
    {
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Only retry up to 3 times and only retry connection errors
        if (retryCount >= 3 || !error.message.includes('connection')) return;
        
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      },
    }
  );

  const { toast } = useToast();

  // Check database health periodically when there's an error
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (error?.message?.includes('connection')) {
      interval = setInterval(async () => {
        try {
          const health = await fetch('/api/health');
          if (health.ok) {
            const data = await health.json();
            if (data.status === 'healthy') {
              refreshData();
              clearInterval(interval);
            }
          }
        } catch (e) {
          console.error('Health check failed:', e);
        }
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [error, refreshData]);

  const handleGenerate = async (topic: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      
      if (!response.ok) throw new Error("Failed to generate article");
      
      await mutate(`/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`);
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
      await mutate(
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

      await mutate(`/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`);
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

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await refreshData();
      toast({
        title: "Refresh Successful",
        description: "Articles have been refreshed successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to refresh articles',
        variant: "destructive"
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const articles = data?.articles || [];
  const hasMore = data ? page < data.pagination.totalPages : false;

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
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Articles</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {error instanceof Error ? error.message : 'Failed to load articles'}
                  {error.message?.includes('connection') && 
                    '. The system will automatically retry when the connection is restored.'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="ml-4"
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCcw className="w-4 h-4 mr-2" />
                  )}
                  Retry Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

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
            {!error && isLoading && (
              <div className="text-muted-foreground text-center py-4">
                Loading articles...
              </div>
            )}

            {!isLoading && articles.length === 0 && (
              <div className="text-muted-foreground text-center py-4">
                {showArchived 
                  ? "No archived articles found."
                  : "No articles yet. Generate your first article above!"}
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
                      mutate(`/api/articles?showArchived=${showArchived}&page=${page}&limit=${articlesPerPage}`);
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