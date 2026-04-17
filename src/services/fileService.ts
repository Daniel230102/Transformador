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
  const primaryColor = [15, 23, 42]; // #0f172a
  const accentColor = [249, 115, 22]; // #f97316

  // Title Page
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 297, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(data.title.toUpperCase(), 105, 100, { align: 'center' });
  
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(2);
  doc.line(40, 110, 170, 110);
  
  doc.setFontSize(14);
  doc.text(data.subtitle, 105, 120, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`${data.author} | ${data.date}`, 105, 140, { align: 'center' });

  // Summary Page
  doc.addPage();
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(18);
  doc.text("RESUMEN EJECUTIVO", 20, 30);
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.line(20, 35, 60, 35);
  
  doc.setFontSize(11);
  const splitSummary = doc.splitTextToSize(data.summary, 170);
  doc.text(splitSummary, 20, 50);

  // Sections
  data.sections.forEach((section, index) => {
    doc.addPage();
    doc.setFontSize(16);
    doc.text(`${index + 1}. ${section.title}`, 20, 30);
    doc.line(20, 35, 80, 35);
    
    const content = doc.splitTextToSize(section.content, 170);
    doc.setFontSize(10);
    doc.text(content, 20, 50);
    
    // Key points in a table or list
    let yPos = 55 + (content.length * 5);
    doc.setFontSize(12);
    doc.text("Puntos Clave:", 20, yPos);
    yPos += 10;
    
    section.keyPoints.forEach(point => {
      doc.setFontSize(10);
      doc.text(`• ${point}`, 25, yPos);
      yPos += 7;
    });

    if (section.imageUrl) {
      try {
        doc.addImage(section.imageUrl, 'PNG', 20, yPos + 5, 170, 95);
      } catch (e) {
        console.error("Error adding image to PDF", e);
      }
    }
  });

  doc.save(`${data.title.replace(/\s+/g, '_')}.pdf`);
}

export function generatePPT(data: ReportData) {
  const pptx = new PptxGenJS();

  // Title Slide
  let slide = pptx.addSlide();
  slide.background = { color: "0f172a" };
  slide.addText(data.title, { 
    x: 0.5, y: 2, w: "90%", h: 1, 
    fontSize: 36, color: "f97316", align: "center", bold: true 
  });
  slide.addText(data.subtitle, { 
    x: 0.5, y: 3, w: "90%", h: 0.5, 
    fontSize: 20, color: "ffffff", align: "center" 
  });
  slide.addText(`${data.author} - ${data.date}`, { 
    x: 0.5, y: 4.5, w: "90%", h: 0.5, 
    fontSize: 14, color: "cbd5e1", align: "center" 
  });

  // Summary Slide
  slide = pptx.addSlide();
  slide.addText("RESUMEN EJECUTIVO", { x: 0.5, y: 0.5, fontSize: 24, color: "0f172a", bold: true });
  slide.addText(data.summary, { x: 0.5, y: 1.5, w: 9, h: 3, fontSize: 14 });

  // Section Slides
  data.sections.forEach(section => {
    slide = pptx.addSlide();
    slide.addText(section.title, { x: 0.5, y: 0.5, fontSize: 24, color: "f97316", bold: true });
    
    // Left side: Text
    slide.addText(section.keyPoints.map(p => `• ${p}`).join("\n"), { 
      x: 0.5, y: 1.5, w: 4.5, h: 3.5, 
      fontSize: 14, valign: 'top' 
    });
    
    // Right side: Image
    if (section.imageUrl) {
      slide.addImage({ data: section.imageUrl, x: 5.2, y: 1.5, w: 4.3, h: 3 });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: 5.2, y: 1.5, w: 4.3, h: 3, fill: { color: "e2e8f0" } });
      slide.addText("[Imagen IA]", { x: 5.2, y: 1.5, w: 4.3, h: 3, align: 'center', fontSize: 12, color: '64748b' });
    }
  });

  pptx.writeFile({ fileName: `${data.title.replace(/\s+/g, '_')}.pptx` });
}
