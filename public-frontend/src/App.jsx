import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import MenuPage from './pages/MenuPage';
import UnifiedBookingPage from './pages/UnifiedBookingPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import PaymentReturnsPage from './pages/PaymentReturnsPage';
import RulesPage from './pages/RulesPage';
import WaiterCabinetPage from './pages/WaiterCabinetPage';
import CabinetPage from './pages/CabinetPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/map-preview" element={<Navigate to="/booking" replace />} />
        <Route path="/booking" element={<UnifiedBookingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/payment-returns" element={<PaymentReturnsPage />} />
        <Route path="/cabinet" element={<CabinetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/waiter" element={<WaiterCabinetPage />} />
      <Route path="/waiter/*" element={<WaiterCabinetPage />} />
    </Routes>
  );
}
