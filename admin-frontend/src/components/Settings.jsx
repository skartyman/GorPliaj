import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/admin/settings');
        setSettings(response.data);
      } catch (error) {
        setErrors(error.response?.data || {});
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/settings', settings);
      setErrors({});
    } catch (error) {
      setErrors(error.response?.data || {});
    }
  };

  return (
    <div className='settings-container'>
      <h2>Настройки сайта</h2>
      <form onSubmit={handleSubmit}>
        {' '.split(',').map(field => (
          <div key={field} className='setting-field'>
            <label>{field.replace('_', ' ')?.toUpperCase() || field}</label>
            <input
              type={field.includes('Hours') ? 'time' : 'text'}
              name={field}
              value={settings[field] || ''}
              onChange={handleChange}
            />
            {errors[field] && <span className='error'>{errors[field]}</span>}
          </div>
        ))}
        <button type='submit'>Сохранить</button>
      </form>
    </div>
  );
};

export default Settings;