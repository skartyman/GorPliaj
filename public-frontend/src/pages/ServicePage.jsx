import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { serviceApi } from '../lib/api';
import { useMeta } from '../hooks/useMeta';

const TELEGRAM_USER_ID = '10001';
const categories = [
  'Does not turn on',
  'No water / no flow',
  'No heating',
  'Display error',
  'Leak',
  'Poor extraction / coffee quality',
  'Other'
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
  useMeta('Service request · GorPliaj', 'Public service request flow.');

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
    return <p>Loading service cabinet...</p>;
  }

  return (
    <main className="page-block service-page">
      <h1>Service request</h1>
      {step === 1 ? (
        <>
          <h2>1. Equipment</h2>
          <div className="stack-grid">
            {equipment.map((item) => (
              <button key={item.id} type="button" className={`select-card ${item.id === selectedEquipmentId ? 'selected' : ''}`} onClick={() => setSelectedEquipmentId(item.id)}>
                {item.name}
                <br />#{item.internalNumber}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
            Next
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2>2. Category</h2>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
            Next
          </button>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2>3. Description</h2>
          <textarea rows="5" value={description} onChange={(event) => setDescription(event.target.value)} />
          <button type="button" className="btn btn-primary" onClick={() => setStep(4)}>
            Next
          </button>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <h2>4. Urgency</h2>
          <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
            <option>Critical</option>
            <option>High</option>
            <option>Planned</option>
          </select>
          <label className="checkbox-row">
            <input type="checkbox" checked={canOperateNow} onChange={(event) => setCanOperateNow(event.target.checked)} /> Equipment can still work
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>
            Next
          </button>
        </>
      ) : null}

      {step === 5 ? (
        <>
          <h2>5. Photos / video</h2>
          <input type="file" multiple accept="image/*,video/*" onChange={onUpload} />
          <p>Uploaded: {attachments.length}</p>
          <button type="button" className="btn btn-primary" onClick={() => setStep(6)}>
            Next
          </button>
        </>
      ) : null}

      {step === 6 ? (
        <>
          <h2>6. Confirm</h2>
          <p>{category}</p>
          <p>{description}</p>
          <button type="button" className="btn btn-primary" disabled={creating} onClick={submit}>
            Create request
          </button>
        </>
      ) : null}

      {step === 7 ? (
        <>
          <h2>Request sent</h2>
          <p>Request ID: {createdId}</p>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/service/requests/${createdId}`)}>
              Open request
            </button>
            <Link className="btn btn-secondary" to="/service/history">
              Request history
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
