export interface ReportSection {
  title: string;
  content: string;
  keyPoints: string[];
  reportImagePrompt: string;
  presentationImagePrompt: string;
  reportImageUrl?: string;
  presentationImageUrl?: string;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  aesthetic: 'corporate' | 'creative' | 'technical' | 'minimalist' | 'academic';
}

export interface ReportData {
  title: string;
  subtitle: string;
  author: string;
  date: string;
  summary: string;
  sections: ReportSection[];
  keywords: string[];
  theme: ThemeConfig;
}

export type ProcessStatus = 'idle' | 'uploading' | 'parsing' | 'analyzing' | 'generating_images' | 'ready' | 'error';
