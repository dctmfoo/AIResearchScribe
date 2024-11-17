import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ArticleCard from "../components/ArticleCard";
import ResearchForm from "../components/ResearchForm";
import type { Article } from "../../db/schema";

export default function HomePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: articles, error } = useSWR<Article[]>("/api/articles");
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
      
      await mutate("/api/articles");
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

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-serif font-bold mb-4">Academic Research Assistant</h1>
        <p className="text-lg text-gray-600 mb-8">Generate comprehensive research articles powered by AI</p>
      </header>

      <ResearchForm onSubmit={handleGenerate} isLoading={isGenerating} />

      <ScrollArea className="mt-8 h-[calc(100vh-300px)]">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles?.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
