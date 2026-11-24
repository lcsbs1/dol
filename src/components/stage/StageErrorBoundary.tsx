"use client";

import { Component, type ReactNode } from "react";

interface StageErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface StageErrorBoundaryState {
  hasError: boolean;
}

export class StageErrorBoundary extends Component<
  StageErrorBoundaryProps,
  StageErrorBoundaryState
> {
  state: StageErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): StageErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
