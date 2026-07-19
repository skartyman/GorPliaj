import { useState } from 'react';

function formatUA(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  const d = digits.startsWith('38') ? digits.slice(2) : digits;
  let out = '+38 (0';
  if (d.length > 1) out += d.slice(1, 3);
  if (d.length > 3) out += ') ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return d.length > 1 ? out : '+38 (0';
}

export default function PhoneInput({ value, onChange, required, placeholder }) {
  const [intl, setIntl] = useState(false);

  if (intl) {
    return (
      <div>
        <input
          type="tel"
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder || '+...'}
        />
        <button type="button" className="phone-intl-link" onClick={() => { setIntl(false); }}>
          Номер України
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="tel"
        className="form-input"
        value={value}
        onChange={(e) => onChange(formatUA(e.target.value))}
        required={required}
        placeholder="+38 (0XX) XXX-XX-XX"
      />
      <button type="button" className="phone-intl-link" onClick={() => setIntl(true)}>
        У мене номер іншої країни
      </button>
    </div>
  );
}
