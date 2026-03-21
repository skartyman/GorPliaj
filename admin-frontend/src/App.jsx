import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import PlaceholderPage from './pages/PlaceholderPage';
import ReservationDetailPage from './pages/ReservationDetailPage';
import ReservationsPage from './pages/ReservationsPage';

const placeholderPages = {
  menu: {
    title: 'Menu',
    description: 'Prepared for category, dish, pricing, and availability management.',
    eyebrow: 'Menu operations',
    ctaLabel: 'Next: category CRUD, item sorting, and seasonal availability.',
    stats: [
      { label: 'Menu groups', value: '08' },
      { label: 'Publishing modes', value: '03' },
      { label: 'Mobile shortcuts', value: '05' }
    ],
    sections: [
      {
        title: 'Editor blocks',
        items: [
          'Categories with drag-and-drop ordering.',
          'Dish cards with price, tags, and stock state.',
          'Instant preview for public mobile menu pages.'
        ]
      },
      {
        title: 'Operator flow',
        items: [
          'Quick updates for sold out and seasonal items.',
          'Compact actions for phone-sized screens.',
          'Bulk publish tools for lunch and evening menus.'
        ]
      }
    ]
  },
  events: {
    title: 'Events',
    description: 'Prepared for event scheduling, poster content, and booking visibility.',
    eyebrow: 'Event planning',
    ctaLabel: 'Next: calendar, cover uploads, and on-sale states.',
    stats: [
      { label: 'Event states', value: '04' },
      { label: 'Promo slots', value: '06' },
      { label: 'Schedule views', value: '02' }
    ],
    sections: [
      {
        title: 'Content modules',
        items: [
          'Headline, teaser, and poster media.',
          'Schedule blocks with doors open and start time.',
          'Visibility toggles for homepage and event list.'
        ]
      },
      {
        title: 'Operator workflow',
        items: [
          'Pin high-priority events at the top of the feed.',
          'Show booking impact directly from mobile.',
          'Connect payments and reservation campaigns later.'
        ]
      }
    ]
  },
  news: {
    title: 'News',
    description: 'Prepared for announcements, homepage stories, and operational highlights.',
    eyebrow: 'Homepage content',
    ctaLabel: 'Next: article composer, publish windows, and featured stories.',
    stats: [
      { label: 'Story blocks', value: '07' },
      { label: 'Highlights', value: '04' },
      { label: 'Preview modes', value: '03' }
    ],
    sections: [
      {
        title: 'Editorial layout',
        items: [
          'Featured hero story for the homepage.',
          'Short updates with tags and scheduling.',
          'Mobile cards with clear priority order.'
        ]
      },
      {
        title: 'Publishing controls',
        items: [
          'Draft, scheduled, and published states.',
          'Pin articles to highlights or remove quickly.',
          'Reusable templates for announcements and promos.'
        ]
      }
    ]
  },
  payments: {
    title: 'Payments',
    description: 'Prepared for payment records, booking deposits, and reconciliation tools.',
    eyebrow: 'Finance monitor',
    ctaLabel: 'Next: transaction feed, filters, and payout checks.',
    stats: [
      { label: 'Payment states', value: '05' },
      { label: 'Reconcile tasks', value: '09' },
      { label: 'Saved filters', value: '04' }
    ],
    sections: [
      {
        title: 'Transaction overview',
        items: [
          'Deposit, refund, and settlement tracking.',
          'Fast lookup by reservation, date, or status.',
          'Compact cards for staff using phones on site.'
        ]
      },
      {
        title: 'Daily controls',
        items: [
          'Flag mismatches between bookings and payments.',
          'Prepare export-ready reconciliation summaries.',
          'Surface urgent failed payments at the top.'
        ]
      }
    ]
  },
  settings: {
    title: 'Settings',
    description: 'Prepared for venue settings, users, roles, and integrations.',
    eyebrow: 'System setup',
    ctaLabel: 'Next: role matrix, venue profile, and integration secrets.',
    stats: [
      { label: 'Access roles', value: '06' },
      { label: 'Venue blocks', value: '05' },
      { label: 'Integrations', value: '03' }
    ],
    sections: [
      {
        title: 'Configuration areas',
        items: [
          'Venue profile, schedules, and operating windows.',
          'Admin roles with mobile-safe permissions.',
          'External channels for maps, payments, and messaging.'
        ]
      },
      {
        title: 'Operational tasks',
        items: [
          'Review changes before publishing to staff.',
          'Keep critical controls visible on narrow screens.',
          'Separate sensitive settings from daily tools.'
        ]
      }
    ]
  }
};

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
      <Route path="/admin/menu" element={<ProtectedPage><PlaceholderPage {...placeholderPages.menu} /></ProtectedPage>} />
      <Route path="/admin/events" element={<ProtectedPage><PlaceholderPage {...placeholderPages.events} /></ProtectedPage>} />
      <Route path="/admin/news" element={<ProtectedPage><PlaceholderPage {...placeholderPages.news} /></ProtectedPage>} />
      <Route path="/admin/payments" element={<ProtectedPage><PlaceholderPage {...placeholderPages.payments} /></ProtectedPage>} />
      <Route path="/admin/settings" element={<ProtectedPage><PlaceholderPage {...placeholderPages.settings} /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
