import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ReservationDetailPage from './pages/ReservationDetailPage';
import ReservationsPage from './pages/ReservationsPage';

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
      <Route path="/admin/reservations" element={<ProtectedPage><ReservationsPage /></ProtectedPage>} />
      <Route path="/admin/reservations/:id" element={<ProtectedPage><ReservationDetailPage /></ProtectedPage>} />
      <Route path="/admin/map" element={<ProtectedPage><MapPage /></ProtectedPage>} />
      <Route
        path="/admin/menu"
        element={<ProtectedPage><PlaceholderPage title="Menu" description="Prepared for menu CRUD and item/category management." /></ProtectedPage>}
      />
      <Route
        path="/admin/events"
        element={<ProtectedPage><PlaceholderPage title="Events" description="Prepared for event scheduling and publishing flows." /></ProtectedPage>}
      />
      <Route
        path="/admin/news"
        element={<ProtectedPage><PlaceholderPage title="News" description="Prepared for articles, announcements, and homepage highlights." /></ProtectedPage>}
      />
      <Route
        path="/admin/payments"
        element={<ProtectedPage><PlaceholderPage title="Payments" description="Prepared for payment records and reconciliation tools." /></ProtectedPage>}
      />
      <Route
        path="/admin/settings"
        element={<ProtectedPage><PlaceholderPage title="Settings" description="Prepared for venue settings, roles, and integrations." /></ProtectedPage>}
      />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
