import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CitationList from "./CitationList";
import type { Article } from "../../db/schema";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-lg">
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
        
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex justify-center mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                {isExpanded ? "Show Less" : "Read More"}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent className="mt-4">
            <div className="prose prose-sm max-w-none">
              {article.content}
            </div>
            <CitationList articleId={article.id} />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
