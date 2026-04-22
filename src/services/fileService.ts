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
  
  // Theme variants based on AI choice
  const bgColor = theme.aesthetic === 'minimalist' ? "ffffff" : "0f172a";
  const titleColor = theme.aesthetic === 'minimalist' ? theme.primaryColor.replace('#', '') : "ffffff";
  const accentColor = theme.accentColor.replace('#', '');

  // --- PRESENTATION COVER ---
  let slide = pptx.addSlide();
  slide.background = { color: bgColor };
  
  // Big Design Elements
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.5, w: '25%', h: 0.1, fill: { color: accentColor } });
  
  slide.addText(data.title.toUpperCase(), { 
    x: 0.5, y: 1.5, w: 9, h: 2, 
    fontSize: 48, color: titleColor, align: "left", bold: true, fontFace: "Impact"
  });
  
  slide.addText(data.subtitle, { 
    x: 0.5, y: 3.5, w: 9, h: 0.5, 
    fontSize: 24, color: accentColor, align: "left"
  });

  // --- CONTENT SLIDES (Presentation Impact) ---
  data.sections.forEach((section, index) => {
    slide = pptx.addSlide();
    slide.background = { color: bgColor };

    // Dynamic Slide Layout
    const isOdd = index % 2 === 0;
    
    // Header
    slide.addText(section.title, { 
      x: 0.5, y: 0.5, w: 9, h: 0.8, 
      fontSize: 32, color: accentColor, bold: true 
    });

    // Content: Bullet Points (Slide logic)
    slide.addText(section.keyPoints.map(p => { return { text: p, options: { bullet: true, indent: 20 } }; }), {
      x: isOdd ? 5.2 : 0.5, y: 1.5, w: 4.3, h: 4,
      fontSize: 18, color: titleColor,
      valign: 'middle'
    });

    // Presentation Image (Cinematic/Visual)
    if (section.presentationImageUrl) {
      slide.addImage({ 
        data: section.presentationImageUrl, 
        x: isOdd ? 0.5 : 5.2, y: 1.5, w: 4.3, h: 3.5,
        sizing: { type: 'cover', w: 4.3, h: 3.5 }
      });
      // Aesthetic border
      slide.addShape(pptx.ShapeType.rect, { 
        x: (isOdd ? 0.5 : 5.2) + 0.1, y: 1.6, w: 4.3, h: 3.5, 
        line: { color: accentColor, width: 2 } 
      });
    }

    // Interactive Footer
    slide.addText(`PROYECTO: ${data.title.toUpperCase()} | SESIÓN ${index + 1}`, {
      x: 0.5, y: 5.2, w: 9, h: 0.3, fontSize: 10, color: "888888", align: 'center'
    });
  });

  pptx.writeFile({ fileName: `${data.title.replace(/\s+/g, '_')}_Presentacion.pptx` });
}
