import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/admin/auth/me').then(({ response }) => {
      if (response.ok) {
        navigate('/admin/dashboard', { replace: true });
      }
    });
  }, [navigate]);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || '')
    };

    const { response, body } = await apiRequest('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      setError(body.message || 'Login failed.');
      return;
    }

    navigate('/admin/dashboard', { replace: true });
  }

  return (
    <div className="page page-center auth-page">
      <section className="login-shell card">
        <div className="login-intro">
          <span className="eyebrow">Admin access</span>
          <h1>GorPliaj control room</h1>
          <p className="muted">A mobile-first sign-in screen for reservation, map, and content operations.</p>
          <div className="hero-stat-grid mini">
            <article className="hero-stat-card">
              <strong>24/7</strong>
              <span className="muted">Access</span>
            </article>
            <article className="hero-stat-card">
              <strong>01</strong>
              <span className="muted">Unified admin</span>
            </article>
          </div>
        </div>

        <form className="login-card form-stack" onSubmit={onSubmit}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  );
}
