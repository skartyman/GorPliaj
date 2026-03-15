import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';

const summaryCards = [
  { label: 'Today reservations', value: '24' },
  { label: 'Pending confirmations', value: '6' },
  { label: 'Active events', value: '3' },
  { label: 'Revenue (today)', value: '₾ 4,250' }
];

export default function DashboardPage() {
  return (
    <AdminLayout>
      <section className="grid-summary">
        {summaryCards.map((card) => (
          <article key={card.label} className="metric-card">
            <p className="muted">{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="grid-two-col">
        <PageCard
          title="Quick actions"
          description="Jump directly to frequent admin tasks."
        >
          <div className="actions">
            <Link className="btn" to="/admin/reservations">Manage reservations</Link>
            <Link className="btn btn-secondary" to="/admin/map">Open venue map</Link>
            <Link className="btn btn-secondary" to="/admin/events">Review events</Link>
          </div>
        </PageCard>

        <PageCard
          title="Operational notes"
          description="Prepared for future backend integrations."
        >
          <ul className="plain-list">
            <li>Menu CRUD hooks can be added in Menu page service layer.</li>
            <li>Events/Posters page is scaffolded for publishing workflow.</li>
            <li>News and Payments pages are ready for API wiring in phase 2.</li>
          </ul>
        </PageCard>
      </section>
    </AdminLayout>
  );
}
