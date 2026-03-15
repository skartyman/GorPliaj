import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';

export default function MapPage() {
  return (
    <AdminLayout>
      <PageCard
        title="Venue map"
        description="This view is ready to render existing map and table allocation data from the current API."
      >
        <div className="map-placeholder">
          <p><strong>Map renderer placeholder</strong></p>
          <p className="muted">Connect the existing venue map payload here in phase 2.</p>
        </div>
      </PageCard>
    </AdminLayout>
  );
}
