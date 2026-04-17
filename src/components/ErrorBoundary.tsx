import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold text-rose-500 mb-4">Algo salió mal</h1>
          <p className="text-slate-400 mb-6 max-w-md">
            Se ha producido un error al cargar la aplicación. Esto puede deberse a la falta de configuración de las claves API.
          </p>
          <pre className="bg-slate-800 p-4 rounded-lg text-xs text-rose-300 overflow-auto max-w-full text-left">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-orange-500 rounded-xl font-bold"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
