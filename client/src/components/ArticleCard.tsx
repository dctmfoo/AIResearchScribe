import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CitationList from "./CitationList";
import type { Article } from "../../db/schema";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const [isOpen, setIsOpen] = useState(false);

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
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">{article.title}</DialogTitle>
            <p className="text-sm text-gray-500">
              {new Date(article.createdAt).toLocaleDateString()}
            </p>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
