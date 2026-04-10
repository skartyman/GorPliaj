import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { serviceApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';

export default function ServiceRequestPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  useMeta('Service request status · GorPliaj', 'Status of a service request.');

  useEffect(() => {
    if (!id) return;
    serviceApi.fetchServiceRequest(id).then(setItem).catch(() => setItem(null));
  }, [id]);

  return (
    <main className="page-block">
      <h1>Request status</h1>
      {item ? (
        <div className="premium-card">
          <p>
            <b>ID:</b> {item.id}
          </p>
          <p>
            <b>Status:</b> {item.status}
          </p>
          <p>
            <b>Category:</b> {item.category}
          </p>
          <p>
            <b>Description:</b> {item.description}
          </p>
          <p>
            <b>Attachments:</b> {item.attachments.length}
          </p>
        </div>
      ) : (
        <p>Loading request...</p>
      )}
    </main>
  );
}
