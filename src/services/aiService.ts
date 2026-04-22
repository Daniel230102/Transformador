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
    1. Debes sintetizar la información, extraer ideas clave y generar un resumen ejecutivo.
    2. Debes decidir una estética (Theme) basada en el tema del proyecto (ej: si es médico usa colores limpios y profesionales, si es de marketing usa colores vibrantes y modernos).
    3. Proporciona prompts de imagen distintos para el Informe (Report) y la Presentación (PPT). El del Informe debe ser más sobrio y descriptivo; el de la Presentación debe ser más visual, impactante y cinematográfico.
    
    TEXTO:
    ${text.substring(0, 30000)}
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
          theme: {
            type: Type.OBJECT,
            properties: {
              primaryColor: { type: Type.STRING, description: "Color principal en Hex (ej: #1e3a8a)" },
              secondaryColor: { type: Type.STRING, description: "Color secundario en Hex" },
              accentColor: { type: Type.STRING, description: "Color de acento en Hex" },
              aesthetic: { type: Type.STRING, enum: ["corporate", "creative", "technical", "minimalist", "academic"] }
            },
            required: ["primaryColor", "secondaryColor", "accentColor", "aesthetic"]
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
                reportImagePrompt: { type: Type.STRING, description: "Prompt para imagen de informe (sobrio)." },
                presentationImagePrompt: { type: Type.STRING, description: "Prompt para imagen de diapositiva (impactante)." }
              },
              required: ["title", "content", "keyPoints", "reportImagePrompt", "presentationImagePrompt"]
            }
          }
        },
        required: ["title", "subtitle", "author", "date", "summary", "sections", "keywords", "theme"]
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
