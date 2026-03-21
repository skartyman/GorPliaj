import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import { useAdminI18n } from '../lib/i18n';

export default function PlaceholderPage({
  title,
  description,
  eyebrow,
  stats,
  sections,
  timeline,
  ctaLabel
}) {
  const { t } = useAdminI18n();
  const defaultStats = [
    { label: t('placeholder.sections.ready'), value: '03' },
    { label: t('reservations.summary.visible'), value: '06' },
    { label: t('placeholder.defaults.eyebrow'), value: '04' }
  ];
  const defaultSections = [
    {
      title: t('placeholder.sections.ready'),
      items: [
        t('placeholder.items.ready1'),
        t('placeholder.items.ready2'),
        t('placeholder.items.ready3')
      ]
    },
    {
      title: t('placeholder.sections.next'),
      items: [
        t('placeholder.items.next1'),
        t('placeholder.items.next2'),
        t('placeholder.items.next3')
      ]
    }
  ];
  const defaultTimeline = [
    t('placeholder.timeline.step1'),
    t('placeholder.timeline.step2'),
    t('placeholder.timeline.step3')
  ];

  const resolvedStats = stats?.length ? stats : defaultStats;
  const resolvedSections = sections?.length ? sections : defaultSections;
  const resolvedTimeline = timeline?.length ? timeline : defaultTimeline;

  return (
    <AdminLayout>
      <PageContainer title={title} description={description}>
        <section className="page-hero">
          <div className="page-hero-copy">
            <span className="eyebrow">{eyebrow || t('placeholder.defaults.eyebrow')}</span>
            <h3>{`${title} ${t('placeholder.workspaceSuffix')}`}</h3>
            <p className="muted">{t('placeholder.heroDescription', { description })}</p>
            <div className="hero-inline-note">{ctaLabel || t('placeholder.defaults.cta')}</div>
          </div>

          <div className="hero-stat-grid">
            {resolvedStats.map((item) => (
              <article key={item.label} className="hero-stat-card">
                <strong>{item.value}</strong>
                <span className="muted">{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="stack-grid">
          {resolvedSections.map((section) => (
            <PanelCard key={section.title} title={section.title} className="surface-muted full-height">
              <ul className="feature-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </PanelCard>
          ))}
        </section>

        <PanelCard
          title={t('placeholder.launchChecklist')}
          subtitle={t('placeholder.launchChecklistDescription')}
          className="surface-muted"
        >
          <ol className="timeline-list">
            {resolvedTimeline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </PanelCard>
      </PageContainer>
    </AdminLayout>
  );
}
