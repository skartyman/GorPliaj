const nodemailer = require('nodemailer');
const { escapeHtml } = require('../utils/deliveryPresentation');
const { isMailConfigured } = require('./emailService');
const { getFinancialReport, getReservationsReport, getTicketSalesReport, getMenuReport, getEventsReport, getStaffReport, getSummaryReport, getOccupancyReport } = require('./reportService');

function createTransport() {
  if (!isMailConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_PORT === '465',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });
}

function fmt(value) {
  if (value == null) return '—';
  if (typeof value === 'number') return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  return String(value);
}

function money(v) {
  return `${fmt(v)} ₴`;
}

function pct(v) {
  return v != null ? `${fmt(v)}%` : '—';
}

function kpiCard(label, value, subtitle) {
  return `
    <div style="display:inline-block;width:230px;padding:16px;margin:4px;background:#f4f8f7;border-radius:10px;text-align:center;vertical-align:top;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#668589;font-weight:600;">${escapeHtml(label)}</div>
      <div style="font-size:22px;font-weight:700;color:#173d43;margin-top:6px;">${value}</div>
      ${subtitle ? `<div style="font-size:11px;color:#668589;margin-top:4px;">${subtitle}</div>` : ''}
    </div>`;
}

function tableRow(cols, header = false) {
  const bg = header ? '#173f47' : '#ffffff';
  const color = header ? '#ffffff' : '#1b3a40';
  const weight = header ? '700' : '500';
  const cells = cols.map(c => `<td style="padding:8px 10px;background:${bg};color:${color};font-weight:${weight};font-size:13px;border-bottom:1px solid #eaf4f3;">${c}</td>`).join('');
  return `<tr>${cells}</tr>`;
}

