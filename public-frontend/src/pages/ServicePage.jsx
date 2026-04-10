import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { serviceApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';

const TELEGRAM_USER_ID = '10001';
const categories = [
  'Не включается',
  'Нет воды / нет пролива',
  'Не греет',
  'Ошибка на дисплее',
  'Течь',
  'Плохой пролив / качество кофе',
  'Другое'
];

export default function ServicePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [clientId, setClientId] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('High');
  const [canOperateNow, setCanOperateNow] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [createdId, setCreatedId] = useState('');
  useMeta('Сервисная заявка · ГорПляж', 'Публичный сценарий сервисной заявки.');

  useEffect(() => {
    async function init() {
      const profile = await serviceApi.fetchClientProfile(TELEGRAM_USER_ID);
      const items = await serviceApi.fetchClientEquipment(profile.id);
      setClientId(profile.id);
      setEquipment(items);
      setSelectedEquipmentId(items[0]?.id || '');
      setLoading(false);
    }

    init().catch(() => setLoading(false));
  }, []);

  async function onUpload(event) {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      const media = await serviceApi.uploadMedia(file);
      setAttachments((current) => [...current, media]);
    }
  }

  async function submit() {
    setCreating(true);
    const created = await serviceApi.createServiceRequest({
      clientId,
      equipmentId: selectedEquipmentId,
      category,
      description,
      urgency,
      canOperateNow,
      attachments
    });
    setCreatedId(created.id);
    setCreating(false);
    setStep(7);
  }

  if (loading) {
    return <p>Загрузка сервисного кабинета...</p>;
  }

  return (
    <main className="page-block service-page">
      <h1>Сервисная заявка</h1>
      {step === 1 ? (
        <>
          <h2>1. Оборудование</h2>
          <div className="stack-grid">
            {equipment.map((item) => (
              <button key={item.id} type="button" className={`select-card ${item.id === selectedEquipmentId ? 'selected' : ''}`} onClick={() => setSelectedEquipmentId(item.id)}>
                {item.name}
                <br />#{item.internalNumber}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
            Далее
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2>2. Категория</h2>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
            Далее
          </button>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2>3. Описание</h2>
          <textarea rows="5" value={description} onChange={(event) => setDescription(event.target.value)} />
          <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
            Далее
          </button>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <h2>4. Срочность</h2>
          <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
            <option>Критично</option>
            <option>Высокая</option>
            <option>Планово</option>
          </select>
          <label className="checkbox-row">
            <input type="checkbox" checked={canOperateNow} onChange={(event) => setCanOperateNow(event.target.checked)} /> Оборудование пока может работать
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>
            Далее
          </button>
        </>
      ) : null}

      {step === 5 ? (
        <>
          <h2>5. Фото / видео</h2>
          <input type="file" multiple accept="image/*,video/*" onChange={onUpload} />
          <p>Загружено: {attachments.length}</p>
          <button type="button" className="btn btn-primary" onClick={() => setStep(6)}>
            Далее
          </button>
        </>
      ) : null}

      {step === 6 ? (
        <>
          <h2>6. Подтверждение</h2>
          <p>{category}</p>
          <p>{description}</p>
          <button type="button" className="btn btn-primary" disabled={creating} onClick={submit}>
            Создать заявку
          </button>
        </>
      ) : null}

      {step === 7 ? (
        <>
          <h2>Заявка отправлена</h2>
          <p>Номер заявки: {createdId}</p>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/service/requests/${createdId}`)}>
              Открыть заявку
            </button>
            <Link className="btn btn-secondary" to="/service/history">
              История заявок
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
