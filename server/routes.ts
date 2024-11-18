import type { Express } from "express";
import { db } from "../db";
import { articles, citations } from "../db/schema";
import OpenAI from "openai";
import { eq, inArray, sql } from "drizzle-orm";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validateArticleResponse, createImagePrompt, enhanceResearchPrompt } from "../client/src/lib/openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize S3 client with proper configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Helper function to upload image to S3 and generate signed URL
async function uploadImageToS3(imageBuffer: Buffer, fileName: string): Promise<string> {
  const bucket = 'article-images-ai';
  
  // First, upload the image
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: imageBuffer,
    ContentType: 'image/png',
    CacheControl: 'max-age=31536000'
  });

  await s3Client.send(putCommand);
  
  // Then, create a GetObjectCommand for generating the signed URL
  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: fileName
  });

  // Generate a signed URL that expires in 7 days, ensuring image availability
  const signedUrl = await getSignedUrl(s3Client, getCommand, { 
    expiresIn: 7 * 24 * 60 * 60,  // 7 days in seconds
    signableHeaders: new Set(['host'])
  });
  return signedUrl;
}

export function registerRoutes(app: Express) {
  // Generate article
  app.post("/api/articles/generate", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ error: 'Invalid topic provided' });
      }

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }
      
      // Generate article content with better error handling
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: enhanceResearchPrompt(topic)
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });
      } catch (error: any) {
        console.error('OpenAI API Error:', error);
        throw new Error(
          error.message || 'Failed to generate article content'
        );
      }

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No content generated from OpenAI');
      }

      // Parse the response manually with error handling
      let articleData;
      try {
        articleData = validateArticleResponse(
          JSON.parse(completion.choices[0].message.content)
        );
      } catch (error) {
        console.error('JSON Parsing Error:', error);
        throw new Error('Failed to parse generated content');
      }
      
      // Generate image for article with error handling
      let imageUrl;
      try {
        const image = await openai.images.generate({
          model: "dall-e-3",
          prompt: createImagePrompt(articleData.title),
          n: 1,
          size: "1024x1024"
        });

        if (!image.data[0]?.url) {
          throw new Error('No image URL in the response');
        }

        // Download and upload image
        const imageResponse = await fetch(image.data[0].url);
        if (!imageResponse.ok) {
          throw new Error('Failed to download generated image');
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const fileName = `${Date.now()}-${articleData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        imageUrl = await uploadImageToS3(imageBuffer, fileName);
      } catch (error: any) {
        console.error('Image Generation Error:', error);
        throw new Error('Failed to generate or process image');
      }

      // Generate audio with error handling
      let audioUrl;
      try {
        const mp3Response = await openai.audio.speech.create({
          model: "tts-1",
          voice: "alloy",
          input: articleData.content.replace(/<[^>]*>/g, '') // Remove HTML tags for audio
        });

        const buffer = Buffer.from(await mp3Response.arrayBuffer());
        audioUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
      } catch (error: any) {
        console.error('Audio Generation Error:', error);
        throw new Error('Failed to generate audio content');
      }

      // Insert article with audio URL
      try {
        const [article] = await db.insert(articles).values({
          title: articleData.title,
          content: articleData.content,
          summary: articleData.summary,
          imageUrl: imageUrl,
          audioUrl: audioUrl,
          createdAt: new Date()
        }).returning();

        // Insert citations
        if (articleData.citations && Array.isArray(articleData.citations)) {
          const citationPromises = articleData.citations.map(citation =>
            db.insert(citations).values({
              articleId: article.id,
              source: citation.source,
              author: citation.author,
              year: citation.year,
              url: citation.url,
              quote: citation.quote
            })
          );
          await Promise.all(citationPromises);
        }

        res.json(article);
      } catch (error: any) {
        console.error('Database Error:', error);
        throw new Error('Failed to save article to database');
      }
    } catch (error) {
      console.error('Error generating article:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get all articles with pagination
  app.get("/api/articles", async (req, res) => {
    try {
      const showArchived = req.query.showArchived === 'true';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 9;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(articles)
        .where(showArchived ? undefined : eq(articles.archived, false));

      // Get paginated articles
      const paginatedArticles = await db
        .select()
        .from(articles)
        .where(showArchived ? undefined : eq(articles.archived, false))
        .orderBy(sql`${articles.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      res.json({
        articles: paginatedArticles,
        pagination: {
          total: totalCount[0].count,
          page,
          limit,
          totalPages: Math.ceil(totalCount[0].count / limit)
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch articles';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Archive/Unarchive article
  app.patch("/api/articles/:id/archive", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      const { archived } = req.body;

      if (isNaN(articleId)) {
        return res.status(400).json({ error: 'Invalid article ID' });
      }

      if (typeof archived !== 'boolean') {
        return res.status(400).json({ error: 'Invalid archived status' });
      }

      const [updatedArticle] = await db
        .update(articles)
        .set({ archived })
        .where(eq(articles.id, articleId))
        .returning();

      if (!updatedArticle) {
        return res.status(404).json({ error: 'Article not found' });
      }

      res.json(updatedArticle);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update article';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Bulk archive/unarchive articles
  app.patch("/api/articles/bulk/archive", async (req, res) => {
    try {
      const { articleIds, archived } = req.body;

      if (!Array.isArray(articleIds) || articleIds.length === 0) {
        return res.status(400).json({ error: 'Invalid article IDs' });
      }

      if (typeof archived !== 'boolean') {
        return res.status(400).json({ error: 'Invalid archived status' });
      }

      const updatedArticles = await db
        .update(articles)
        .set({ archived })
        .where(inArray(articles.id, articleIds))
        .returning();

      if (!updatedArticles.length) {
        return res.status(404).json({ error: 'No articles found' });
      }

      res.json(updatedArticles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update articles';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Get article citations
  app.get("/api/articles/:id/citations", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: 'Invalid article ID' });
      }

      const articleCitations = await db.select()
        .from(citations)
        .where(eq(citations.articleId, articleId));
      res.json(articleCitations);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch citations';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Generate speech from article content
  app.post("/api/articles/:id/speech", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: 'Invalid article ID' });
      }

      const article = await db.select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);
      
      if (!article.length) {
        return res.status(404).json({ error: "Article not found" });
      }

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: article[0].content.replace(/<[^>]*>/g, '') // Remove HTML tags for audio
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech';
      res.status(500).json({ error: errorMessage });
    }
  });
}