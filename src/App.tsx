/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle2, 
  Loader2, 
  Presentation, 
  Image as ImageIcon,
  Clock,
  Sparkles,
  Search
} from 'lucide-react';
import { BentoCard } from './components/BentoCard';
import { parseWordFile, generatePDF, generatePPT } from './services/fileService';
import { analyzeWordContent, generateSectionImage } from './services/aiService';
import { ReportData, ProcessStatus } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [status, setStatus] = useState<ProcessStatus>('idle');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [processTime, setProcessTime] = useState<number>(0);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const startTime = Date.now();
    setFileName(file.name);
    setStatus('parsing');

    try {
      // 1. Parse Word
      const text = await parseWordFile(file);
      
      // 2. AI Analysis
      setStatus('analyzing');
      const data = await analyzeWordContent(text);
      
      // 3. Image Generation (Distinct for Report and PPT)
      setStatus('generating_images');
      const sectionsWithImages = await Promise.all(
        data.sections.map(async (section) => {
          const [reportUrl, presentationUrl] = await Promise.all([
            generateSectionImage(section.reportImagePrompt),
            generateSectionImage(section.presentationImagePrompt)
          ]);
          return { ...section, reportImageUrl: reportUrl, presentationImageUrl: presentationUrl };
        })
      );
      
      const completeData = { ...data, sections: sectionsWithImages };
      setReportData(completeData);
      setProcessTime(Number(((Date.now() - startTime) / 1000).toFixed(1)));
      setStatus('ready');
    } catch (error) {
      console.error("Process error:", error);
      setStatus('error');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans selection:bg-orange-500/30">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Docu<span className="text-orange-500">AI</span> Professional
            </h1>
          </div>
          <div className="text-sm text-slate-400 font-medium">
            Panel de Generación Estratégica
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-none md:grid-rows-12 gap-5 h-auto md:h-[calc(100vh-180px)] min-h-[700px]">
          
          {/* Upload Section */}
          <BentoCard className="md:col-span-4 md:row-span-5 relative group" delay={0.1}>
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <input
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                id="file-upload"
              />
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
                status === 'ready' ? "bg-emerald-500/20 text-emerald-500" : "bg-slate-700 text-slate-400 group-hover:bg-orange-500/10 group-hover:text-orange-500"
              )}>
                {status === 'idle' && <Upload className="w-8 h-8" />}
                {['parsing', 'analyzing', 'generating_images'].includes(status) && <Loader2 className="w-8 h-8 animate-spin" />}
                {status === 'ready' && <CheckCircle2 className="w-8 h-8" />}
                {status === 'error' && <FileText className="w-8 h-8 text-rose-500" />}
              </div>
              <h2 className="text-lg font-semibold mb-2">
                {status === 'ready' ? 'Documento Listo' : 'Subir Documento'}
              </h2>
              <p className="text-sm text-slate-400 max-w-[200px] mb-4">
                {fileName || 'Arrastra tu archivo Word (.docx) aquí para comenzar el análisis.'}
              </p>
              {status === 'ready' && (
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
                  Completado
                </span>
              )}
            </div>
          </BentoCard>

          {/* Analysis Status */}
          <BentoCard className="md:col-span-8 md:row-span-3" delay={0.2}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 bg-slate-700 rounded text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Estado del Análisis
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {status === 'idle' ? 'Esperando archivo...' : status === 'ready' ? 'Estructura Detectada' : 'Procesando contenido...'}
              </h3>
              
              {reportData ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reportData.sections.map((s, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-slate-700/50 rounded-lg text-slate-300 border border-slate-600/50">
                      {s.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  La IA detectará automáticamente títulos, párrafos, tablas y secciones clave.
                </p>
              )}

              <div className="mt-auto pt-4">
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full bg-orange-500 transition-all duration-1000",
                      status === 'idle' && "w-0",
                      status === 'parsing' && "w-1/4",
                      status === 'analyzing' && "w-1/2",
                      status === 'generating_images' && "w-3/4",
                      status === 'ready' && "w-full"
                    )}
                  />
                </div>
                {status !== 'idle' && (
                  <p className="text-[10px] mt-2 text-orange-500 font-medium uppercase tracking-widest animate-pulse">
                    {status === 'parsing' && 'Leyendo archivo Word...'}
                    {status === 'analyzing' && 'Extrayendo ideas clave con IA...'}
                    {status === 'generating_images' && 'Creando imágenes personalizadas...'}
                    {status === 'ready' && 'Análisis finalizado con éxito'}
                  </p>
                )}
              </div>
            </div>
          </BentoCard>

          {/* Info Card - Keywords */}
          <BentoCard className="md:col-span-8 md:row-span-2 flex-row items-center gap-8" delay={0.3}>
            <div className="flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Search className="w-3 h-3" /> Palabras Clave
              </span>
              <div className="flex flex-wrap gap-2">
                {reportData?.keywords.map((kw, i) => (
                  <span key={i} className="text-sm font-medium text-slate-200">
                    {kw}{i < reportData.keywords.length - 1 ? ',' : ''}
                  </span>
                )) || <span className="text-sm text-slate-600">---</span>}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-700 hidden sm:block" />
            <div className="flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <ImageIcon className="w-3 h-3" /> Visuales
              </span>
              <div className="text-lg font-semibold">
                {reportData?.sections.length || 0} <span className="text-sm font-normal text-slate-400">Gen.</span>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-700 hidden sm:block" />
            <div className="flex-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Clock className="w-3 h-3" /> Rendimiento
              </span>
              <div className="text-lg font-semibold">
                {processTime || '0.0'} <span className="text-sm font-normal text-slate-400">Seg.</span>
              </div>
            </div>
          </BentoCard>

          {/* PDF Preview Cell */}
          <BentoCard className="md:col-span-4 md:row-span-7 bg-slate-50 text-slate-900 border-none shadow-xl" delay={0.4}>
            <div className="flex flex-col h-full">
              <span className="self-start px-2 py-0.5 bg-slate-200 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-3">
                Informe PDF
              </span>
              <h3 className="text-xl font-bold mb-2">Diseño Ejecutivo</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Maquetación automática con tipografía Inter, cajas de impacto y gráficos sectoriales integrados.
              </p>
              
              <div className="flex-1 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center p-4 relative overflow-hidden">
                {reportData ? (
                  <div className="text-center">
                    <div className="w-12 h-1 bg-slate-400 mx-auto mb-2 rounded" />
                    <div className="w-16 h-1 bg-slate-400 mx-auto mb-4 rounded" />
                    <div className="text-[10px] font-bold text-slate-700 uppercase">{reportData.title}</div>
                    <div className="text-[8px] text-slate-500 mt-1">REPORTE ANUAL 2026</div>
                  </div>
                ) : (
                  <FileText className="w-12 h-12 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-200/50 to-transparent" />
              </div>

              <button 
                disabled={status !== 'ready'}
                onClick={() => reportData && generatePDF(reportData)}
                className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </div>
          </BentoCard>

          {/* PPT Preview Cell */}
          <BentoCard className="md:col-span-4 md:row-span-7" delay={0.5}>
            <div className="flex flex-col h-full">
              <span className="self-start px-2 py-0.5 bg-slate-700 rounded text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Presentación PPTX
              </span>
              <h3 className="text-xl font-bold mb-2">Elegancia Visual</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Diapositivas de alto impacto visual con imágenes generadas por IA que ilustran cada concepto.
              </p>

              <div className="flex-1 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {reportData?.sections[0]?.imageUrl ? (
                  <img src={reportData.sections[0].imageUrl} alt="AI Preview" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <Presentation className="w-12 h-12 text-slate-700" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-700">
                     <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest italic">Imagen AI</span>
                   </div>
                </div>
              </div>

              <button 
                disabled={status !== 'ready'}
                onClick={() => reportData && generatePPT(reportData)}
                className="mt-6 w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" /> Descargar PPT
              </button>
            </div>
          </BentoCard>

          {/* Final Call to Action / Info */}
          <BentoCard className="md:col-span-4 md:row-span-4 text-center justify-center items-center" delay={0.6}>
            <h4 className="text-sm font-semibold mb-2">Resultados Estratégicos</h4>
            <div className="text-xs text-slate-400 max-w-[200px] mb-4">
              Los archivos se guardarán directamente en su ordenador para uso inmediato.
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                 <Sparkles className="w-4 h-4 text-orange-500" />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </BentoCard>

        </div>
      </div>
      
      {/* Error handling component (simple) */}
      {status === 'error' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="font-bold">Error en el proceso.</span>
          <button onClick={() => setStatus('idle')} className="text-xs underline font-medium">Reintentar</button>
        </div>
      )}
    </div>
  );
}
