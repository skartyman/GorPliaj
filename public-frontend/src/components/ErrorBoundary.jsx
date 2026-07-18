import { Component } from 'react';
import { captureException } from '../lib/analytics';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Щось пішло не так</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Сталася помилка при завантаженні сторінки.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
            }}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              background: '#007bff',
              color: '#fff',
              marginBottom: '0.75rem'
            }}
          >
            Спробувати знову
          </button>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              border: '1px solid #ccc',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              background: '#fff',
              color: '#333'
            }}
          >
            На головну
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
