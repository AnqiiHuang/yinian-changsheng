import { Component, type ReactNode } from 'react';

interface State { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="main stack">
        <h1 className="page-title">这一页没有展开</h1>
        <p className="prose">画面临时中断了。进度如果已经写入，重新打开后还会在。</p>
        <button className="btn primary" onClick={() => window.location.reload()}>重新打开</button>
      </main>
    );
  }
}
