import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useAdminI18n();

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
      setError(body.message || t('login.error'));
      return;
    }

    setUser(body.admin);
    navigate('/admin/dashboard', { replace: true });
  }

  return (
    <div className="page page-center auth-page">
      <section className="login-shell card">
        <div className="login-intro">
          <img src="/icons/logo1.png" alt="GorPliaj" className="login-logo" />
          <span className="eyebrow">{t('login.eyebrow')}</span>
          <h1>{t('login.title')}</h1>
          <p className="muted">{t('login.description')}</p>
          <div className="hero-stat-grid mini">
            <article className="hero-stat-card">
              <strong>24/7</strong>
              <span className="muted">{t('login.access')}</span>
            </article>
            <article className="hero-stat-card">
              <strong>01</strong>
              <span className="muted">{t('login.admin')}</span>
            </article>
          </div>
        </div>

        <form className="login-card form-stack" onSubmit={onSubmit}>
          <label>
            {t('login.email')}
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            {t('login.password')}
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </section>
    </div>
  );
}
