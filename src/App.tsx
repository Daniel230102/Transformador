import React, { useState, useCallback, useEffect } from 'react';
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
  Search,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Palette,
  AlertCircle
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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeSectionIdx, setActiveSectionIdx] = useState<number>(0);
  const [previewTab, setPreviewTab] = useState<'report' | 'slide'>('report');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Keep a running clock for executive aesthetic
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const processFile = useCallback(async (file: File) => {
    const startTime = Date.now();
    setFileName(file.name);
    setStatus('parsing');
    setActiveSectionIdx(0);

    try {
      // 1. Parsing the raw Word document
      const text = await parseWordFile(file);
      
      // 2. High-speed McKinsey style AI content synthesis
      setStatus('analyzing');
      const data = await analyzeWordContent(text);
      
      // 3. Image Generation with automatic Base64 client-processing and rate-limit safety
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
      console.error("Direct process error:", error);
      setStatus('error');
    }
  }, [generateMode]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  // Drag and Drop functional event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (status === 'idle' || status === 'error' || status === 'ready') {
      setIsDragging(true);
    }
  }, [status]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (status === 'parsing' || status === 'analyzing' || status === 'generating_images') return;
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      await processFile(file);
    }
  }, [status, processFile]);

  const activeSection = reportData?.sections[activeSectionIdx];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 font-sans selection:bg-orange-500/30 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Modern Glassmorphic Executive Header */}
        <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="text-white w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Docu<span className="text-orange-500 font-extrabold font-mono">AI</span> Executive
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[9px] font-bold tracking-widest uppercase border border-orange-500/20">
                  v2.5 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Conversor Instruccional de Alta Velocidad (Groq & LLaMA Enabled)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Hora Local Sistema</div>
              <div className="text-sm font-semibold font-mono text-orange-400 flex items-center gap-1.5 justify-end">
                <Clock className="w-3.5 h-3.5" /> {currentTime || '--:--:--'}
              </div>
            </div>
            {status === 'ready' && (
              <button 
                onClick={() => {
                  setStatus('idle');
                  setReportData(null);
                  setFileName('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Cargar Nuevo
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel / Control center */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Interactive File Drop and Setup Module */}
            <BentoCard className={cn(
                  "relative group overflow-hidden transition-all duration-300",
                  isDragging ? "border-orange-500 bg-slate-800/60 shadow-lg shadow-orange-500/5 ring-2 ring-orange-500/20" : "bg-slate-900/60",
                  status !== 'idle' && status !== 'error' && "pointer-events-none opacity-90"
                )}
                delay={0.1}
            >
              <div 
                className="h-full flex flex-col justify-between"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Panel de Entrada
                  </span>
                  {status === 'ready' && (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Sincronizado
                    </span>
                  )}
                </div>

                {/* Main Droppable Canvas */}
                <div className={cn(
                  "relative rounded-xl border-2 border-dashed border-slate-800 transition-all duration-300 p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] bg-slate-950/40 hover:bg-slate-950/60",
                  isDragging && "border-orange-500 bg-orange-500/5 scale-[0.99]",
                  status === 'ready' && "border-emerald-500/20 bg-emerald-500/5"
                )}>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={status !== 'idle' && status !== 'error' && status !== 'ready'}
                    id="docx_uploader"
                  />
                  
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 shadow-inner",
                    status === 'ready' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                    isDragging ? "bg-orange-500/15 text-orange-400 border border-orange-500/30 scale-110" : 
                    "bg-slate-900 text-slate-400 border border-slate-800 group-hover:border-orange-500/30 group-hover:text-orange-400"
                  )}>
                    {status === 'idle' && <Upload className="w-6 h-6 animate-pulse" />}
                    {['parsing', 'analyzing', 'generating_images'].includes(status) && <Loader2 className="w-6 h-6 animate-spin text-orange-500" />}
                    {status === 'ready' && <CheckCircle2 className="w-6 h-6" />}
                    {status === 'error' && <AlertCircle className="w-6 h-6 text-rose-500" />}
                  </div>

                  <h3 className="text-sm font-bold text-slate-200">
                    {status === 'ready' ? 'Documento Listo' : 
                     isDragging ? '¡Sueltalo ahora!' : 'Subir Archivo .docx'}
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 mt-2 max-w-[240px] leading-relaxed">
                    {fileName ? (
                      <span className="font-mono text-slate-300 break-all">{fileName}</span>
                    ) : (
                      'Arrastra tu documento de Word aquí, o haz clic para explorar tus archivos locales.'
                    )}
                  </p>

                  {status === 'parsing' && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4">
                      <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                      <span className="text-xs font-bold text-slate-200">Parseando Documento...</span>
                      <span className="text-[10px] text-slate-500 mt-1">Extrayendo texto de origen DOCX</span>
                    </div>
                  )}
                </div>

                {/* Formats setup */}
                <div className="mt-5 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    Modo Redacción e Ilustración
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setGenerateMode('both')}
                      disabled={['parsing', 'analyzing', 'generating_images'].includes(status)}
                      className={cn(
                        "py-2 px-1 text-[11px] font-bold rounded-lg transition-all duration-300 border",
                        generateMode === 'both' 
                          ? "bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/15" 
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                      )}
                    >
                      Completo
                    </button>
                    <button
                      onClick={() => setGenerateMode('pdf')}
                      disabled={['parsing', 'analyzing', 'generating_images'].includes(status)}
                      className={cn(
                        "py-2 px-1 text-[11px] font-bold rounded-lg transition-all duration-300 border",
                        generateMode === 'pdf' 
                          ? "bg-slate-800 text-slate-100 border-slate-700 shadow-md" 
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                      )}
                    >
                      Solo PDF
                    </button>
                    <button
                      onClick={() => setGenerateMode('pptx')}
                      disabled={['parsing', 'analyzing', 'generating_images'].includes(status)}
                      className={cn(
                        "py-2 px-1 text-[11px] font-bold rounded-lg transition-all duration-300 border",
                        generateMode === 'pptx' 
                          ? "bg-slate-800 text-slate-100 border-slate-700 shadow-md" 
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                      )}
                    >
                      Solo PPTX
                    </button>
                  </div>
                </div>
              </div>
            </BentoCard>

            {/* Analysis Steps Track Card */}
            {status !== 'idle' && (
              <BentoCard className="bg-slate-900/60 p-5 space-y-4" delay={0.2}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Progreso Operativo</span>
                  <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500",
                        status === 'parsing' && "w-1/4",
                        status === 'analyzing' && "w-1/2",
                        status === 'generating_images' && "w-3/4",
                        status === 'ready' && "w-full"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        ['analyzing', 'generating_images', 'ready'].includes(status) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                        status === 'parsing' ? "bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse" : "bg-slate-850 border-slate-800 text-slate-600"
                      )}>
                        {['analyzing', 'generating_images', 'ready'].includes(status) ? "✓" : "1"}
                      </span>
                      Lectura y Extracción Textual
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Mammoth Parser</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        ['generating_images', 'ready'].includes(status) ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                        status === 'analyzing' ? "bg-orange-500/10 border-orange-500/30 text-orange-400 scale-105" : "bg-slate-850 border-slate-800 text-slate-600"
                      )}>
                        {['generating_images', 'ready'].includes(status) ? "✓" : "2"}
                      </span>
                      Análisis McKinsey LLaMA Multi-Model
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">CONVERSOR_API_KEY</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        status === 'ready' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                        status === 'generating_images' ? "bg-orange-500/10 border-orange-500/30 text-orange-400 scale-105" : "bg-slate-850 border-slate-800 text-slate-600"
                      )}>
                        {status === 'ready' ? "✓" : "3"}
                      </span>
                      Generación Fotográfica Ilustrada
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Rate-Limit Safe</span>
                  </div>
                </div>
              </BentoCard>
            )}

            {/* Document Analytical Monospace Metadata */}
            <BentoCard className="bg-slate-900/60 p-5 space-y-4" delay={0.3}>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3 text-orange-400" /> Rendimiento de Redacción
              </span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                  <div className="text-[9px] uppercase font-bold text-slate-500">Capítulos Creados</div>
                  <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                    {reportData?.sections.length || '00'}
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850">
                  <div className="text-[9px] uppercase font-bold text-slate-500">Tiempo de Espera</div>
                  <div className="text-xl font-bold font-mono text-orange-400 mt-1">
                    {processTime ? `${processTime}s` : '0.0s'}
                  </div>
                </div>
              </div>

              {reportData && (
                <div className="space-y-2">
                  <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-orange-400" /> Paleta de Color Corporativa
                  </div>
                  <div className="flex items-center justify-between bg-slate-950/30 p-2.5 rounded-xl border border-slate-900 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ backgroundColor: reportData.theme?.primaryColor + '20', color: reportData.theme?.primaryColor, border: `1px solid ${reportData.theme?.primaryColor}40` }}>{reportData.theme?.aesthetic}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full border border-slate-700 shadow-inner" style={{ backgroundColor: reportData.theme?.primaryColor }} title="Color Primario" />
                      <div className="w-4 h-4 rounded-full border border-slate-700 shadow-inner" style={{ backgroundColor: reportData.theme?.secondaryColor }} title="Color Secundario" />
                      <div className="w-4 h-4 rounded-full border border-slate-700 shadow-inner" style={{ backgroundColor: reportData.theme?.accentColor }} title="Color Destacado" />
                    </div>
                  </div>
                </div>
              )}
            </BentoCard>

            {/* Premium Download Center (Quick Access) */}
            {reportData && (
              <BentoCard className="bg-gradient-to-br from-slate-900 to-slate-950 border-orange-500/20 p-5 space-y-3 shadow-lg shadow-black/30" delay={0.4}>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Descargas Ejecutivas</span>
                <div className="flex flex-col gap-2">
                  <button 
                    disabled={generateMode === 'pptx'}
                    onClick={() => generatePDF(reportData)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 border border-slate-700 hover:border-slate-600"
                  >
                    <Download className="w-4 h-4 text-emerald-400" /> Descargar Informe Corporativo (PDF)
                  </button>

                  <button 
                    disabled={generateMode === 'pdf'}
                    onClick={() => generatePPT(reportData)}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-orange-500/10"
                  >
                    <Presentation className="w-4 h-4" /> Descargar Presentación Ejecutiva (PPTX)
                  </button>
                </div>
              </BentoCard>
            )}

          </div>

          {/* Right panel: Majestic Interactive workspace */}
          <div className="lg:col-span-8">
            
            {reportData ? (
              <div className="space-y-6">
                
                {/* Executive Summary Bar */}
                <BentoCard className="bg-slate-900/40 p-5 space-y-3" delay={0.25}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">{reportData.title}</h2>
                      <p className="text-xs text-orange-400 font-semibold mt-0.5">{reportData.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 md:justify-end">
                      {reportData.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] px-2.5 py-1 bg-slate-950 text-slate-400 rounded-md border border-slate-800 font-mono uppercase tracking-wider">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-slate-800/80 my-2" />
                  <div className="bg-slate-950/20 p-3.5 rounded-xl border border-slate-800/40">
                    <div className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-1">Resumen Ejecutivo de Dirección</div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{reportData.summary}</p>
                  </div>
                </BentoCard>

                {/* Main Interactive Explorer Panel Workspace */}
                <BentoCard className="bg-slate-900/60 p-6 space-y-6" delay={0.3}>
                  
                  {/* Explorer Header - Tab Selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-orange-500" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Visor de Capítulos Analíticos</h3>
                    </div>
                    
                    {/* Visualizer Mode Toggles */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 self-stretch sm:self-auto">
                      <button
                        onClick={() => setPreviewTab('report')}
                        className={cn(
                          "flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200",
                          previewTab === 'report' ? "bg-slate-850 text-slate-100 border border-slate-700" : "text-slate-400 border-transparent hover:text-slate-200"
                        )}
                      >
                        <FileText className="w-3.5 h-3.5" /> Informe Capítulo
                      </button>
                      <button
                        onClick={() => setPreviewTab('slide')}
                        className={cn(
                          "flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200",
                          previewTab === 'slide' ? "bg-slate-850 text-slate-100 border border-slate-700" : "text-slate-400 border-transparent hover:text-slate-200"
                        )}
                      >
                        <Presentation className="w-3.5 h-3.5" /> Diapositiva PPT
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Chapter Quick Navigation Strip */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                    {reportData.sections.map((section, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSectionIdx(idx)}
                        className={cn(
                          "flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-300 flex items-center gap-1.5",
                          idx === activeSectionIdx 
                            ? "bg-orange-500/10 border-orange-500 text-orange-400 font-bold" 
                            : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-950"
                        )}
                      >
                        <span className="text-[10px] opacity-70 font-mono">{String(idx + 1).padStart(2, '0')}.</span>
                        {section.title.length > 20 ? `${section.title.substring(0, 18)}...` : section.title}
                      </button>
                    ))}
                  </div>

                  {/* Visualizer Screens */}
                  {activeSection && (
                    <div className="space-y-6">
                      
                      {/* Active chapter index indicator */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono">Capítulo {activeSectionIdx + 1} de {reportData.sections.length}</span>
                        <span className="italic flex items-center gap-1">
                          Diseño Aplicado: <span className="text-orange-400 font-bold uppercase">{previewTab === 'report' ? 'McKinsey Redacción' : `PPT Slide Template ${activeSectionIdx % 4}`}</span>
                        </span>
                      </div>

                      {previewTab === 'report' ? (
                        /* Editorial Report Layout Mode */
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
                          
                          {/* Left text editorial side */}
                          <div className="md:col-span-7 space-y-4">
                            <h4 className="text-xl font-extrabold text-slate-100 tracking-tight leading-snug">
                              {activeSection.title}
                            </h4>
                            <div className="h-0.5 w-12" style={{ backgroundColor: reportData.theme?.accentColor }} />
                            
                            <p className="text-xs text-slate-300 leading-relaxed text-justify whitespace-pre-wrap font-sans">
                              {activeSection.content}
                            </p>
                          </div>

                          {/* Right visual key insights side */}
                          <div className="md:col-span-5 space-y-4">
                            {/* Rendered Visual (Base64 or Fallback) */}
                            {activeSection.reportImageUrl ? (
                              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-800 shadow-lg group/img">
                                <img
                                  referrerPolicy="no-referrer"
                                  src={activeSection.reportImageUrl} 
                                  alt={activeSection.title}
                                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                                <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-slate-400 border border-slate-800">
                                  Ilustración Técnica
                                </div>
                              </div>
                            ) : (
                              <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-700" />
                              </div>
                            )}

                            {/* Section Highlights Infographic Box */}
                            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
                              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block">Análisis e Indicadores</span>
                              <div className="space-y-2">
                                {activeSection.keyPoints.map((point, pIdx) => (
                                  <div key={pIdx} className="flex gap-2 text-xs">
                                    <span className="text-orange-400 font-extrabold select-none">•</span>
                                    <p className="text-slate-300 leading-relaxed">{point}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                        </div>
                      ) : (
                        /* Presentation Slide Simulator Preview Mode */
                        <div className="animate-fadeIn">
                          <div className="w-full aspect-[16/9] rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col justify-between p-6 md:p-8" 
                               style={{ 
                                 backgroundColor: reportData.theme?.aesthetic === 'minimalist' ? '#ffffff' : '#0f172a',
                                 color: reportData.theme?.aesthetic === 'minimalist' ? '#1e293b' : '#fafafa'
                               }}>
                            {/* Slide Accent line and watermark */}
                            <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: reportData.theme?.accentColor }} />
                            
                            {/* Dynamic Slide Layout Rendering mockups to simulate design templates in fileService.ts */}
                            {(activeSectionIdx % 4 === 0) && (
                              /* Layout 0: Half Image background left, bullet point text right */
                              <div className="grid grid-cols-12 h-full items-center gap-6 mt-2">
                                <div className="col-span-5 h-[80%] rounded-xl overflow-hidden border border-slate-800 relative bg-slate-900">
                                  {activeSection.presentationImageUrl && (
                                    <img 
                                      referrerPolicy="no-referrer"
                                      src={activeSection.presentationImageUrl} 
                                      alt="Slide Visualizer bg" 
                                      className="w-full h-full object-cover" 
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-black/10" />
                                </div>
                                <div className="col-span-7 space-y-3 pl-2">
                                  <h4 className="text-lg font-bold uppercase tracking-tight" style={{ color: reportData.theme?.accentColor }}>{activeSection.title}</h4>
                                  <div className="space-y-2.5">
                                    {activeSection.keyPoints.map((pt, i) => (
                                      <div key={i} className="flex gap-2 text-xs">
                                        <span style={{ color: reportData.theme?.secondaryColor }}>•</span>
                                        <p className="leading-relaxed">{pt}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {(activeSectionIdx % 4 === 1) && (
                              /* Layout 1: Centered heading, large central visual under */
                              <div className="flex flex-col h-full justify-between items-center py-2 mt-2">
                                <h4 className="text-lg font-bold text-center uppercase tracking-normal" style={{ color: reportData.theme?.accentColor }}>
                                  {activeSection.title}
                                </h4>
                                
                                <div className="w-[80%] h-[55%] rounded-xl overflow-hidden border border-slate-800 relative bg-slate-900">
                                  {activeSection.presentationImageUrl && (
                                    <img 
                                      referrerPolicy="no-referrer"
                                      src={activeSection.presentationImageUrl} 
                                      alt="Slide visualizer core" 
                                      className="w-full h-full object-cover" 
                                    />
                                  )}
                                </div>

                                <p className="text-[10px] text-center italic opacity-80 max-w-lg mt-1 font-sans">
                                  {activeSection.keyPoints.join(' | ')}
                                </p>
                              </div>
                            )}

                            {(activeSectionIdx % 4 === 2) && (
                              /* Layout 2: Left heading and subtitle list, full wide bottom visual */
                              <div className="flex flex-col h-full justify-between mt-2">
                                <div className="flex items-start justify-between">
                                  <h4 className="text-lg font-bold uppercase" style={{ color: reportData.theme?.accentColor }}>{activeSection.title}</h4>
                                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">INNOVACIÓN</span>
                                </div>
                                
                                <div className="w-full h-[50%] rounded-xl overflow-hidden border border-slate-850 relative bg-slate-900 my-2">
                                  {activeSection.presentationImageUrl && (
                                    <img 
                                      referrerPolicy="no-referrer"
                                      src={activeSection.presentationImageUrl} 
                                      alt="Slide landscape visual" 
                                      className="w-full h-full object-cover" 
                                    />
                                  )}
                                </div>
                                
                                <p className="text-[10px] opacity-75 truncate">
                                  {activeSection.keyPoints.slice(0, 3).join(' • ')}
                                </p>
                              </div>
                            )}

                            {(activeSectionIdx % 4 === 3) && (
                              /* Layout 3: Text content left, styled border picture card right */
                              <div className="grid grid-cols-12 h-full items-center gap-6 mt-2">
                                <div className="col-span-7 space-y-3 pr-2">
                                  <h4 className="text-lg font-bold uppercase tracking-wide" style={{ color: reportData.theme?.accentColor }}>{activeSection.title}</h4>
                                  <div className="space-y-2">
                                    {activeSection.keyPoints.map((pt, i) => (
                                      <div key={i} className="flex gap-2 text-xs">
                                        <span style={{ color: reportData.theme?.accentColor }}>►</span>
                                        <p className="leading-snug">{pt}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="col-span-5 h-[80%] rounded-xl overflow-hidden relative bg-slate-900 p-1" style={{ border: `2px solid ${reportData.theme?.accentColor}` }}>
                                  {activeSection.presentationImageUrl && (
                                    <img 
                                      referrerPolicy="no-referrer"
                                      src={activeSection.presentationImageUrl} 
                                      alt="Slide bordered conceptual" 
                                      className="w-full h-full object-cover rounded-lg" 
                                    />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Slide footer metadata watermark */}
                            <div className="border-t border-slate-800/20 pt-1 flex items-center justify-between text-[9px] opacity-60 font-sans mt-2">
                              <span>PREVISUALIZACIÓN DE DIAPOSITIVA</span>
                              <span>{reportData.title.toUpperCase()} | PÁGINA {activeSectionIdx + 3}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Chapter Steppers */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                          disabled={activeSectionIdx === 0}
                          onClick={() => setActiveSectionIdx(p => p - 1)}
                          className="px-4 py-2 text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 rounded-xl hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Anterior
                        </button>
                        
                        <div className="flex gap-1.5">
                          {reportData.sections.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setActiveSectionIdx(i)}
                              className={cn(
                                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                i === activeSectionIdx ? "bg-orange-500 scale-125 shadow-md shadow-orange-500/20" : "bg-slate-850 hover:bg-slate-700"
                              )}
                            />
                          ))}
                        </div>

                        <button
                          disabled={activeSectionIdx === reportData.sections.length - 1}
                          onClick={() => setActiveSectionIdx(p => p + 1)}
                          className="px-4 py-2 text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 rounded-xl hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                          Siguiente <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  )}

                </BentoCard>

              </div>
            ) : (
              /* Idle/Onboarding State Layout (Bento structure) */
              <div className="space-y-6">
                
                <BentoCard className="bg-slate-900/40 p-6 md:p-8 flex-col justify-between" delay={0.25}>
                  <div className="max-w-xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-bold uppercase rounded-lg border border-orange-500/20">
                      <Sparkles className="w-4 h-4" /> Inteligencia Instruccional
                    </div>
                    
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight font-sans">
                      Transforma cualquier archivo de Word en Informes Ejecutivos McKinsey y Diapositivas PPTX.
                    </h2>
                    
                    <p className="text-sm text-slate-400 leading-relaxed font-sans">
                      Nuestra tecnología utiliza el motor conversor de alta velocidad Groq para deconstruir el texto, estructurarlo por ejes estratégicos, generar paletas de colores coordinadas y crear ilustraciones profesionales.
                    </p>
                  </div>

                  {/* Flow Steps Infographics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-400">01. Subida Rápida</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Arrastra o selecciona un archivo .docx existente con texto sin formato.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-400">02. Deconstrucción</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">La IA analiza de 6 a 10 secciones y diseña un informe con sumarios ejecutivos.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-400">03. Descarga Directa</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">Guarda tanto el PDF ejecutivo como las diapositivas de PowerPoint generadas.</p>
                    </div>
                  </div>
                </BentoCard>

                {/* Aesthetic Tips banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <BentoCard className="bg-slate-900/60 p-5 space-y-3" delay={0.3}>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-200">Formatos Coordinados</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      El color corporativo primario, secundario y destacado se calcula según la temática implícita de su documento para asegurar máxima coherencia de marca.
                    </p>
                  </BentoCard>

                  <BentoCard className="bg-slate-900/60 p-5 space-y-3" delay={0.35}>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-200">Ilustraciones Integradas</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Si el límite de cuota gratis de la generación de IA de Gemini se completa, la app cambia automáticamente a stock fotográfico de Unsplash de alta definición sin interrumpir sus flujos.
                    </p>
                  </BentoCard>

                </div>

              </div>
            )}

          </div>

        </div>

      </div>
      
      {/* Floating Error Center Modal */}
      {status === 'error' && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className="bg-rose-500 text-white rounded-xl p-4 shadow-xl border border-rose-600/40 max-w-sm flex items-start gap-3">
            <div className="p-1 bg-rose-600/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <h5 className="text-xs font-bold leading-none">Error de Procesamiento</h5>
              <p className="text-[11px] text-rose-100 leading-relaxed">
                No se pudo analizar el documento o generar las imágenes correspondientes. Asegúrate de configurar la clave API correcta en secrets.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setStatus('idle')} className="text-[10px] font-bold underline text-white hover:text-rose-100">
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
