import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';

export default function PlaceholderPage({ title, description }) {
  return (
    <AdminLayout>
      <PageCard title={title} description={description}>
        <div className="placeholder-grid">
          <div className="placeholder-block" />
          <div className="placeholder-block" />
          <div className="placeholder-block" />
        </div>
      </PageCard>
    </AdminLayout>
  );
}
