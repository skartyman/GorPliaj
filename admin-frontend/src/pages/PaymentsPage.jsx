import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

export default function PaymentsPage() {
  const { t, language } = useAdminI18n();

  const STATUS_ACTIONS = useMemo(() => ({
    PENDING: [
      { label: t('payments.statuses.PAID'), status: 'PAID', className: 'btn btn-small btn-success' },
      { label: t('payments.statuses.CANCELLED'), status: 'CANCELLED', className: 'btn btn-small btn-danger' }
    ],
    REQUIRES_ACTION: [
      { label: t('payments.statuses.PAID'), status: 'PAID', className: 'btn btn-small btn-success' },
      { label: t('payments.statuses.FAILED'), status: 'FAILED', className: 'btn btn-small btn-danger' }
    ],
    PAID: [
      { label: t('payments.statuses.REFUNDED'), status: 'REFUNDED', className: 'btn btn-small btn-warning' }
    ]
  }), [t]);

  const [state, setState] = useState({ loading: true, error: '', payments: [], config: null });
  const [actionLoadingId, setActionLoadingId] = useState('');

  async function loadAll() {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [paymentsRes, configRes] = await Promise.all([
        apiRequest('/api/admin/payments'),
        apiRequest('/api/admin/payments/config')
      ]);

      const newState = { loading: false, error: '' };

      if (!paymentsRes.response.ok) {
        newState.error = paymentsRes.body.message || t('payments.errors.load');
        newState.payments = [];
      } else {
        newState.payments = Array.isArray(paymentsRes.body) ? paymentsRes.body : [];
      }

      newState.config = configRes.response.ok ? (configRes.body || null) : null;
      setState((current) => ({ ...current, ...newState }));
    } catch {
      setState((current) => ({ ...current, loading: false, error: t('payments.errors.load'), payments: [] }));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const total = state.payments.length;
    const paid = state.payments.filter((p) => p.status === 'PAID').length;
    const pending = state.payments.filter((p) => ['PENDING', 'REQUIRES_ACTION'].includes(p.status)).length;
    const failed = state.payments.filter((p) => ['FAILED', 'CANCELLED', 'REFUNDED'].includes(p.status)).length;
    const totalAmount = state.payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { total, paid, pending, failed, totalAmount };
  }, [state.payments]);

  async function onStatusUpdate(id, status) {
    setActionLoadingId(id);
    const { response, body } = await apiRequest(`/api/admin/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    setActionLoadingId('');

    if (!response.ok) {
      setState((current) => ({ ...current, error: body.message || t('payments.errors.update') }));
      return;
    }

    setState((current) => ({
      ...current,
      error: '',
      payments: current.payments.map((p) => (p.id === id ? { ...p, status: body.payment?.status || status } : p))
    }));
  }

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');

  const columns = [
    {
      key: 'id',
      label: t('payments.columns.id'),
      render: (row) => <strong>#{row.id}</strong>
    },
    {
      key: 'type',
      label: t('payments.columns.type'),
      render: (row) => {
        if (row.reservation) {
          return <span className="payment-type-badge reservation">🪑 {t('payments.type.reservation')}</span>;
        }
        if (row.ticketOrder) {
          return <span className="payment-type-badge ticket">🎫 {t('payments.type.ticket')}</span>;
        }
        return <span className="muted">—</span>;
      }
    },
    {
      key: 'target',
      label: t('payments.columns.target'),
      render: (row) => {
        if (row.reservation) {
          return (
            <div>
              <Link to={`/admin/reservations/${row.reservation.id}`}>
                #{row.reservation.id} {row.reservation.customerName || ''}
              </Link>
              <div className="muted small">
                {formatDateTime(row.reservation.reservationDate, dateLocale)}
              </div>
            </div>
          );
        }
        if (row.ticketOrder) {
          const eventTitle = row.ticketOrder.event?.title
            ? localizeField(row.ticketOrder.event.title, language)
            : '';
          return (
            <div>
              <div>{row.ticketOrder.customerName || row.ticketOrder.customerEmail}</div>
              {row.ticketOrder.event && (
                <div className="muted small">
                  🎪 {eventTitle}
                </div>
              )}
            </div>
          );
        }
        return <span className="muted">—</span>;
      }
    },
    {
      key: 'amount',
      label: t('payments.columns.amount'),
      render: (row) => `${Number(row.amount).toFixed(2)} ${row.currency || 'UAH'}`
    },
    {
      key: 'status',
      label: t('payments.columns.status'),
      render: (row) => <StatusPill status={row.status} />
    },
    {
      key: 'provider',
      label: t('payments.columns.provider'),
      render: (row) => row.provider || '—'
    },
    {
      key: 'date',
      label: t('payments.columns.date'),
      render: (row) => formatDateTime(row.createdAt, dateLocale)
    },
    {
      key: 'actions',
      label: t('payments.columns.actions'),
      render: (row) => {
        const actions = STATUS_ACTIONS[row.status] || [];
        if (!actions.length) return <span className="muted">—</span>;
        return (
          <div className="actions compact">
            {actions.map((action) => (
              <button
                key={`${row.id}-${action.status}`}
                type="button"
                className={action.className}
                disabled={actionLoadingId === row.id}
                onClick={() => onStatusUpdate(row.id, action.status)}
              >
                {actionLoadingId === row.id ? t('common.loading') : action.label}
              </button>
            ))}
          </div>
        );
      }
    }
  ];

  return (
    <AdminLayout>
      <PageContainer title={t('payments.title')} description={t('payments.description')}>
        {!state.config?.configured ? (
          <div className="form-state" style={{ marginBottom: 14 }}>
            {t('payments.notConfigured')}
          </div>
        ) : null}

        <section className="page-hero compact">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('payments.eyebrow')}</span>
            <h3>{t('payments.heroTitle')}</h3>
            <p className="muted">{t('payments.heroDescription')}</p>
          </div>
          <div className="hero-stat-grid mini">
            <article className="hero-stat-card">
              <strong>{state.loading ? '—' : stats.total}</strong>
              <span className="muted">{t('payments.summary.total')}</span>
            </article>
            <article className="hero-stat-card accent">
              <strong>{state.loading ? '—' : stats.paid}</strong>
              <span className="muted">{t('payments.summary.paid')}</span>
            </article>
            <article className="hero-stat-card">
              <strong>{state.loading ? '—' : stats.pending}</strong>
              <span className="muted">{t('payments.summary.pending')}</span>
            </article>
            <article className="hero-stat-card">
              <strong>{state.loading ? '—' : `${stats.totalAmount.toFixed(0)} ${'UAH'}`}</strong>
              <span className="muted">{t('payments.summary.amount')}</span>
            </article>
          </div>
        </section>

        {state.loading ? <p>{t('payments.loading')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error ? (
          <DataTable columns={columns} rows={state.payments} emptyText={t('payments.empty')} />
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
