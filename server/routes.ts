import type { Express } from "express";
import { db } from "../db";
import { articles, citations } from "../db/schema";
import OpenAI from "openai";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerRoutes(app: Express) {
  // Generate article
  app.post("/api/articles/generate", async (req, res) => {
    try {
      const { topic } = req.body;
      
      // Generate article content
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an academic research assistant. Generate a well-structured article with citations in JSON format with the following fields: title, content, summary, citations (array of {source, author, year, quote})"
          },
          {
            role: "user", 
            content: `Generate a comprehensive academic article about: ${topic}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const articleData = JSON.parse(completion.choices[0].message.content);
      
      // Generate image for article
      const image = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Academic illustration for article about: ${articleData.title}`,
        n: 1,
        size: "1024x1024"
      });

      // Generate audio for article
      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: articleData.content
      });

      // Convert audio to base64 and store in cloud storage (using data URL for now)
      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      const audioUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`;

      // Insert article with audio URL
      const [article] = await db.insert(articles).values({
        title: articleData.title,
        content: articleData.content,
        summary: articleData.summary,
        imageUrl: image.data[0].url,
        audioUrl: audioUrl
      }).returning();

      // Insert citations
      const citationPromises = articleData.citations.map(citation =>
        db.insert(citations).values({
          articleId: article.id,
          ...citation
        })
      );
      await Promise.all(citationPromises);

      res.json(article);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all articles
  app.get("/api/articles", async (req, res) => {
    try {
      const allArticles = await db.select().from(articles);
      res.json(allArticles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get article citations
  app.get("/api/articles/:id/citations", async (req, res) => {
    try {
      const articleCitations = await db.select()
        .from(citations)
        .where(eq(citations.articleId, parseInt(req.params.id)));
      res.json(articleCitations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate speech from article content
  app.post("/api/articles/:id/speech", async (req, res) => {
    try {
      const article = await db.select().from(articles)
        .where(eq(articles.id, parseInt(req.params.id)))
        .limit(1);
      
      if (!article.length) {
        return res.status(404).json({ error: "Article not found" });
      }

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: article[0].content
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}