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
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
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

      // Insert article
      const [article] = await db.insert(articles).values({
        title: articleData.title,
        content: articleData.content,
        summary: articleData.summary,
        imageUrl: image.data[0].url
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
}
