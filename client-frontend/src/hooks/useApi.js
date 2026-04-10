import { useEffect, useState } from 'react';

export function useMenu() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch('/api/menu');
        if (!response.ok) throw new Error('Failed to fetch menu');
        const data = await response.json();
        setMenu(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, []);

  return { menu, loading, error };
}

export function useReservation() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const createReservation = async (payload) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create reservation');
      
      setSuccess(true);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { createReservation, submitting, error, success, reset: () => { setError(null); setSuccess(false); } };
}
