import { z } from "zod";

export type ArticleLength = "short" | "medium" | "long";

// Response types for article generation
export const articleResponseSchema = z.object({
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  citations: z.array(z.object({
    source: z.string(),
    author: z.string().optional(),
    year: z.number().optional(),
    url: z.string().optional(),
    quote: z.string().optional()
  }))
});

export type ArticleResponse = z.infer<typeof articleResponseSchema>;

// Length-specific configurations
const LENGTH_CONFIGS = {
  short: {
    wordCount: "300-400",
    maxTokens: 800,
    temperature: 0.7,
  },
  medium: {
    wordCount: "600-800",
    maxTokens: 1500,
    temperature: 0.7,
  },
  long: {
    wordCount: "1000-1200",
    maxTokens: 2000,
    temperature: 0.7,
  },
} as const;

// System prompts for different generation tasks
const SYSTEM_PROMPTS = {
  articleGeneration: (length: ArticleLength) => `You are an academic research assistant specialized in generating comprehensive research articles. Follow these guidelines:

1. Structure the article academically with clear sections
2. Include relevant citations and references
3. Maintain formal academic tone
4. Provide evidence-based arguments
5. Generate content between ${LENGTH_CONFIGS[length].wordCount} words
6. Include a concise summary
7. Format citations in APA style
8. Use proper HTML formatting:
   - Wrap paragraphs in <p> tags
   - Use <h2> tags for section headings
   - Use <ul> and <li> for lists
   - Preserve line breaks between sections

Return the response in the following JSON structure:
{
  "title": "Descriptive academic title",
  "content": "Full article content with HTML formatting",
  "summary": "Brief overview of key points",
  "citations": [
    {
      "source": "Journal/Publication name",
      "author": "Author name",
      "year": year,
      "url": "source URL if available",
      "quote": "relevant quote from source"
    }
  ]
}`,

  imagePrompt: `Create a professional academic illustration that:
1. Uses subdued, professional colors
2. Incorporates relevant academic symbols
3. Maintains clean, minimal design
4. Avoids controversial or inappropriate elements
5. Focuses on clarity and information presentation`
};

// Helper function to validate OpenAI response
export function validateArticleResponse(data: unknown): ArticleResponse {
  try {
    return articleResponseSchema.parse(data);
  } catch (error) {
    throw new Error(`Invalid article response format: ${error.message}`);
  }
}

// Helper function to generate academic image prompt
export function createImagePrompt(topic: string): string {
  return `${SYSTEM_PROMPTS.imagePrompt}

Topic: ${topic}

Generate an academic illustration suitable for a research paper or journal article.`;
}

// Helper function to enhance research topic with length configuration
export function enhanceResearchPrompt(topic: string, length: ArticleLength = "medium"): string {
  return `Research Topic: ${topic}

Please generate a comprehensive academic article following these requirements:
1. Focus on recent developments and current research
2. Include multiple perspectives and viewpoints
3. Support arguments with empirical evidence
4. Address potential limitations and future research directions
5. Maintain academic rigor and scholarly tone
6. Use proper HTML formatting for structure and readability
7. Target word count: ${LENGTH_CONFIGS[length].wordCount} words

${SYSTEM_PROMPTS.articleGeneration(length)}`;
}

// Export configs and system prompts for use in API routes
export const prompts = SYSTEM_PROMPTS;
export const lengthConfigs = LENGTH_CONFIGS;
