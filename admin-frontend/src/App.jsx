import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import MapEditorPage from './pages/MapEditorPage';
import MenuEditorPage from './pages/MenuEditorPage';
import EventsPage from './pages/EventsPage';
import NewsPage from './pages/NewsPage';
import PaymentsPage from './pages/PaymentsPage';
import ReservationDetailPage from './pages/ReservationDetailPage';
import ReservationsPage from './pages/ReservationsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import TicketVerificationPage from './pages/TicketVerificationPage';
import TicketSalesPage from './pages/TicketSalesPage';
import PositionTypesPage from './pages/PositionTypesPage';
import PositionsPage from './pages/PositionsPage';
import AdminInstallPrompt from './components/AdminInstallPrompt';

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <AdminInstallPrompt />
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/admin/reservations" element={<ProtectedPage><ReservationsPage /></ProtectedPage>} />
        <Route path="/admin/reservations/:id" element={<ProtectedPage><ReservationDetailPage /></ProtectedPage>} />
        <Route path="/admin/map" element={<ProtectedPage><MapPage /></ProtectedPage>} />
        <Route path="/admin/map-editor" element={<ProtectedPage><MapEditorPage /></ProtectedPage>} />
        <Route path="/admin/menu" element={<ProtectedPage><MenuEditorPage /></ProtectedPage>} />
        <Route path="/admin/events" element={<ProtectedPage><EventsPage /></ProtectedPage>} />
        <Route path="/admin/ticket-sales" element={<ProtectedPage><TicketSalesPage /></ProtectedPage>} />
        <Route path="/admin/news" element={<ProtectedPage><NewsPage /></ProtectedPage>} />
        <Route path="/admin/payments" element={<ProtectedPage><PaymentsPage /></ProtectedPage>} />
        <Route path="/admin/verify-ticket" element={<ProtectedPage><TicketVerificationPage /></ProtectedPage>} />
        <Route path="/admin/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
        <Route path="/admin/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
        <Route path="/admin/position-types" element={<ProtectedPage><PositionTypesPage /></ProtectedPage>} />
        <Route path="/admin/positions" element={<ProtectedPage><PositionsPage /></ProtectedPage>} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
