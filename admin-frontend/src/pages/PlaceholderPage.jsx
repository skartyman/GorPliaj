import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';

export default function PlaceholderPage({ title, description }) {
  return (
    <AdminLayout>
      <PageContainer title={title} description={description}>
        <div className="placeholder-grid">
          <div className="placeholder-block" />
          <div className="placeholder-block" />
          <div className="placeholder-block" />
        </div>
      </PageContainer>
    </AdminLayout>
  );
}
