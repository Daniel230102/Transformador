import { GoogleGenAI, Type } from "@google/genai";
import { ReportData, ReportSection } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getGeminiKey(): string | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return null;
  }
  return apiKey;
}

function getGroqKey(): string | null {
  const apiKey = process.env.CONVERSOR_API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    return null;
  }
  return apiKey;
}

function getAI() {
  if (!aiInstance) {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      throw new Error("La clave API de Gemini no está configurada.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

// Extract concise query terms from prompt for fallback high-quality stock photography
function extractKeyword(prompt: string): string {
  let clean = prompt
    .toLowerCase()
    .replace(/high-quality/g, '')
    .replace(/professional/g, '')
    .replace(/visual[:]?/g, '')
    .replace(/cinematic lighting/g, '')
    .replace(/8k resolution/g, '')
    .replace(/clean composition/g, '')
    .replace(/no text/g, '')
    .replace(/drawing/g, '')
    .replace(/illustration/g, '')
    .replace(/diagram/g, '')
    .replace(/vector/g, '')
    .replace(/illustration of/g, '')
    .replace(/concept of/g, '')
    .replace(/image of/g, '')
    .trim();

  // Pick first 3 words longer than 3 characters, omitting common conjunctions
  const words = clean.split(/[\s,.-]+/).filter(w => w.length > 3 && w !== 'with' && w !== 'that' && w !== 'from' && w !== 'this');
  if (words.length > 0) {
    return words.slice(0, 3).join(',');
  }
  return 'technology,corporate';
}

export async function analyzeWordContent(text: string): Promise<ReportData> {
  const groqKey = getGroqKey();

  if (groqKey) {
    console.log("Using Groq API with LLaMA model via CONVERSOR_API_KEY...");
    
    // We try multiple premium Groq models for extreme reliability and speed
    const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"];
    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `Eres un consultor ejecutivo sénior de McKinsey y un experto diseñador instruccional. 
                Tu objetivo es analizar el documento adjuntado y transformarlo en un informe corporativo de alta calidad técnica, diseño espectacular y contenido muy extenso en español:
                
                Sigue estrictamente este esquema JSON:
                {
                  "title": "Título principal del informe. Debe ser profesional e importante.",
                  "subtitle": "Subtítulo elegante o la propuesta de valor principal.",
                  "author": "Nombre del autor o empresa redactora formal.",
                  "date": "Fecha formal de presentación (ej: Mayo 2026).",
                  "summary": "Resumen ejecutivo estratégico en español de al menos 120-150 palabras analizando los hallazgos cruciales.",
                  "keywords": ["estrategia", "empresa", "tecnología"],
                  "theme": {
                    "primaryColor": "#1e3a8a", // Color hexadecimal primario de la paleta corporativa
                    "secondaryColor": "#3b82f6", // Color secundario coordinado
                    "accentColor": "#f97316", // Color destacado de alto contraste
                    "aesthetic": "corporate" // "corporate" | "creative" | "technical" | "minimalist" | "academic"
                  },
                  "sections": [
                    {
                      "title": "Título descriptivo de la sección",
                      "content": "Análisis exhaustivo, rico, detallado en párrafos extensos en español (mínimo de 150 a 200 palabras por sección). No resumas en frases inconclusas ni dejes ideas a medias.",
                      "keyPoints": [
                        "Dato clave o punto estratégico 1",
                        "Dato clave o punto estratégico 2",
                        "Dato clave o punto estratégico 3"
                      ],
                      "reportImagePrompt": "A single clear search keyword or short english noun phrase representing the visual (e.g. 'office teamwork illustration')",
                      "presentationImagePrompt": "An english aesthetic concept for cinematic imagery (e.g. 'modern corporate architectural glass tower')"
                    }
                  ]
                }
                
                REGLAS CRÍTICAS:
                1. MÁXIMA EXTENSIÓN: Expande cada sección detallando conceptos analizados con precisión técnica. No resumas.
                2. NÚMERO DE SECCIONES: Genera de 6 a 10 secciones consecutivas para cubrir todo el texto original de extremo a extremo.
                3. ESTILO DE VALORES HEXADECIMALES: Elige colores hermosos, equilibrados y modernos, no uses combinaciones estridentes.
                4. Devuelve ÚNICAMENTE el esquema JSON válido. No incluyes explicaciones extra, saludos o despedidas.`
              },
              {
                role: "user",
                content: `TEXTO DEL DOCUMENTO DOCX:\n${text.substring(0, 45000)}`
              }
            ],
            response_format: {
              type: "json_object"
            },
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error calling Groq! status: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || "";
        
        // Clean JSON format backticks if any
        let cleanText = responseText.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.substring(7);
        }
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }

        const reportData = JSON.parse(cleanText.trim()) as ReportData;
        
        // Final sanity checks on parsed object
        if (reportData && reportData.title && reportData.sections && reportData.sections.length > 0) {
          return reportData;
        }
      } catch (e: any) {
        console.warn(`Failed with Groq model ${model}:`, e);
        lastError = e;
      }
    }
    
    console.error("All Groq models failed.");
    throw lastError || new Error("Error en el procesamiento con Groq.");
  }

  // --- FALLBACK TO GEMINI (EXACT ORIGINAL LOGIC) ---
  console.log("Using Gemini API for document analysis...");
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

async function fetchAndConvertToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to convert fallback Unsplash image to base64, using a solid color fallback:", error);
    // Return a beautiful solid corporate warm slate background (1x1 PNG pixel)
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAC1HAwCAAAAC0lEQVR42mN8vJfRDwAE8AF00L/vswAAAABJRU5ErkJggg==";
  }
}

export async function generateSectionImage(prompt: string): Promise<string | undefined> {
  const geminiKey = getGeminiKey();
  const groqKey = getGroqKey();

  // If CONVERSOR_API_KEY (Groq) is present, we completely bypass Gemini image generation to avoid any 429 quota exception and immediately use Unsplash.
  if (geminiKey && !groqKey) {
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
            imageSize: "768x432" // Optimized for better performance and compatibility on Vercel
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          // Force JPEG header explicitly for excellent quality and cross-browser Vercel downloads
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.warn("Unable to generate image with Gemini, falling back to Unsplash photo reference safely without disruption:", error);
    }
  }

  // --- PREMIUM FALLBACK DESIGN: Unsplash Cinematic Real Photo ---
  // Retrieve highly curated conceptual visual assets via Unsplash redirects.
  // We instantly fetch and convert to Base64 to bypass any CORS restrictions or PptxGenJS format limitations!
  const term = extractKeyword(prompt);
  const randomId = Math.floor(Math.random() * 9999);
  const url = `https://images.unsplash.com/featured/768x432?sig=${randomId}&${encodeURIComponent(term)}`;
  console.log(`Fallback Image: resolved keyword term [${term}] -> URL: ${url}`);
  
  // Convert URL directly to base64 before passing it to avoid PPTX/PDF generation failures or alerts
  return await fetchAndConvertToBase64(url);
}
