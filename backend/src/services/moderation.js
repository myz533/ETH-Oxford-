/**
 * AI Content Moderation Service
 * 
 * Two-tier filtering system:
 * 1. Local bad-words filter (instant, no API needed)
 * 2. OpenAI moderation API (advanced, contextual - optional)
 * 
 * This ensures goal titles, descriptions, and comments
 * are clean and appropriate for a social platform.
 */

const Filter = require("bad-words");

// Initialize local filter with custom additions
const localFilter = new Filter();
localFilter.addWords(
  "scam", "rugpull", "rug pull", "ponzi",
  // Add more custom banned words as needed
);

// Custom clean words that shouldn't be flagged
localFilter.removeWords("hell", "damn", "god");

/**
 * Check text against local profanity filter
 * @returns {{ clean: boolean, filtered: string, flagged: string[] }}
 */
function localModeration(text) {
  if (!text || typeof text !== "string") {
    return { clean: true, filtered: text, flagged: [] };
  }

  try {
    const isProfane = localFilter.isProfane(text);
    const filtered = localFilter.clean(text);

    // Find which words were flagged
    const flagged = [];
    const words = text.split(/\s+/);
    for (const word of words) {
      if (localFilter.isProfane(word)) {
        flagged.push(word);
      }
    }

    return {
      clean: !isProfane,
      filtered,
      flagged,
    };
  } catch {
    return { clean: true, filtered: text, flagged: [] };
  }
}

/**
 * Check text using OpenAI Moderation API (optional, advanced)
 * @returns {{ clean: boolean, categories: object, scores: object }}
 */
async function aiModeration(text) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_key_here") {
    // Fallback to local filter if no API key
    const local = localModeration(text);
    return {
      clean: local.clean,
      categories: {},
      scores: {},
      method: "local-fallback",
    };
  }

  try {
    const OpenAI = require("openai");
    const openai = new OpenAI({ apiKey });

    const response = await openai.moderations.create({ input: text });
    const result = response.results[0];

    return {
      clean: !result.flagged,
      categories: result.categories,
      scores: result.category_scores,
      method: "openai",
    };
  } catch (error) {
    console.error("OpenAI moderation error:", error.message);
    // Fallback to local
    const local = localModeration(text);
    return {
      clean: local.clean,
      categories: {},
      scores: {},
      method: "local-fallback",
    };
  }
}

/**
 * Full moderation pipeline - checks both local and AI
 * @param {string} text - Text to moderate
 * @returns {Promise<{ allowed: boolean, reason: string|null, filtered: string }>}
 */
async function moderateContent(text) {
  if (!text || text.trim().length === 0) {
    return { allowed: true, reason: null, filtered: text };
  }

  // Step 1: Local filter (instant)
  const local = localModeration(text);
  if (!local.clean) {
    return {
      allowed: false,
      reason: `Contains inappropriate language: ${local.flagged.join(", ")}`,
      filtered: local.filtered,
    };
  }

  // Step 2: AI moderation (if available)
  const ai = await aiModeration(text);
  if (!ai.clean) {
    const flaggedCategories = Object.entries(ai.categories || {})
      .filter(([, v]) => v)
      .map(([k]) => k);

    return {
      allowed: false,
      reason: `Content flagged by AI: ${flaggedCategories.join(", ")}`,
      filtered: text,
    };
  }

  return { allowed: true, reason: null, filtered: text };
}

/**
 * Express middleware for content moderation
 * Checks specified body fields for inappropriate content
 */
function moderationMiddleware(...fields) {
  return async (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value && typeof value === "string") {
        const result = await moderateContent(value);
        if (!result.allowed) {
          return res.status(400).json({
            error: "Content moderation failed",
            field,
            reason: result.reason,
            suggestion: result.filtered,
          });
        }
      }
    }
    next();
  };
}

module.exports = {
  localModeration,
  aiModeration,
  moderateContent,
  moderationMiddleware,
};
