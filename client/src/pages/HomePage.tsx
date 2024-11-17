import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ArticleCard from "../components/ArticleCard";
import ResearchForm from "../components/ResearchForm";
import { Archive, ArchiveRestore, Loader2, Check } from "lucide-react";
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

export default function HomePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { data: articles, error } = useSWR<Article[]>(`/api/articles?showArchived=${showArchived}`);
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
      
      await mutate(`/api/articles?showArchived=${showArchived}`);
      toast({
        title: "Article Generated",
        description: "Your research article has been generated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleArchived = () => {
    setShowArchived(!showArchived);
    setSelectedArticles([]);
  };

  const handleSelectArticle = (articleId: number, selected: boolean) => {
    setSelectedArticles(prev => 
      selected 
        ? [...prev, articleId]
        : prev.filter(id => id !== articleId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedArticles(
      checked && articles 
        ? articles.map(article => article.id)
        : []
    );
  };

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedArticles.length === 0) return;

    setIsBulkProcessing(true);
    try {
      const response = await fetch('/api/articles/bulk/archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          articleIds: selectedArticles,
          archived: archive
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update articles');
      }

      await mutate(`/api/articles?showArchived=${showArchived}`);
      setSelectedArticles([]);
      
      toast({
        title: `Articles ${archive ? 'Archived' : 'Restored'}`,
        description: `Successfully ${archive ? 'archived' : 'restored'} ${selectedArticles.length} articles.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Sort articles by creation date, newest first
  const sortedArticles = articles?.slice().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-serif font-bold">
              {showArchived ? "Archived Articles" : "Active Articles"}
            </h2>
            {articles && articles.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedArticles.length === articles.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Select all articles"
                />
                <span className="text-sm text-muted-foreground">
                  Select All
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleToggleArchived}
            className="flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-600px)] min-h-[400px] px-4">
          {error && (
            <div className="text-destructive text-center py-4">
              Failed to load articles. Please try again later.
            </div>
          )}
          
          {!error && !articles && (
            <div className="text-muted-foreground text-center py-4">
              Loading articles...
            </div>
          )}

          {sortedArticles && sortedArticles.length === 0 && (
            <div className="text-muted-foreground text-center py-4">
              {showArchived 
                ? "No archived articles found."
                : "No articles yet. Generate your first article above!"}
            </div>
          )}

          <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {sortedArticles?.map((article, index) => (
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
                    mutate(`/api/articles?showArchived=${showArchived}`);
                  }}
                  selected={selectedArticles.includes(article.id)}
                  onSelect={(selected) => handleSelectArticle(article.id, selected)}
                  showCheckbox={true}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        {selectedArticles.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg px-4 py-2 flex items-center gap-4 animate-slide-up">
            <span className="text-sm font-medium">
              {selectedArticles.length} article{selectedArticles.length === 1 ? '' : 's'} selected
            </span>
            <Button
              variant="outline"
              onClick={() => handleBulkArchive(!showArchived)}
              disabled={isBulkProcessing}
              className="flex items-center gap-2"
            >
              {isBulkProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : showArchived ? (
                <>
                  <ArchiveRestore className="w-4 h-4" />
                  Restore Selected
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Archive Selected
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
