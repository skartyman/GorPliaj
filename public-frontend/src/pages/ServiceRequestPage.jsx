import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { serviceApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';

export default function ServiceRequestPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  useMeta('Статус заявки · ГорПляж', 'Статус сервисной заявки.');

  useEffect(() => {
    if (!id) return;
    serviceApi.fetchServiceRequest(id).then(setItem).catch(() => setItem(null));
  }, [id]);

  return (
    <main className="page-block">
      <h1>Статус заявки</h1>
      {item ? (
        <div className="premium-card">
          <p>
            <b>ID:</b> {item.id}
          </p>
          <p>
            <b>Статус:</b> {item.status}
          </p>
          <p>
            <b>Категория:</b> {item.category}
          </p>
          <p>
            <b>Описание:</b> {item.description}
          </p>
          <p>
            <b>Вложений:</b> {item.attachments.length}
          </p>
        </div>
      ) : (
        <p>Загрузка заявки...</p>
      )}
    </main>
  );
}
