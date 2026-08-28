import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { if (import.meta.env.DEV) console.error('Industrial Asset Graph UI error', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main role="alert" aria-live="assertive" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f5f7fa', color: '#122033' }}><section style={{ maxWidth: 560, padding: 24, border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff' }}><p style={{ margin: '0 0 8px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>Industrial Asset Graph</p><h1 style={{ margin: '0 0 12px', fontSize: 24 }}>This workspace needs to be reloaded</h1><p style={{ margin: '0 0 18px', lineHeight: 1.5 }}>The workspace hit an unexpected display error. Your locally saved plant data is kept in the browser.</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button type="button" onClick={() => this.setState({ error: null })}>Try again</button><button type="button" onClick={() => window.location.reload()}>Reload workspace</button></div></section></main>;
  }
}
