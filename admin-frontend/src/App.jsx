import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ReservationsPage from './pages/ReservationsPage';
import ReservationDetailPage from './pages/ReservationDetailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin/reservations"
        element={(
          <ProtectedRoute>
            <ReservationsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/admin/reservations/:id"
        element={(
          <ProtectedRoute>
            <ReservationDetailPage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/admin/reservations" replace />} />
    </Routes>
  );
}
