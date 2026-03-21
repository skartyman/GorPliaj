import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';

const defaultStats = [
  { label: 'Ready modules', value: '03' },
  { label: 'Mobile states', value: '06' },
  { label: 'Primary flows', value: '04' }
];

const defaultSections = [
  {
    title: 'What is ready now',
    items: [
      'Focused hero with the most important operator actions.',
      'Compact mobile cards and wider desktop layout.',
      'Clear placeholders for future CRUD and API integration.'
    ]
  },
  {
    title: 'Next implementation steps',
    items: [
      'Connect live API endpoints and replace static previews.',
      'Add create / edit flows with validation and drafts.',
      'Expand analytics and alerts for daily operations.'
    ]
  }
];

const defaultTimeline = [
  'Define content structure and priorities for the section.',
  'Prepare compact cards and navigation for mobile first usage.',
  'Connect publishing workflow and operational actions.'
];

export default function PlaceholderPage({
  title,
  description,
  eyebrow = 'Workspace',
  stats = defaultStats,
  sections = defaultSections,
  timeline = defaultTimeline,
  ctaLabel = 'Planned for next iteration'
}) {
  return (
    <AdminLayout>
      <PageContainer title={title} description={description}>
        <section className="page-hero">
          <div className="page-hero-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h3>{title} workspace</h3>
            <p className="muted">
              {description} The page is already structured for operators on small screens first, then expanded for tablet and desktop.
            </p>
            <div className="hero-inline-note">{ctaLabel}</div>
          </div>

          <div className="hero-stat-grid">
            {stats.map((item) => (
              <article key={item.label} className="hero-stat-card">
                <strong>{item.value}</strong>
                <span className="muted">{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="stack-grid">
          {sections.map((section) => (
            <PanelCard key={section.title} title={section.title} className="surface-muted full-height">
              <ul className="feature-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </PanelCard>
          ))}
        </section>

        <PanelCard title="Launch checklist" subtitle="A compact rollout path that works well on mobile and desktop." className="surface-muted">
          <ol className="timeline-list">
            {timeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </PanelCard>
      </PageContainer>
    </AdminLayout>
  );
}
