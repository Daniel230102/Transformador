import { GoogleGenAI, Type } from "@google/genai";
import { ReportData, ReportSection } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined") {
      throw new Error("La clave API de Gemini no está configurada. Por favor, añádela a las variables de entorno.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeWordContent(text: string): Promise<ReportData> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analiza el siguiente texto de un documento Word y extráelo en una estructura de informe profesional. 
    Debes sintetizar la información, extraer ideas clave y generar un resumen ejecutivo.
    También debes proponer un prompt de imagen descriptivo para cada sección (máximo 15 palabras, en inglés para mejor resultado).
    
    TEXTO:
    ${text.substring(0, 30000)} // Límite para evitar tokens excesivos
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          author: { type: Type.STRING },
          date: { type: Type.STRING },
          summary: { type: Type.STRING },
          keywords: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                keyPoints: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                imagePrompt: { type: Type.STRING, description: "Un prompt visual para ilustrar esta sección, sin texto." }
              },
              required: ["title", "content", "keyPoints", "imagePrompt"]
            }
          }
        },
        required: ["title", "subtitle", "author", "date", "summary", "sections", "keywords"]
      }
    }
  });

  const reportData = JSON.parse(response.text || "{}") as ReportData;
  return reportData;
}

export async function generateSectionImage(prompt: string): Promise<string | undefined> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A professional, clean, corporate-style image illustrating: ${prompt}. Minimalist, high quality, no text, no people faces if possible, abstract or office environment.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
  return undefined;
}
