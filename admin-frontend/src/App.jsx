import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import MapEditorPage from './pages/MapEditorPage';
import MenuEditorPage from './pages/MenuEditorPage';
import PlaceholderPage from './pages/PlaceholderPage';
import EventsPage from './pages/EventsPage';
import NewsPage from './pages/NewsPage';
import PaymentsPage from './pages/PaymentsPage';
import ReservationDetailPage from './pages/ReservationDetailPage';
import ReservationsPage from './pages/ReservationsPage';
import SettingsPage from './pages/SettingsPage';
import AdminInstallPrompt from './components/AdminInstallPrompt';
import { useAdminI18n } from './lib/i18n';

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function buildPlaceholderPages(t) {
  return {
    menu: {
      title: t('placeholder.pages.menu.title'),
      description: t('placeholder.pages.menu.description'),
      eyebrow: t('placeholder.pages.menu.eyebrow'),
      ctaLabel: t('placeholder.pages.menu.cta'),
      stats: [
        { label: t('placeholder.pages.menu.stats.groups'), value: '08' },
        { label: t('placeholder.pages.menu.stats.publish'), value: '03' },
        { label: t('placeholder.pages.menu.stats.shortcuts'), value: '05' }
      ],
      sections: [
        {
          title: t('placeholder.pages.menu.section1'),
          items: [
            t('placeholder.pages.menu.items1'),
            t('placeholder.pages.menu.items2'),
            t('placeholder.pages.menu.items3')
          ]
        },
        {
          title: t('placeholder.pages.menu.section2'),
          items: [
            t('placeholder.pages.menu.items4'),
            t('placeholder.pages.menu.items5'),
            t('placeholder.pages.menu.items6')
          ]
        }
      ]
    },
    events: {
      title: t('placeholder.pages.events.title'),
      description: t('placeholder.pages.events.description'),
      eyebrow: t('placeholder.pages.events.eyebrow'),
      ctaLabel: t('placeholder.pages.events.cta'),
      stats: [
        { label: t('placeholder.pages.events.stats.states'), value: '04' },
        { label: t('placeholder.pages.events.stats.promo'), value: '06' },
        { label: t('placeholder.pages.events.stats.views'), value: '02' }
      ],
      sections: [
        {
          title: t('placeholder.pages.events.section1'),
          items: [
            t('placeholder.pages.events.items1'),
            t('placeholder.pages.events.items2'),
            t('placeholder.pages.events.items3')
          ]
        },
        {
          title: t('placeholder.pages.events.section2'),
          items: [
            t('placeholder.pages.events.items4'),
            t('placeholder.pages.events.items5'),
            t('placeholder.pages.events.items6')
          ]
        }
      ]
    },
    news: {
      title: t('placeholder.pages.news.title'),
      description: t('placeholder.pages.news.description'),
      eyebrow: t('placeholder.pages.news.eyebrow'),
      ctaLabel: t('placeholder.pages.news.cta'),
      stats: [
        { label: t('placeholder.pages.news.stats.blocks'), value: '07' },
        { label: t('placeholder.pages.news.stats.highlights'), value: '04' },
        { label: t('placeholder.pages.news.stats.previews'), value: '03' }
      ],
      sections: [
        {
          title: t('placeholder.pages.news.section1'),
          items: [
            t('placeholder.pages.news.items1'),
            t('placeholder.pages.news.items2'),
            t('placeholder.pages.news.items3')
          ]
        },
        {
          title: t('placeholder.pages.news.section2'),
          items: [
            t('placeholder.pages.news.items4'),
            t('placeholder.pages.news.items5'),
            t('placeholder.pages.news.items6')
          ]
        }
      ]
    },
    payments: {
      title: t('placeholder.pages.payments.title'),
      description: t('placeholder.pages.payments.description'),
      eyebrow: t('placeholder.pages.payments.eyebrow'),
      ctaLabel: t('placeholder.pages.payments.cta'),
      stats: [
        { label: t('placeholder.pages.payments.stats.states'), value: '05' },
        { label: t('placeholder.pages.payments.stats.reconcile'), value: '09' },
        { label: t('placeholder.pages.payments.stats.filters'), value: '04' }
      ],
      sections: [
        {
          title: t('placeholder.pages.payments.section1'),
          items: [
            t('placeholder.pages.payments.items1'),
            t('placeholder.pages.payments.items2'),
            t('placeholder.pages.payments.items3')
          ]
        },
        {
          title: t('placeholder.pages.payments.section2'),
          items: [
            t('placeholder.pages.payments.items4'),
            t('placeholder.pages.payments.items5'),
            t('placeholder.pages.payments.items6')
          ]
        }
      ]
    },
    settings: {
      title: t('placeholder.pages.settings.title'),
      description: t('placeholder.pages.settings.description'),
      eyebrow: t('placeholder.pages.settings.eyebrow'),
      ctaLabel: t('placeholder.pages.settings.cta'),
      stats: [
        { label: t('placeholder.pages.settings.stats.roles'), value: '06' },
        { label: t('placeholder.pages.settings.stats.blocks'), value: '05' },
        { label: t('placeholder.pages.settings.stats.integrations'), value: '03' }
      ],
      sections: [
        {
          title: t('placeholder.pages.settings.section1'),
          items: [
            t('placeholder.pages.settings.items1'),
            t('placeholder.pages.settings.items2'),
            t('placeholder.pages.settings.items3')
          ]
        },
        {
          title: t('placeholder.pages.settings.section2'),
          items: [
            t('placeholder.pages.settings.items4'),
            t('placeholder.pages.settings.items5'),
            t('placeholder.pages.settings.items6')
          ]
        }
      ]
    }
  };
}

export default function App() {
  const { t } = useAdminI18n();
  const placeholderPages = buildPlaceholderPages(t);

  return (
    <>
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
      <Route path="/admin/news" element={<ProtectedPage><NewsPage /></ProtectedPage>} />
      <Route path="/admin/payments" element={<ProtectedPage><PaymentsPage /></ProtectedPage>} />
      <Route path="/admin/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </>
  );
}
