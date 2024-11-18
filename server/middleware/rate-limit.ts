import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Basic rate limiter for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for OpenAI endpoints
export const openaiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    // If user is authenticated, allow more requests
    if (req.isAuthenticated()) {
      return 20; // 20 requests per hour for authenticated users
    }
    return 5; // 5 requests per hour for unauthenticated users
  },
  message: { error: 'You have exceeded the AI generation limit. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return req.isAuthenticated() ? `user_${req.user.id}` : req.ip;
  },
});

// Specific limiter for article generation
export const articleGenerationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: (req: Request) => {
    if (req.isAuthenticated()) {
      return 50; // 50 articles per day for authenticated users
    }
    return 2; // 2 articles per day for unauthenticated users
  },
  message: { error: 'Daily article generation limit reached. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.isAuthenticated() ? `user_${req.user.id}` : req.ip;
  },
});

// Specific limiter for speech generation
export const speechGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req: Request) => {
    if (req.isAuthenticated()) {
      return 30; // 30 speech generations per hour for authenticated users
    }
    return 3; // 3 speech generations per hour for unauthenticated users
  },
  message: { error: 'Speech generation limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.isAuthenticated() ? `user_${req.user.id}` : req.ip;
  },
});
