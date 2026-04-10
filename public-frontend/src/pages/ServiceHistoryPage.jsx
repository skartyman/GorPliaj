import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { serviceApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';

const CLIENT_ID = 'client_001';

export default function ServiceHistoryPage() {
  const [items, setItems] = useState([]);
  useMeta('История заявок · ГорПляж', 'История сервисных заявок клиента.');

  useEffect(() => {
    serviceApi.fetchServiceHistory(CLIENT_ID).then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <main className="page-block">
      <h1>История заявок</h1>
      {!items.length ? <p>Пока заявок нет.</p> : null}
      <div className="news-stack">
        {items.map((item) => (
          <Link key={item.id} to={`/service/requests/${item.id}`} className="premium-card news-card">
            <b>{item.category}</b>
            <span>{item.status}</span>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </Link>
        ))}
      </div>
    </main>
  );
}
