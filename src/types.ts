export interface ReportSection {
  title: string;
  content: string;
  keyPoints: string[];
  imagePrompt: string;
  imageUrl?: string;
}

export interface ReportData {
  title: string;
  subtitle: string;
  author: string;
  date: string;
  summary: string;
  sections: ReportSection[];
  keywords: string[];
}

export type ProcessStatus = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'generating_images' | 'ready' | 'error';
