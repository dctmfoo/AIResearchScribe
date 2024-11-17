import useSWR from "swr";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Citation } from "../../db/schema";

interface CitationListProps {
  articleId: number;
}

export default function CitationList({ articleId }: CitationListProps) {
  const { data: citations } = useSWR<Citation[]>(`/api/articles/${articleId}/citations`);

  if (!citations?.length) return null;

  return (
    <div className="mt-6">
      <h3 className="font-serif font-bold text-lg mb-4 text-foreground">Citations</h3>
      <ScrollArea className="h-[200px]">
        <ul className="space-y-4">
          {citations.map((citation) => (
            <li key={citation.id} className="text-sm">
              <p className="font-medium text-foreground">
                {citation.author} ({citation.year})
              </p>
              <p className="text-muted-foreground">{citation.source}</p>
              {citation.quote && (
                <blockquote className="mt-2 pl-4 border-l-2 border-border text-muted-foreground italic">
                  {citation.quote}
                </blockquote>
              )}
              {citation.url && (
                <a 
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Source
                </a>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
