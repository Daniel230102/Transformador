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

export function generatePDF(data: ReportData) {
  const doc = new jsPDF();
  const primaryColor = [15, 23, 42]; // #0f172a (Slate 900)
  const secondaryColor = [249, 115, 22]; // #f97316 (Orange 500)
  const textColor = [51, 65, 85]; // #334155 (Slate 700)
  const lightBg = [248, 250, 252]; // #f8fafc

  // --- TITLE PAGE (Editorial Style) ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 297, 'F');
  
  // Decorative side bar
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(0, 0, 15, 297, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), 160);
  doc.text(titleLines, 30, 80);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(200, 200, 200);
  doc.text(data.subtitle, 30, 80 + (titleLines.length * 15));
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(30, 150, 100, 150);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(`PREPARADO POR: ${data.author.toUpperCase()}`, 30, 165);
  doc.text(`FECHA: ${data.date}`, 30, 172);

  // --- SUMMARY PAGE ---
  doc.addPage();
  // Header line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(20, 20, 190, 20);
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(data.title.toUpperCase(), 20, 15);
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Resumen Ejecutivo", 20, 40);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(data.summary, 170);
  doc.text(summaryLines, 20, 55, { lineHeightFactor: 1.5 });

  // --- SECTIONS ---
  data.sections.forEach((section, index) => {
    doc.addPage();
    
    // Page Header
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Sección ${index + 1} | ${data.title}`, 20, 15);
    doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, 180, 15);
    doc.line(20, 18, 190, 18);

    // Section Title
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(section.title, 20, 35);
    
    // Main Content
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const contentLines = doc.splitTextToSize(section.content, 170);
    doc.text(contentLines, 20, 50, { lineHeightFactor: 1.4 });
    
    let currentY = 55 + (contentLines.length * 5.5);

    // Image Placement
    if (section.imageUrl) {
      try {
        doc.addImage(section.imageUrl, 'PNG', 20, currentY, 170, 95);
        currentY += 105;
      } catch (e) { console.error(e); }
    }

    // Key Points Box
    if (currentY > 240) doc.addPage();
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(230, 230, 230);
    doc.rect(20, currentY, 170, (section.keyPoints.length * 8) + 15, 'FD');
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("HALLAZGOS CLAVE:", 25, currentY + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    section.keyPoints.forEach((point, pIndex) => {
      doc.text(`• ${point}`, 30, currentY + 18 + (pIndex * 7));
    });
  });

  doc.save(`${data.title.replace(/\s+/g, '_')}.pdf`);
}

export function generatePPT(data: ReportData) {
  const pptx = new PptxGenJS();
  const theme = {
    primary: "0f172a",
    accent: "f97316",
    white: "ffffff",
    grey: "f8fafc",
    text: "334155"
  };

  // --- SLIDE MAESTRO: PORTADA ---
  let slide = pptx.addSlide();
  slide.background = { color: theme.primary };
  
  // Decorative line
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: theme.accent } });
  
  slide.addText(data.title.toUpperCase(), { 
    x: 0.5, y: 1.5, w: 9, h: 1.5, 
    fontSize: 44, color: theme.white, align: "center", bold: true, fontFace: "Arial Black"
  });
  
  slide.addText(data.subtitle, { 
    x: 1, y: 3.2, w: 8, h: 0.5, 
    fontSize: 22, color: theme.accent, align: "center", fontFace: "Georgia", italic: true
  });
  
  slide.addText(data.author, { 
    x: 1, y: 4.8, w: 8, h: 0.4, 
    fontSize: 16, color: theme.white, align: "center", bold: true
  });
  
  slide.addText(data.date, { 
    x: 1, y: 5.2, w: 8, h: 0.3, 
    fontSize: 12, color: "94a3b8", align: "center"
  });

  // --- SLIDE MAESTRO: RESUMEN (LAYOUT 2 COLUMNAS) ---
  slide = pptx.addSlide();
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: '100%', fill: { color: theme.primary } });
  slide.addText("RESUMEN EJECUTIVO", { 
    x: 0.6, y: 0.4, w: 8, h: 0.8, fontSize: 28, color: theme.primary, bold: true 
  });
  
  slide.addText(data.summary, { 
    x: 0.6, y: 1.5, w: 8.8, h: 3.5, 
    fontSize: 18, color: theme.text, valign: 'top', lineSpacing: 24 
  });

  // --- SLIDES DE CONTENIDO (LAYOUTS ALTERNOS) ---
  data.sections.forEach((section, index) => {
    slide = pptx.addSlide();
    const isEven = index % 2 === 0;

    // Background accent
    slide.addShape(pptx.ShapeType.rect, { 
      x: isEven ? 0 : 5, y: 0, w: 5, h: '100%', fill: { color: "f1f5f9" } 
    });

    // Title with indicator
    slide.addText(`0${index + 1}`, { x: 0.5, y: 0.3, fontSize: 14, color: theme.accent, bold: true });
    slide.addText(section.title, { 
      x: 0.5, y: 0.6, w: 9, h: 0.6, 
      fontSize: 28, color: theme.primary, bold: true 
    });

    // Content Layout
    const textProps = {
      x: isEven ? 5.2 : 0.5, y: 1.5, w: 4.3, h: 3.5,
      fontSize: 16, color: theme.text,
      bullet: { type: 'number', numberType: 'romanLcl' },
      valign: 'middle'
    };
    
    slide.addText(section.keyPoints.map(p => { return { text: p, options: { breakLine: true } }; }), textProps);

    // Image Layout
    const imgX = isEven ? 0.5 : 5.2;
    if (section.imageUrl) {
      slide.addImage({ data: section.imageUrl, x: imgX, y: 1.5, w: 4.3, h: 3.2, sizing: { type: 'contain', w: 4.3, h: 3.2 } });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: imgX, y: 1.5, w: 4.3, h: 3.2, fill: { color: "cbd5e1" } });
    }

    // Modern footer decoration
    slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.3, w: 9, h: 0.02, fill: { color: theme.accent } });
    slide.addText(data.title, { x: 0.5, y: 5.4, w: 5, h: 0.2, fontSize: 10, color: "94a3b8" });
  });

  pptx.writeFile({ fileName: `${data.title.replace(/\s+/g, '_')}.pptx` });
}
