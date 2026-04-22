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
    contents: `Analiza exhaustivamente el siguiente texto de un documento Word y transformalo en un informe profesional EXTENSO y una presentación de alto impacto. 
    
    INSTRUCCIONES CRÍTICAS DE CONTENIDO:
    1. EXPANSIÓN: No resumas. Desarrolla cada punto clave en párrafos detallados de al menos 150-200 palabras por sección.
    2. ESTRUCTURA: Genera un mínimo de 6 a 10 secciones si el texto original lo permite. Debe cubrir TODO el contenido del archivo subido.
    3. TEMATIZACIÓN: Elige una estética (Theme) personalizada basada en el tema (ej: 'cyberpunk' para tecnología, 'minimalist' para arquitectura, 'vibrant' para marketing).
    4. IMÁGENES DUALES:
       - 'reportImagePrompt': Prompt para una imagen técnica, tipo ilustración corporativa o diagrama visual limpio.
       - 'presentationImagePrompt': Prompt para una imagen cinematográfica, espectacular y con gran fuerza visual.
    
    TEXTO DEL DOCUMENTO:
    ${text.substring(0, 35000)}
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
              primaryColor: { type: Type.STRING },
              secondaryColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
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
                reportImagePrompt: { type: Type.STRING },
                presentationImagePrompt: { type: Type.STRING }
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
            text: `High-quality professional visual: ${prompt}. Cinematic lighting, 8k resolution, clean composition. No text.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "768x432" // Adjusted for better performance and compatibility on Vercel
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        // Force PNG/JPG header explicitly for better browser support
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
  return undefined;
}