function buildEmailLayout({ title, subtitle, content }) {
  return `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#eef5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1b3a40;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef5f4;padding:20px 8px;">
  <tr><td align="center">
    <table width="680" cellpadding="0" cellspacing="0" role="presentation" style="width:680px;max-width:100%;background:#ffffff;border:1px solid #cfe3e0;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(23,61,67,0.08);">
      <tr><td style="padding:24px 26px;background:#123f47;color:#ffffff;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b9ded8;font-weight:600;">GorPliaj · Звіт</div>
        <h1 style="margin:6px 0 2px;font-size:21px;font-weight:700;letter-spacing:-0.2px;">${escapeHtml(title)}</h1>
        ${subtitle ? `<div style="font-size:12px;color:#b9ded8;margin-top:4px;">${escapeHtml(subtitle)}</div>` : ''}
      </td></tr>
      <tr><td style="padding:20px 26px 24px;">${content}</td></tr>
      <tr><td style="padding:12px 26px 18px;font-size:11px;color:#668589;">Звіт автоматично сформовано системою адміністрування Горпляж.</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildFinancialHtml(report) {
  const r = report.revenue;
  const c = report.counts;
  const content = `
    <p style="margin:8px 0 10px;color:#365d62;font-size:14px;"><strong>${money(r.total)}</strong> підтверджена онлайн-виручка за період.</p>
    <p style="margin:0 0 18px;color:#55777b;font-size:12px;background:#fff5dc;padding:8px 12px;border-radius:8px;">⚠ Враховані тільки підтверджені оплати через інтернет-еквайринг. Наложні платежі, готівка і повернення виключені.</p>
    <div>${kpiCard('Онлайн-виручка', money(r.total), 'PAID-статус')}${kpiCard('Від бронювань', money(r.fromReservations), `${fmt(c.paidReservations)} оплат`)}${kpiCard('Від квитків', money(r.fromTickets), `${fmt(c.paidTicketOrders)} оплат`)}${kpiCard('Повернення', money(r.refunds), `${fmt(c.refunds)} оп.`)}</div>
    <div style="margin-top:14px;">${kpiCard('Депозити', money(r.deposits))}${kpiCard('Оренда', money(r.rentals))}</div>
  `;
  return buildEmailLayout({ title: 'Фінансовий звіт', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildReservationsHtml(report) {
  const s = report.summary;
  const content = `
    <p style="margin:8px 0 18px;color:#365d62;font-size:14px;"><strong>${fmt(s.total)}</strong> бронювань за період. Підтверджених: ${fmt(s.confirmed)}. Виконаних: ${fmt(s.completed)}.</p>
    <div>${kpiCard('Всього бронювань', fmt(s.total))}${kpiCard('Підтверджено', fmt(s.confirmed))}${kpiCard('Виконано', fmt(s.completed))}${kpiCard('Скасовано', fmt(s.cancelled), pct(s.cancelledRate))}${kpiCard('Не прийшли', fmt(s.noShow), pct(s.noShowRate))}${kpiCard('Повторні клієнти', fmt(report.repeatCustomers))}${kpiCard('Унікальні клієнти', fmt(report.uniqueCustomers))}${kpiCard('Середня тривалість', report.avgDurationHours ? `${report.avgDurationHours} год` : '—')}</div>
    <h3 style="margin:20px 0 8px;font-size:14px;color:#173d43;">За джерелами</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;margin-bottom:14px;">
      ${tableRow(['Джерело', 'Кількість'], true)}
      ${Object.entries(report.bySource).map(([src, count]) => tableRow([escapeHtml(src), fmt(count)])).join('')}
    </table>
    <h3 style="margin:20px 0 8px;font-size:14px;color:#173d43;">За зонами</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;">
      ${tableRow(['Зона', 'Бронювань'], true)}
      ${Object.entries(report.byZone).map(([zone, count]) => tableRow([escapeHtml(zone), fmt(count)])).join('')}
    </table>
  `;
  return buildEmailLayout({ title: 'Звіт по бронюванням', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildTicketSalesHtml(report) {
  const s = report.summary;
  const content = `
    <p style="margin:8px 0 18px;color:#365d62;font-size:14px;"><strong>${fmt(s.paidOrders)}</strong> оплачених замовлень із ${fmt(s.totalOrders)}. Виручка: ${money(s.totalRevenue)}.</p>
    <div>${kpiCard('Заказів всього', fmt(s.totalOrders))}${kpiCard('Оплачених', fmt(s.paidOrders), pct(s.conversionRate))}${kpiCard('Виручка від квитків', money(s.totalRevenue))}${kpiCard('Квитків продано', fmt(s.totalTickets))}${kpiCard('Використано', fmt(s.usedTickets), pct(s.usageRate))}</div>
    <h3 style="margin:20px 0 8px;font-size:14px;color:#173d43;">По подіях</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;">
      ${tableRow(['Подія', 'Заказів', 'Виручка'], true)}
      ${Object.entries(report.byEvent).map(([evt, info]) => tableRow([escapeHtml(evt), fmt(info.count), money(info.revenue)])).join('')}
    </table>
  `;
  return buildEmailLayout({ title: 'Звіт по продажу квитків', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildMenuHtml(report) {
  const s = report.summary;
  const content = `
    <p style="margin:8px 0 18px;color:#365d62;font-size:14px;"><strong>${money(s.totalRevenue)}</strong> виручки від замовлень меню. Середній чек: ${money(s.avgCheck)}.</p>
    <div>${kpiCard('Позицій в меню', fmt(s.totalItems))}${kpiCard('Замовлень', fmt(s.totalOrders))}${kpiCard('Виручка', money(s.totalRevenue))}${kpiCard('Середній чек', money(s.avgCheck))}</div>
    <h3 style="margin:18px 0 8px;font-size:14px;color:#173d43;">Топ-15 за замовленнями</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;margin-bottom:14px;">
      ${tableRow(['Позиція', 'Замовлень', 'Виручка'], true)}
      ${report.topByOrders.map(i => tableRow([escapeHtml(i.name), fmt(i.orders), money(i.revenue)])).join('')}
    </table>
    <h3 style="margin:18px 0 8px;font-size:14px;color:#173d43;">Топ-15 за лайками</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;">
      ${tableRow(['Позиція', 'Категорія', 'Лайків'], true)}
      ${report.topByLikes.map(i => tableRow([escapeHtml(i.name), escapeHtml(i.category), fmt(i.likesCount)])).join('')}
    </table>
  `;
  return buildEmailLayout({ title: 'Звіт по меню', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildEventsHtml(report) {
  const s = report.summary;
  const content = `
    <p style="margin:8px 0 18px;color:#365d62;font-size:14px;"><strong>${fmt(s.totalEvents)}</strong> події в періоді. Загальна виручка: ${money(s.totalRevenue)}.</p>
    <div>${kpiCard('Подій', fmt(s.totalEvents))}${kpiCard('Виручка', money(s.totalRevenue))}${kpiCard('Бронювань', fmt(s.totalReservations))}${kpiCard('Квитків продано', fmt(s.totalTicketSales))}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;margin-top:16px;">
      ${tableRow(['Подія', 'Броні', 'Квитків', 'Виручка'], true)}
      ${report.events.map(e => tableRow([escapeHtml(e.title), fmt(e.reservationsCount), fmt(e.totalTickets), money(e.ticketRevenue)])).join('')}
    </table>
  `;
  return buildEmailLayout({ title: 'Звіт по подіях', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildStaffHtml(report) {
  const s = report.summary;
  const content = `
    <p style="margin:8px 0 18px;color:#365d62;font-size:14px;">Офіціантів активних: <strong>${fmt(s.activeWaiters)}</strong> із ${fmt(s.totalWaiters)}. Загальна виручка: ${money(s.totalRevenue)}.</p>
    <div>${kpiCard('Офіціантів', fmt(s.totalWaiters))}${kpiCard('Активних', fmt(s.activeWaiters))}${kpiCard('Замовлень', fmt(s.totalOrders))}${kpiCard('Виручка', money(s.totalRevenue))}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2eeed;border-radius:8px;overflow:hidden;margin-top:16px;">
      ${tableRow(['Офіціант', 'Замовлень', 'Виручка', 'Відповіді на дзвінки', 'Сер. час відповіді'], true)}
      ${report.waiters.map(w => tableRow([escapeHtml(w.name), fmt(w.orderCount), money(w.revenue), fmt(w.respondedCalls), w.avgResponseTimeMin != null ? `${fmt(w.avgResponseTimeMin)} хв` : '—'])).join('')}
    </table>
  `;
  return buildEmailLayout({ title: 'Звіт по персоналу', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildSummaryHtml(report) {
  const kpi = report.kpis;
  const content = `
    <p style="margin:8px 0 6px;color:#365d62;font-size:14px;">Зведений звіт за період із KPI та трендами. ${kpi.revenue.change != null ? `Зміна підтвердженої виручки: <strong>${kpi.revenue.change > 0 ? '+' : ''}${kpi.revenue.change}%</strong> у порівнянні з попереднім періодом.` : ''}</p>
    <p style="margin:0 0 18px;color:#55777b;font-size:12px;background:#fff5dc;padding:8px 12px;border-radius:8px;">⚠ Виручка враховує тільки онлайн-еквайринг (статус PAID). Наложні платежі і повернення виключені.</p>
    <div>${kpiCard('Підтверджена виручка', money(kpi.revenue.value), kpi.revenue.change != null ? `${kpi.revenue.change > 0 ? '▲' : '▼'} ${Math.abs(kpi.revenue.change)}%` : 'тільки онлайн')}${kpiCard('Бронювань', fmt(kpi.reservations.value))}${kpiCard('Скасування', pct(kpi.cancelledRate.value))}${kpiCard('Не прийшли', pct(kpi.noShowRate.value))}${kpiCard('Виручка від квитків', money(kpi.ticketRevenue.value))}${kpiCard('Виручка від меню', money(kpi.menuRevenue.value))}${kpiCard('Середній чек', money(kpi.menuAvgCheck.value))}${kpiCard('Активних подій', fmt(kpi.activeEvents.value))}</div>
    <p style="margin-top:22px;font-size:13px;color:#365d62;line-height:1.6;">Розгорнуті дані доступні в панелі адміністрування у розділі «Звіти».</p>
  `;
  return buildEmailLayout({ title: 'Зведений звіт', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

function buildOccupancyHtml(report) {
  const s = report.summary;
  const b = report.byKind.beach;
  const t = report.byKind.table;
  const content = `
    <p style="margin:8px 0 14px;color:#365d62;font-size:14px;">Звіт по наповнюваності за період. Всього днів: <strong>${fmt(s.totalReservations)}</strong> бронювань, прийшли: <strong>${fmt(s.arrived)}</strong>, не прийшли: <strong>${fmt(s.noShows)}</strong>.</p>
    <div>${kpiCard('Всього бронювань', fmt(s.totalReservations))}${kpiCard('Прийшли', fmt(s.arrived))}${kpiCard('Не прийшли', fmt(s.noShows))}${kpiCard('Від закладу', fmt(s.onPremises))}${kpiCard('Гостей', fmt(s.totalGuests))}${kpiCard('Ср. тривалість', s.avgDurationMinutes != null ? `${fmt(s.avgDurationMinutes)} хв` : '—')}${kpiCard('Наповнюваність', pct(s.occupancyPct))}</div>
    <h3 style="margin:22px 0 8px;font-size:14px;color:#173d43;">По типу послуг</h3>
    <div>${kpiCard(`Пляжні послуги: ${fmt(b.units)}/${fmt(b.capacity)}`, pct(b.occupancyPct), `Гостей: ${fmt(b.guests)}`)}${kpiCard(`Столи / Вечір: ${fmt(t.units)}/${fmt(t.capacity)}`, pct(t.occupancyPct), `Гостей: ${fmt(t.guests)} · Вечірніх: ${fmt(t.eveningEvents)}`)}</div>
    ${report.byZone.length ? `
    <h3 style="margin:22px 0 8px;font-size:14px;color:#173d43;">По зонах:</h3>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      ${tableRow(['Зона', 'Місць', 'Зайнято', '%', 'Гостей', 'Від закладу'], true)}
      ${report.byZone.map(z => tableRow([escapeHtml(z.name), fmt(z.capacity), fmt(z.occupied), pct(z.occupancyPct), fmt(z.guests), fmt(z.onPremises)])).join('')}
    </table>` : ''}
    <p style="margin-top:22px;font-size:13px;color:#365d62;line-height:1.6;">Розгорнуті дані з графіками доступні в панелі адміністрування у розділі «Звіти» → «Наповнюваність».</p>
  `;
  return buildEmailLayout({ title: 'Звіт по наповнюваності', subtitle: `${fmt(report.period.from)} — ${fmt(report.period.to)}`, content });
}

const REPORT_TYPE_CONFIG = {
  FINANCIAL: { subject: 'Фінансовий звіт — GorPliaj', generator: getFinancialReport, builder: buildFinancialHtml },
  RESERVATIONS: { subject: 'Звіт по бронюванням — GorPliaj', generator: getReservationsReport, builder: buildReservationsHtml },
  TICKETS: { subject: 'Звіт по продажу квитків — GorPliaj', generator: getTicketSalesReport, builder: buildTicketSalesHtml },
  MENU: { subject: 'Звіт по меню — GorPliaj', generator: getMenuReport, builder: buildMenuHtml },
  EVENTS: { subject: 'Звіт по подіях — GorPliaj', generator: getEventsReport, builder: buildEventsHtml },
  STAFF: { subject: 'Звіт по персоналу — GorPliaj', generator: getStaffReport, builder: buildStaffHtml },
  SUMMARY: { subject: 'Зведений звіт — GorPliaj', generator: getSummaryReport, builder: buildSummaryHtml },
  OCCUPANCY: { subject: 'Звіт по наповнюваності — GorPliaj', generator: getOccupancyReport, builder: buildOccupancyHtml }
};

async function sendReportEmail({ reportType, email, from, to }) {
  const config = REPORT_TYPE_CONFIG[reportType];
  if (!config) return { sent: false, reason: 'unknown_report_type' };
  if (!isMailConfigured()) {
    console.log(`[report-mail] Not configured. Would send ${reportType} to ${email}`);
    return { sent: false, reason: 'mail_not_configured' };
  }

  const transport = createTransport();
  if (!transport) return { sent: false, reason: 'mail_transport_failed' };

  try {
    const report = await config.generator({ from, to });
    const html = config.builder(report);
    const subject = `${config.subject} (${new Date(from).toLocaleDateString('uk-UA')} — ${new Date(to).toLocaleDateString('uk-UA')})`;

    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: email,
      subject,
      html
    });

    console.log(`[report-mail] ${reportType} sent to ${email}`);
    return { sent: true };
  } catch (error) {
    console.error(`[report-mail] Failed to send ${reportType} to ${email}:`, error.message);
    return { sent: false, reason: error.message };
  }
}

module.exports = { sendReportEmail, REPORT_TYPE_CONFIG };
