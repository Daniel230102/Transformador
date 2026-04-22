import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import { ReportData } from '../types';

export async function parseWordFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Helper to convert HEX to RGB
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function generatePDF(data: ReportData) {
  const doc = new jsPDF();
  const theme = data.theme;
  const primary = hexToRgb(theme.primaryColor);
  const secondary = hexToRgb(theme.secondaryColor);
  const accent = hexToRgb(theme.accentColor);
  const textColor = [40, 44, 52];

  // --- TITLE PAGE (Professional Report Style) ---
  // Background Gradient-like effect
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, 210, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(data.title.toUpperCase(), 20, 45);
  
  doc.setFontSize(14);
  doc.text(data.subtitle, 20, 58);

  // Author & Info Box
  doc.setFillColor(245, 247, 250);
  doc.rect(20, 100, 170, 40, 'F');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.text("AUTOR:", 30, 115);
  doc.setFont("helvetica", "bold");
  doc.text(data.author, 60, 115);
  
  doc.setFont("helvetica", "normal");
  doc.text("FECHA:", 30, 125);
  doc.text(data.date, 60, 125);
  
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(1.5);
  doc.line(20, 100, 20, 140);

  // Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Resumen Ejecutivo", 20, 165);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const summaryLines = doc.splitTextToSize(data.summary, 170);
  doc.text(summaryLines, 20, 175, { lineHeightFactor: 1.6 });

  // --- CONTENT PAGES (Document Layout) ---
  data.sections.forEach((section, index) => {
    doc.addPage();
    
    // Header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(data.title, 20, 10);
    doc.text(`PÁGINA ${doc.getCurrentPageInfo().pageNumber}`, 180, 10);

    // Section Header
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${section.title}`, 20, 35);
    
    // Visual Separation
    doc.setDrawColor(secondary[0], secondary[1], secondary[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 50, 38);

    // Two-column style simulation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const content = doc.splitTextToSize(section.content, 170);
    doc.text(content, 20, 50, { lineHeightFactor: 1.4 });

    let yPos = 55 + (content.length * 5.5);

    // Infographic Box for Key Points
    doc.setFillColor(250, 250, 250);
    doc.rect(20, yPos, 170, (section.keyPoints.length * 7) + 12, 'F');
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.setFont("helvetica", "bold");
    doc.text("CONSIDERACIONES CLAVE:", 25, yPos + 8);
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    section.keyPoints.forEach((point, pIndex) => {
      doc.text(`• ${point}`, 30, yPos + 16 + (pIndex * 6));
    });

    yPos += (section.keyPoints.length * 7) + 20;

    // Report Image (Subtle/Descriptive)
    if (section.reportImageUrl) {
      if (yPos > 200) doc.addPage();
      const finalY = yPos > 200 ? 50 : yPos;
      try {
        doc.addImage(section.reportImageUrl, 'PNG', 20, finalY, 170, 85);
      } catch (e) { console.error(e); }
    }
  });

  doc.save(`${data.title.replace(/\s+/g, '_')}_Informe.pdf`);
}

export function generatePPT(data: ReportData) {
  const pptx = new PptxGenJS();
  const theme = data.theme;
  const primary = theme.primaryColor.replace('#', '');
  const accent = theme.accentColor.replace('#', '');
  const secondary = theme.secondaryColor.replace('#', '');
  const textColor = theme.aesthetic === 'minimalist' ? '333333' : 'ffffff';
  const bgColor = theme.aesthetic === 'minimalist' ? 'ffffff' : '0f172a';

  // --- 1. PORTADA ---
  let slide = pptx.addSlide();
  slide.background = { color: bgColor };
  
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: accent } });
  slide.addText(data.title.toUpperCase(), { 
    x: 1, y: 1.5, w: 8, h: 2, fontSize: 48, color: accent, bold: true, align: 'center', fontFace: 'Impact' 
  });
  slide.addText(data.subtitle, { 
    x: 1, y: 3.5, w: 8, h: 0.5, fontSize: 24, color: textColor, align: 'center' 
  });
  slide.addText(`Por: ${data.author} | ${data.date}`, { 
    x: 1, y: 4.8, w: 8, h: 0.5, fontSize: 14, color: '888888', align: 'center' 
  });

  // --- 2. ÍNDICE (TABLA DE CONTENIDOS) ---
  slide = pptx.addSlide();
  slide.background = { color: bgColor };
  slide.addText("ÍNDICE DE CONTENIDOS", { 
    x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 32, color: accent, bold: true, border: { pos: 'b', color: accent, size: 2 } 
  });
  
  const indexPoints = data.sections.map((s, i) => `${String(i + 1).padStart(2, '0')}. ${s.title.toUpperCase()}`);
  slide.addText(indexPoints.join('\n'), {
    x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 16, color: textColor, lineSpacing: 28, bold: true
  });

  // --- 3. CONTENIDO DINÁMICO ---
  data.sections.forEach((section, index) => {
    slide = pptx.addSlide();
    slide.background = { color: bgColor };
    
    // Alternar entre 4 estilos de diseño para que no sean iguales
    const designStyle = index % 4;

    switch (designStyle) {
      case 0: // Imagen Completa Fondo Izquierda, Texto Derecha
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 5, h: '100%', fill: { color: '1e293b' } });
        if (section.presentationImageUrl) {
          slide.addImage({ data: section.presentationImageUrl, x: 0.2, y: 0.2, w: 4.6, h: 5.2, sizing: { type: 'cover', w: 4.6, h: 5.2 } });
        }
        slide.addText(section.title, { x: 5.5, y: 0.5, w: 4, h: 1, fontSize: 24, color: accent, bold: true });
        slide.addText(section.keyPoints.map(p => `• ${p}`).join('\n'), { x: 5.5, y: 1.5, w: 4, h: 3.5, fontSize: 14, color: textColor, lineSpacing: 22 });
        break;

      case 1: // Enfoque Texto Arriba, 3 Columnas abajo
        slide.addText(section.title, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 28, color: accent, bold: true, align: 'center' });
        if (section.presentationImageUrl) {
          slide.addImage({ data: section.presentationImageUrl, x: 1, y: 1.5, w: 8, h: 2.2, sizing: { type: 'contain', w: 8, h: 2.2 } });
        }
        slide.addText(section.keyPoints.join(' | '), { x: 0.5, y: 4, w: 9, h: 1, fontSize: 14, color: textColor, align: 'center', italic: true });
        break;

      case 2: // Split Horizontal, Imagen abajo enorme
        slide.addText(section.title, { x: 0.5, y: 0.3, w: 6, h: 0.6, fontSize: 24, color: accent, bold: true });
        slide.addText(section.keyPoints.slice(0, 3).join(' • '), { x: 0.5, y: 0.8, w: 9, h: 0.5, fontSize: 12, color: 'cccccc' });
        if (section.presentationImageUrl) {
          slide.addImage({ data: section.presentationImageUrl, x: 0.5, y: 1.5, w: 9, h: 3.8, sizing: { type: 'cover', w: 9, h: 3.8 } });
        }
        break;

      case 3: // Estilo "Gráfico": Texto izquierda, imagen con marco derecha
        slide.addShape(pptx.ShapeType.rect, { x: 5.2, y: 1.5, w: 4.5, h: 3.5, line: { color: accent, width: 3 } });
        if (section.presentationImageUrl) {
          slide.addImage({ data: section.presentationImageUrl, x: 5.3, y: 1.6, w: 4.3, h: 3.3 });
        }
        slide.addText(section.title, { x: 0.5, y: 0.5, w: 4.5, h: 1, fontSize: 26, color: accent, bold: true });
        slide.addText(section.keyPoints.map(p => `► ${p}`).join('\n'), { x: 0.5, y: 1.5, w: 4.5, h: 3.5, fontSize: 13, color: textColor, lineSpacing: 20 });
        break;
    }

    // Pie de página elegante en todas
    slide.addText(`${data.title.toUpperCase()} | PÁGINA ${index + 3}`, { 
      x: 0, y: 5.3, w: '100%', h: 0.3, fontSize: 9, color: '666666', align: 'center' 
    });
  });

  pptx.writeFile({ fileName: `${data.title.replace(/\s+/g, '_')}_Presentacion.pptx` });
}
