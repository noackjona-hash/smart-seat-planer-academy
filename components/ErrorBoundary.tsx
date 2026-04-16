"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-8 text-center bg-red-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 border border-red-100">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Oops, es gab ein Problem</h2>
            <p className="text-sm text-gray-700 mb-4 bg-gray-100 p-4 rounded text-left overflow-auto font-mono">
              {this.state.errorMessage}
            </p>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              onClick={() => this.setState({ hasError: false })}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
