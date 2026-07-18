import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#C89241', '#8B6914', '#5B7B3A', '#8B2500', '#DAA520', '#4A2C1A', '#2C1810'];

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stats-card" style={{ borderLeft: `4px solid ${color || '#C89241'}` }}>
      <div className="stats-label">{label}</div>
      <div className="stats-value">{value}</div>
      {sub ? <div className="stats-sub">{sub}</div> : null}
    </div>
  );
}

function formatMoney(v) {
  if (v == null) return '—';
  return `${Number(v).toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴`;
}

function fmt(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('uk-UA');
}

function pct(v) {
  return v != null ? `${v}%` : '—';
}

function DateRangePicker({ from, to, period, onPeriod, onRange }) {
  const periods = [
    { value: 'today', label: 'Сьогодні' },
    { value: 'yesterday', label: 'Вчора' },
    { value: 'week', label: 'Тиждень' },
    { value: 'month', label: 'Місяць' },
    { value: 'quarter', label: 'Квартал' },
    { value: 'year', label: 'Рік' }
  ];

  function toDateStr(d) {
    return d ? d.substring(0, 10) : '';
  }

  return (
    <div className="report-range-panel">
      <div className="report-range-presets">
        {periods.map(p => (
          <button key={p.value} type="button" className={`btn btn-small ${period === p.value ? 'btn-primary' : ''}`} onClick={() => onPeriod(p.value)}>{p.label}</button>
        ))}
      </div>
      <div className="report.range-custom">
        <input type="date" value={toDateStr(from)} onChange={e => onRange(e.target.value, to)} />
        <span>—</span>
        <input type="date" value={toDateStr(to)} onChange={e => onRange(from, e.target.value)} />
      </div>
    </div>
  );
}

function SendReportButton({ reportType, from, to }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ sending: false, result: '' });

  async function onSend() {
    if (!email) return;
    setState({ sending: true, result: '' });
    const { response, body } = await apiRequest('/api/admin/reports/send', {
      method: 'POST',
      body: JSON.stringify({ reportType, email, from, to })
    });
    if (response.ok && body.sent) {
      setState({ sending: false, result: 'Відправлено' });
      setEmail('');
    } else {
      setState({ sending: false, result: body.message || body.reason || 'Помилка' });
    }
  }

  return (
    <div className="report-send-panel">
      <input type="email" placeholder="Email отримувача" value={email} onChange={e => setEmail(e.target.value)} />
      <button type="button" className="btn btn-primary" onClick={onSend} disabled={state.sending || !email}>
        {state.sending ? 'Відправка...' : 'Відправити'}
      </button>
      {state.result ? <span className={`report-send-result ${state.result === 'Відправлено' ? 'success' : 'error'}`}>{state.result}</span> : null}
    </div>
  );
}

function FinancialTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const rev = data.revenue;
  const c = data.counts;

  const paymentSources = [
    { name: 'Бронювання', value: Number(rev.fromReservations || 0) },
    { name: 'Квитки', value: Number(rev.fromTickets || 0) }
  ].filter(x => x.value > 0);

  const dailyRevenue = data.reservations.map(r => ({
    date: new Date(r.date).toLocaleDateString('uk', { day: '2-digit', month: '2-digit' }),
    amount: r.amount
  }));

  return (
    <div className="report-content">
      <div className="report-note-warning">
        ⚠ Учитываются только подтверждённые оплаты через интернет-эквайринг. Наложные платежи и возвраты исключены из расчёта выручки.
      </div>
      <div className="stats-grid">
        <StatCard label="Підтверджена виручка" value={formatMoney(rev.total)} sub="Тільки онлайн-оплати" color="#C89241" />
        <StatCard label="Від бронювань" value={formatMoney(rev.fromReservations)} sub={`${fmt(c.paidReservations)} оплат`} color="#8B6914" />
        <StatCard label="Від квитків" value={formatMoney(rev.fromTickets)} sub={`${fmt(c.paidTicketOrders)} оплат`} color="#5B7B3A" />
        <StatCard label="Депозити" value={formatMoney(rev.deposits)} color="#DAA520" />
        <StatCard label="Оренда" value={formatMoney(rev.rentals)} color="#4A2C1A" />
        <StatCard label="Повернення" value={formatMoney(rev.refunds)} sub={`${fmt(c.refunds)} оп.`} color="#8B2500" />
      </div>

      <div className="report-charts-row">
        <div className="report-chart-card">
          <h3>Джерела виручки</h3>
          {paymentSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentSources} dataKey="value" nameKey="name" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentSources.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="report-empty">Немає даних</div>}
        </div>

        <div className="report-chart-card">
          <h3>Виручка по днях</h3>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="amount" fill="#C89241" />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="report-empty">Немає даних</div>}
        </div>
      </div>
    </div>
  );
}

function ReservationsTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const s = data.summary;
  const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const dayOfWeekData = Object.entries(data.byDayOfWeek).map(([d, c]) => ({ day: dayNames[d], count: c }));
  const sourceData = Object.entries(data.bySource).map(([name, value]) => ({ name, value }));

  return (
    <div className="report-content">
      <div className="stats-grid">
        <StatCard label="Всього бронювань" value={fmt(s.total)} color="#C89241" />
        <StatCard label="Підтверджених" value={fmt(s.confirmed)} color="#5B7B3A" />
        <StatCard label="Виконаних" value={fmt(s.completed)} color="#8B6914" />
        <StatCard label="Скасовано" value={fmt(s.cancelled)} sub={pct(s.cancelledRate)} color="#8B2500" />
        <StatCard label="Не прийшли" value={fmt(s.noShow)} sub={pct(s.noShowRate)} color="#DAA520" />
        <StatCard label="Повторні клієнти" value={fmt(data.repeatCustomers)} sub={`з ${fmt(data.uniqueCustomers)} унікальних`} color="#4A2C1A" />
        <StatCard label="Середня тривалість" value={data.avgDurationHours ? `${data.avgDurationHours} год` : '—'} color="#C89241" />
      </div>

      <div className="report-charts-row">
        <div className="report-chart-card">
          <h3>За днями тижня</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#5B7B3A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="report-chart-card">
          <h3>Джерела бронювань</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sourceData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="report-empty">Немає даних</div>}
        </div>
      </div>
    </div>
  );
}

function TicketsTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const s = data.summary;
  const eventsData = Object.entries(data.byEvent).map(([name, info]) => ({ name, orders: info.count, revenue: info.revenue }));

  return (
    <div className="report-content">
      <div className="stats-grid">
        <StatCard label="Заказів всього" value={fmt(s.totalOrders)} color="#C89241" />
        <StatCard label="Оплачених" value={fmt(s.paidOrders)} sub={pct(s.conversionRate)} color="#5B7B3A" />
        <StatCard label="Виручка від квитків" value={formatMoney(s.totalRevenue)} color="#8B6914" />
        <StatCard label="Квитків продано" value={fmt(s.totalTickets)} color="#DAA520" />
        <StatCard label="Використано" value={fmt(s.usedTickets)} sub={pct(s.usageRate)} color="#4A2C1A" />
      </div>

      <div className="report-chart-card">
        <h3>Продажі по подіях</h3>
        {eventsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={eventsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => name === 'revenue' ? formatMoney(v) : fmt(v)} />
              <Legend />
              <Bar dataKey="orders" fill="#C89241" name="Замовлень" />
              <Bar dataKey="revenue" fill="#5B7B3A" name="Виручка" />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="report-empty">Немає даних</div>}
      </div>
    </div>
  );
}

function MenuTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const s = data.summary;
  const sectionData = Object.entries(data.bySection).map(([name, value]) => ({ name: name === 'KITCHEN' ? 'Кухня' : 'Бар', value: Number(value) })).filter(x => x.value > 0);

  return (
    <div className="report-content">
      <div className="stats-grid">
        <StatCard label="Позицій в меню" value={fmt(s.totalItems)} color="#C89241" />
        <StatCard label="Замовлень" value={fmt(s.totalOrders)} color="#8B6914" />
        <StatCard label="Виручка" value={formatMoney(s.totalRevenue)} color="#5B7B3A" />
        <StatCard label="Середній чек" value={formatMoney(s.avgCheck)} color="#DAA520" />
      </div>

      <div className="report-charts-row">
        <div className="report-chart-card">
          <h3>Кухня / Бар</h3>
          {sectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sectionData} dataKey="value" nameKey="name" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sectionData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="report-empty">Немає даних</div>}
        </div>
      </div>

      <div className="report-tables-row">
        <div className="report-table-card">
          <h3>Топ за замовленнями</h3>
          <table className="report-data-table">
            <thead><tr><th>Позиція</th><th>Кат.</th><th>Замовл.</th><th>Виручка</th></tr></thead>
            <tbody>
              {data.topByOrders.map(item => (
                <tr key={item.itemId}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{fmt(item.orders)}</td>
                  <td>{formatMoney(item.revenue)}</td>
                </tr>
              ))}
              {data.topByOrders.length === 0 ? <tr><td colSpan={4} className="empty">Немає даних</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="report-table-card">
          <h3>Топ за лайками</h3>
          <table className="report-data-table">
            <thead><tr><th>Позиція</th><th>Кат.</th><th>Лайків</th></tr></thead>
            <tbody>
              {data.topByLikes.map(item => (
                <tr key={item.itemId}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{fmt(item.likesCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EventsTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const s = data.summary;

  return (
    <div className="report-content">
      <div className="stats-grid">
        <StatCard label="Подій в періоді" value={fmt(s.totalEvents)} color="#C89241" />
        <StatCard label="Загальна виручка" value={formatMoney(s.totalRevenue)} color="#5B7B3A" />
        <StatCard label="Бронювань" value={fmt(s.totalReservations)} color="#8B6914" />
        <StatCard label="Квитків продано" value={fmt(s.totalTicketSales)} color="#DAA520" />
      </div>

      <div className="report-table-card">
        <h3>Деталізація по подіях</h3>
        <table className="report-data-table">
          <thead><tr><th>Подія</th><th>Дата</th><th>Броні</th><th>Квитків</th><th>Виручка</th></tr></thead>
          <tbody>
            {data.events.map(event => (
              <tr key={event.eventId}>
                <td>{event.title}</td>
                <td>{new Date(event.startAt).toLocaleDateString('uk')}</td>
                <td>{fmt(event.reservationsCount)}</td>
                <td>{fmt(event.totalTickets)}</td>
                <td>{formatMoney(event.ticketRevenue)}</td>
              </tr>
            ))}
            {data.events.length === 0 ? <tr><td colSpan={5} className="empty">Немає подій у періоді</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const s = data.summary;
  const chartData = data.waiters.map(w => ({ name: w.name, orders: w.orderCount, revenue: Number(w.revenue || 0) }));

  return (
    <div className="report-content">
      <div className="stats-grid">
        <StatCard label="Офіціантів всього" value={fmt(s.totalWaiters)} color="#C89241" />
        <StatCard label="Активних" value={fmt(s.activeWaiters)} color="#5B7B3A" />
        <StatCard label="Замовлень всього" value={fmt(s.totalOrders)} color="#8B6914" />
        <StatCard label="Загальна виручка" value={formatMoney(s.totalRevenue)} color="#DAA520" />
      </div>

      <div className="report-chart-card">
        <h3>Замовлення по офіціантах</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#C89241" name="Замовлень" />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="report-empty">Немає даних</div>}
      </div>

      <div className="report-table-card">
        <table className="report-data-table">
          <thead><tr><th>Офіціант</th><th>Замовлень</th><th>Виручка</th><th>Відповіді</th><th>Сер. час відповіді</th></tr></thead>
          <tbody>
            {data.waiters.map(w => (
              <tr key={w.waiterId}>
                <td>{w.name}</td>
                <td>{fmt(w.orderCount)}</td>
                <td>{formatMoney(w.revenue)}</td>
                <td>{fmt(w.respondedCalls)}</td>
                <td>{w.avgResponseTimeMin != null ? `${w.avgResponseTimeMin} хв` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const kpi = data.kpis;

  return (
    <div className="report-content">
      <div className="report-note-warning">
        ⚠ Виручка враховує тільки підтверджені оплати онлайн-еквайрингу (PAID-статус). Повернення, скасування та готівкові платежі виключені.
      </div>
      <div className="report-section-title">Ключові показники (KPI)</div>
      <div className="stats-grid">
        <StatCard label="Підтверджена виручка" value={formatMoney(kpi.revenue.value)} sub={kpi.revenue.change != null ? `${kpi.revenue.change > 0 ? '▲' : '▼'} ${Math.abs(kpi.revenue.change)}% пр. період` : 'тільки онлайн-оплати'} color="#C89241" />
        <StatCard label="Бронювань" value={fmt(kpi.reservations.value)} color="#8B6914" />
        <StatCard label="Скасування" value={pct(kpi.cancelledRate.value)} color="#8B2500" />
        <StatCard label="Не прийшли" value={pct(kpi.noShowRate.value)} color="#DAA520" />
        <StatCard label="Виручка від квитків" value={formatMoney(kpi.ticketRevenue.value)} color="#5B7B3A" />
        <StatCard label="Виручка від меню" value={formatMoney(kpi.menuRevenue.value)} color="#4A2C1A" />
        <StatCard label="Середній чек меню" value={formatMoney(kpi.menuAvgCheck.value)} color="#C89241" />
        <StatCard label="Активних подій" value={fmt(kpi.activeEvents.value)} color="#DAA520" />
      </div>
    </div>
  );
}

function OccupancyTab({ data, loading }) {
  if (loading) return <div className="loading-state">Завантаження...</div>;
  if (!data) return null;

  const s = data.summary;
  const zoneRows = data.byZone || [];

  return (
    <div className="report-content">
      <div className="report-section-title">Наповнюваність закладу</div>
      <div className="stats-grid">
        <StatCard label="Всього бронювань" value={fmt(s.totalReservations)} color="#8B6914" />
        <StatCard label="Прийшли" value={fmt(s.arrived)} color="#5B7B3A" />
        <StatCard label="Не прийшли" value={fmt(s.noShows)} color="#8B2500" />
        <StatCard label="Від закладу" value={fmt(s.onPremises)} color="#9333EA" />
        <StatCard label="Гостей" value={fmt(s.totalGuests)} color="#4A2C1A" />
        <StatCard label="Ср. тривалість" value={s.avgDurationMinutes != null ? `${fmt(s.avgDurationMinutes)} хв` : '—'} color="#C89241" />
        <StatCard label="Наповнюваність" value={pct(s.occupancyPct)} color="#DAA520" />
      </div>

      <div className="report-section-title" style={{ marginTop: 22 }}>По типу послуг</div>
      <div className="stats-grid">
        <StatCard label="Пляжні послуги (місць)" value={`${fmt(data.byKind.beach.units)} / ${fmt(data.byKind.beach.capacity)}`} sub={`Гостей: ${fmt(data.byKind.beach.guests)}`} color="#DAA520" />
        <StatCard label="Столи / Вечірні події" value={`${fmt(data.byKind.table.units)} / ${fmt(data.byKind.table.capacity)}`} sub={`Гостей: ${fmt(data.byKind.table.guests)} · Вечірніх: ${fmt(data.byKind.table.eveningEvents)}`} color="#C89241" />
      </div>

      {zoneRows.length > 0 && (
        <>
          <div className="report-section-title" style={{ marginTop: 22 }}>По зонах</div>
          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Зона</th>
                  <th>Місць</th>
                  <th>Зайнято</th>
                  <th>%</th>
                  <th>Гостей</th>
                  <th>Пляж</th>
                  <th>Від закладу</th>
                </tr>
              </thead>
              <tbody>
                {zoneRows.map((z) => (
                  <tr key={z.zoneId}>
                    <td><strong>{z.name}</strong></td>
                    <td>{fmt(z.capacity)}</td>
                    <td>{fmt(z.occupied)}</td>
                    <td>{pct(z.occupancyPct)}</td>
                    <td>{fmt(z.guests)}</td>
                    <td>{fmt(z.beachUnits)} / {fmt(z.beachGuests)} гіст.</td>
                    <td>{fmt(z.onPremises)} / {fmt(z.onPremisesGuests)} гіст.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.hourly && data.hourly.length > 0 && (
        <>
          <div className="report-section-title" style={{ marginTop: 22 }}>Наповнюваність по часу</div>
          <div style={{ display: 'grid', gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#365d62', marginBottom: 6 }}>Зайняті позиції по годинах</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(value, name) => [fmt(value), name === 'occupied' ? 'Зайнято' : name === 'arrivals' ? 'Прийшли' : 'Гостей']} labelFormatter={(h) => `${h}:00`} />
                  <Legend formatter={(value) => value === 'occupied' ? 'Зайнято' : value === 'arrivals' ? 'Прийшли' : 'Гостей'} />
                  <Line type="monotone" dataKey="occupied" stroke="#9333EA" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="arrivals" stroke="#5B7B3A" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#365d62', marginBottom: 6 }}>Гостей за годину приходу</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(value) => [fmt(value), 'Гостей']} labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="guests" fill="#DAA520" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useAdminI18n();
  const [activeTab, setActiveTab] = useState('summary');
  const [period, setPeriod] = useState('week');
  const [range, setRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    to: new Date().toISOString().substring(0, 10)
  });
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const tabs = [
    { key: 'summary', label: 'Зведений' },
    { key: 'financial', label: 'Фінансовий' },
    { key: 'reservations', label: 'Бронювання' },
    { key: 'tickets', label: 'Квитки' },
    { key: 'menu', label: 'Меню' },
    { key: 'events', label: 'Події' },
    { key: 'staff', label: 'Персонал' },
    { key: 'occupancy', label: 'Наповнюваність' }
  ];

  const typeMap = {
    summary: 'summary',
    financial: 'financial',
    reservations: 'reservations',
    tickets: 'tickets',
    menu: 'menu',
    events: 'events',
    staff: 'staff',
    occupancy: 'occupancy'
  };

  const load = useCallback(async (tabKey) => {
    const type = typeMap[tabKey] || tabKey;
    setLoading(true);
    const query = new URLSearchParams({ from: range.from, to: range.to }).toString();
    const { response, body } = await apiRequest(`/api/admin/reports/${type}?${query}`);
    setLoading(false);
    if (response.ok) {
      setData(prev => ({ ...prev, [tabKey]: body }));
    }
  }, [range, activeTab]);

  useEffect(() => {
    load(activeTab);
  }, [activeTab, range]);

  function onPeriodSelect(p) {
    setPeriod(p);
    const now = new Date();
    let from = new Date();
    if (p === 'today') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
    else if (p === 'yesterday') { from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); now.setDate(now.getDate() - 1); }
    else if (p === 'week') { from.setDate(from.getDate() - 7); }
    else if (p === 'month') { from.setMonth(from.getMonth() - 1); }
    else if (p === 'quarter') { from.setMonth(from.getMonth() - 3); }
    else if (p === 'year') { from.setFullYear(from.getFullYear() - 1); }
    setRange({ from: from.toISOString().substring(0, 10), to: now.toISOString().substring(0, 10) });
  }

  function onRangeChange(newFrom, newTo) {
    setRange({ from: newFrom || range.from, to: newTo || range.to });
    setPeriod(null);
  }

  return (
    <AdminLayout>
      <PageContainer eyebrow="Аналітика" title="Звіти" description="Детальна аналітика по всіх аспектах роботи закладу. Оберіть звіт та період для аналізу.">
        <div className="reports-toolbar">
          <div className="reports-tabs">
            {tabs.map(tab => (
              <button key={tab.key} type="button" className={`btn ${activeTab === tab.key ? 'btn-primary' : ''}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
            ))}
          </div>

          <DateRangePicker from={range.from} to={range.to} period={period} onPeriod={onPeriodSelect} onRange={onRangeChange} />

          <SendReportButton reportType={activeTab.toUpperCase()} from={range.from} to={range.to} />
        </div>

        {activeTab === 'summary' && <SummaryTab data={data.summary} loading={loading} />}
        {activeTab === 'financial' && <FinancialTab data={data.financial} loading={loading} />}
        {activeTab === 'reservations' && <ReservationsTab data={data.reservations} loading={loading} />}
        {activeTab === 'tickets' && <TicketsTab data={data.tickets} loading={loading} />}
        {activeTab === 'menu' && <MenuTab data={data.menu} loading={loading} />}
        {activeTab === 'events' && <EventsTab data={data.events} loading={loading} />}
        {activeTab === 'staff' && <StaffTab data={data.staff} loading={loading} />}
        {activeTab === 'occupancy' && <OccupancyTab data={data.occupancy} loading={loading} />}
      </PageContainer>
    </AdminLayout>
  );
}
