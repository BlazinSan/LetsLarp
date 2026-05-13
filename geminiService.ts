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
    const prompt = `Perform a deep web search to fetch the most current cultural lore, internet slang, or meme context for the following input. 
    
    ${query ? `TEXT QUERY: "${query}"` : ""}
    ${imageData ? "IMAGE INPUT: An image has been provided. Analyze its content for any memes, characters, or cultural references." : ""}

    CRITICAL RESTRICTION: This service ONLY identifies memes, slang, internet lore, and cultural subculture context. 
    If the input is NOT a meme, slang, or cultural lore, 
    you MUST return the exact phrase "sorry please refine your search by asking about a meme, slang or context you'd like to larp" in the 'summary' and 'lore' fields.
    
    Cross-reference live social media trends and community-driven databases to ensure maximum accuracy for 2024-2026 context.
`;

    const cleanImageData = imageData ? imageData.split(',')[1] : undefined;

    const contents = [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...(cleanImageData ? [{ inlineData: { data: cleanImageData, mimeType: "image/jpeg" } }] : [])
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
      config: {
        //tools: [{ googleSearch: {} }], bleh didn't work :(
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise 1-sentence summary of what this is.",
            },
            lore: {
              type: Type.STRING,
              description: "The deep dive history, origin, and cultural context.",
            },
            usage: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 examples of how this is used in conversation.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 highly relevant tags or categories.",
            },
            img: {
              type: Type.STRING,
              description: "A relevant Unsplash image URL that matches the vibe. Format: https://images.unsplash.com/photo-...?w=800&h=450&fit=crop",
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
    throw new Error("API key permission issue. Make sure your key is from Google AI Studio and Generative Language API is enabled.");
  }

  if (message.includes("400")) {
    throw new Error("Request failed. The model or request format may not be supported by this API key.");
  }

  throw new Error("Gemini request failed. Please check your API key and try again.");
}
}