import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  return localStorage.getItem("gemini_api_key") || "";
};

export interface LoreResult {
  summary: string;
  lore: string;
  usage: string[];
  tags: string[];
  img: string;
  youtubeId?: string;
}

export async function fetchLore(query: string, imageData?: string): Promise<LoreResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("Please enter your Gemini API key first.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `
You are the AI engine for an app called "Lets Larp".

The app does NOT want dictionary definitions.
The app explains internet slang, memes, irony, online culture, social-media context, and how people actually use phrases online.

${query ? `TEXT QUERY: "${query}"` : ""}
${imageData ? "IMAGE INPUT: An image has been provided. Analyze it for memes, captions, characters, reaction images, visual jokes, screenshots, or cultural references." : ""}

Your job:
Explain the input as it is used online, especially as slang, meme language, sarcasm, fandom language, TikTok/Twitter/X/Reddit/Discord culture, gaming culture, political internet language, or comment-section context.

Important rules:
- Do NOT give a normal dictionary definition.
- Do NOT start with the literal meaning unless it is necessary to understand the slang meaning.
- If the term has both a literal meaning and a slang/meme meaning, focus mainly on the slang/meme/context meaning.
- Explain what someone probably means when they use it online.
- Explain the vibe/tone: ironic, mocking, cringe, affectionate, edgy, political, fandom-related, unserious, etc.
- Explain why people say it in comments, captions, memes, arguments, or jokes.
- Give realistic examples of how people would use it online.
- Keep it useful for someone who saw the term online and wants to understand the hidden context.
- For terms like "larp", "NPC", "based", "mog", "cook", "ratio", "aura", etc., prioritize the internet slang meaning over the original meaning.

Restriction:
If the input is completely unrelated to memes, slang, internet culture, social media, gaming, fandoms, or cultural context, then return this exact sentence in both "summary" and "lore":
"sorry please refine your search by asking about a meme, slang or context you'd like to larp"

Return ONLY valid JSON matching the required schema.
`;

    const cleanImageData = imageData ? imageData.split(",")[1] : undefined;

    const contents = [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...(cleanImageData
            ? [{ inlineData: { data: cleanImageData, mimeType: "image/jpeg" } }]
            : []),
        ],
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description:
                "A concise 1-sentence explanation of what this means in online slang, meme, or cultural context. Do not use dictionary-style definitions.",
            },
            lore: {
              type: Type.STRING,
              description:
                "A practical explanation of the slang/meme/internet meaning, including tone, context, hidden implication, and why people use it online. Prioritize current online usage over literal origin.",
            },
            usage: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "2-3 realistic examples of how this term would be used in comments, captions, memes, arguments, Discord, Reddit, TikTok, Twitter/X, or casual online conversation.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "3 highly relevant internet culture, slang, meme, or community-context tags.",
            },
            img: {
              type: Type.STRING,
              description:
                "A relevant Unsplash image URL that matches the vibe. Format: https://images.unsplash.com/photo-...?w=800&h=450&fit=crop",
            },
          },
          required: ["summary", "lore", "usage", "tags", "img"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI nodes.");

    return JSON.parse(text) as LoreResult;
  } catch (error: any) {
    console.error("Gemini Error:", error);

    const message = error?.message || String(error);

    if (message.includes("429")) {
      throw new Error("Rate limit reached. Please wait a minute and try again.");
    }

    if (message.includes("403")) {
      throw new Error(
        "API key permission issue. Make sure your key is from Google AI Studio and Generative Language API is enabled."
      );
    }

    if (message.includes("400")) {
      throw new Error(
        "Request failed. The model or request format may not be supported by this API key."
      );
    }

    throw new Error("Gemini request failed. Please check your API key and try again.");
  }
}