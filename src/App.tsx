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
  const [generateMode, setGenerateMode] = useState<'both' | 'pdf' | 'pptx'>('both');

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
      
      // 3. Image Generation (Distinct for Report and PPT, conditional on mode)
      setStatus('generating_images');
      const sectionsWithImages = await Promise.all(
        data.sections.map(async (section) => {
          let reportUrl = '';
          let presentationUrl = '';

          const promises = [];
          if (generateMode === 'both' || generateMode === 'pdf') {
            promises.push(
              generateSectionImage(section.reportImagePrompt).then((url) => {
                reportUrl = url || '';
              })
            );
          }
          if (generateMode === 'both' || generateMode === 'pptx') {
            promises.push(
              generateSectionImage(section.presentationImagePrompt).then((url) => {
                presentationUrl = url || '';
              })
            );
          }

          await Promise.all(promises);

          return { 
            ...section, 
            reportImageUrl: reportUrl, 
            presentationImageUrl: presentationUrl 
          };
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
  }, [generateMode]);

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
            <div className="flex flex-col h-full justify-between py-2">
              {/* Upload Zone */}
              <div className="relative rounded-2xl border-2 border-dashed border-slate-700 hover:border-orange-500/50 transition-all duration-300 p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[180px] group/upload bg-slate-800/20 hover:bg-slate-800/40">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  id="file-upload"
                  disabled={status !== 'idle' && status !== 'error' && status !== 'ready'}
                />
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
                  status === 'ready' ? "bg-emerald-500/20 text-emerald-500" : "bg-slate-700 text-slate-400 group-hover/upload:bg-orange-500/15 group-hover/upload:text-orange-400"
                )}>
                  {status === 'idle' && <Upload className="w-5 h-5 animate-pulse" />}
                  {['parsing', 'analyzing', 'generating_images'].includes(status) && <Loader2 className="w-5 h-5 animate-spin" />}
                  {status === 'ready' && <CheckCircle2 className="w-5 h-5 shadow-emerald-500/10" />}
                  {status === 'error' && <FileText className="w-5 h-5 text-rose-500" />}
                </div>
                <h2 className="text-sm font-bold text-slate-200 mb-1">
                  {status === 'ready' ? 'Word Procesado Correctamente' : 'Subir Documento .docx'}
                </h2>
                <p className="text-[11px] text-slate-400 max-w-[210px] leading-relaxed">
                  {fileName || 'Arrastra tu archivo aquí o haz clic para explorar.'}
                </p>
                {status === 'ready' && (
                  <span className="mt-3 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/30">
                    Sincronizado
                  </span>
                )}
              </div>

              {/* Selection Mode Control */}
              <div className="mt-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                  Formatos de Salida
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setGenerateMode('both')}
                    disabled={status === 'parsing' || status === 'analyzing' || status === 'generating_images'}
                    className={cn(
                      "py-2 px-1 text-[11px] font-bold rounded-lg transition-all duration-300 border",
                      generateMode === 'both' 
                        ? "bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/15" 
                        : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900"
                    )}
                  >
                    Ambos
                  </button>
                  <button
                    onClick={() => setGenerateMode('pdf')}
                    disabled={status === 'parsing' || status === 'analyzing' || status === 'generating_images'}
                    className={cn(
                      "py-2 px-1 text-[11px] font-bold rounded-lg transition-all duration-300 border",
                      generateMode === 'pdf' 
                        ? "bg-slate-800 text-slate-100 border-slate-700 shadow-md" 
                        : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900"
                    )}
                  >
                    Solo PDF
                  </button>
                  <button
                    onClick={() => setGenerateMode('pptx')}
                    disabled={status === 'parsing' || status === 'analyzing' || status === 'generating_images'}
                    className={cn(
                      "py-2 px-1 text-[11px] font-bold rounded-lg transition-all duration-300 border",
                      generateMode === 'pptx' 
                        ? "bg-slate-800 text-slate-100 border-slate-700 shadow-md" 
                        : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900"
                    )}
                  >
                    Solo PPT
                  </button>
                </div>
              </div>
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
          <BentoCard 
            className={cn(
              "md:col-span-4 md:row-span-7 transition-all duration-300 relative",
              generateMode === 'pptx' 
                ? "bg-slate-955 text-slate-500 border border-slate-800/80" 
                : "bg-slate-50 text-slate-900 border-none shadow-xl"
            )} 
            delay={0.4}
          >
            {generateMode === 'pptx' ? (
              <div 
                onClick={() => setGenerateMode('both')}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-20 flex flex-col items-center justify-center cursor-pointer p-4 rounded-3xl border border-dashed border-slate-800 hover:border-orange-500/30 transition-all duration-300 group/pdf-overlay text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center mb-3 group-hover/pdf-overlay:bg-orange-500/10 transition-colors">
                  <FileText className="w-5 h-5 text-slate-500 group-hover/pdf-overlay:text-orange-400 transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover/pdf-overlay:text-orange-400 transition-colors">PDF Desactivado</span>
                <span className="text-[10px] text-slate-600 mt-1">Haz clic para activar y generar</span>
              </div>
            ) : null}
            <div className="flex flex-col h-full">
              <span className={cn(
                "self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3",
                generateMode === 'pptx' ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-600"
              )}>
                Informe PDF
              </span>
              <h3 className="text-xl font-bold mb-2">Diseño Ejecutivo</h3>
              <p className={cn(
                "text-xs leading-relaxed mb-6",
                generateMode === 'pptx' ? "text-slate-600" : "text-slate-500"
              )}>
                Maquetación automática con tipografía Inter, cajas de impacto y gráficos sectoriales integrados.
              </p>
              
              <div className={cn(
                "flex-1 rounded-xl flex items-center justify-center p-4 relative overflow-hidden transition-all duration-300",
                generateMode === 'pptx' ? "bg-slate-950 border border-slate-900" : "bg-slate-200 border border-slate-300"
              )}>
                {reportData ? (
                  <>
                    {reportData.sections[0]?.reportImageUrl && (
                      <div className="absolute inset-0 z-0">
                        <img 
                          referrerPolicy="no-referrer"
                          src={reportData.sections[0].reportImageUrl} 
                          alt="PDF Preview Background" 
                          className="w-full h-full object-cover opacity-20" 
                        />
                      </div>
                    )}
                    <div className="text-center z-10 relative">
                      <div className="w-12 h-1 bg-slate-400 mx-auto mb-2 rounded" />
                      <div className="w-16 h-1 bg-slate-400 mx-auto mb-4 rounded" />
                      <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{reportData.title}</div>
                      <div className="text-[8px] text-slate-500 mt-1 font-semibold">{reportData.theme?.aesthetic.toUpperCase()} REPORT</div>
                    </div>
                  </>
                ) : (
                  <FileText className="w-12 h-12 text-slate-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-200/40 to-transparent pointer-events-none" />
              </div>

              <button 
                disabled={status !== 'ready' || generateMode === 'pptx'}
                onClick={() => reportData && generatePDF(reportData)}
                className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg shadow-black/10"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </div>
          </BentoCard>

          {/* PPT Preview Cell */}
          <BentoCard 
            className={cn(
              "md:col-span-4 md:row-span-7 transition-all duration-300 relative",
              generateMode === 'pdf' 
                ? "bg-slate-955 text-slate-500 border border-slate-800/80" 
                : ""
            )} 
            delay={0.5}
          >
            {generateMode === 'pdf' ? (
              <div 
                onClick={() => setGenerateMode('both')}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-20 flex flex-col items-center justify-center cursor-pointer p-4 rounded-3xl border border-dashed border-slate-800 hover:border-orange-500/30 transition-all duration-300 group/ppt-overlay text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-900/80 flex items-center justify-center mb-3 group-hover/ppt-overlay:bg-orange-500/10 transition-colors">
                  <Presentation className="w-5 h-5 text-slate-500 group-hover/ppt-overlay:text-orange-400 transition-colors" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover/ppt-overlay:text-orange-400 transition-colors">Presentación Desactivada</span>
                <span className="text-[10px] text-slate-600 mt-1">Haz clic para activar y generar</span>
              </div>
            ) : null}
            <div className="flex flex-col h-full">
              <span className={cn(
                "self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3",
                generateMode === 'pdf' ? "bg-slate-800 text-slate-600 animate-none" : "bg-slate-700 text-slate-400"
              )}>
                Presentación PPTX
              </span>
              <h3 className="text-xl font-bold mb-2">Elegancia Visual</h3>
              <p className={cn(
                "text-xs leading-relaxed mb-6",
                generateMode === 'pdf' ? "text-slate-600" : "text-slate-400"
              )}>
                Diapositivas de alto impacto visual con imágenes generadas por IA que ilustran cada concepto.
              </p>

              <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {reportData?.sections[0]?.presentationImageUrl ? (
                  <img 
                    referrerPolicy="no-referrer"
                    src={reportData.sections[0].presentationImageUrl} 
                    alt="AI PPT Preview" 
                    className="w-full h-full object-cover opacity-60 rounded-lg" 
                  />
                ) : (
                  <Presentation className="w-12 h-12 text-slate-700" />
                )}
                {reportData?.sections[0]?.presentationImageUrl && (
                  <div className="absolute inset-x-0 bottom-4 flex items-center justify-center">
                    <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg">
                      <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest italic flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-spin duration-3000" /> Diapositiva 2 Preview
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button 
                disabled={status !== 'ready' || generateMode === 'pdf'}
                onClick={() => reportData && generatePPT(reportData)}
                className="mt-6 w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg shadow-orange-500/10"
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
