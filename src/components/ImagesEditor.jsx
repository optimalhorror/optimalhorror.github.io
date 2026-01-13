import { useState } from 'react';

const TIME_OPTIONS = [
  'early morning',
  'late morning',
  'midday',
  'early afternoon',
  'late afternoon',
  'evening',
  'night',
  'late night',
];

export function ImagesEditor({ value = {}, onChange }) {
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [newUrl, setNewUrl] = useState('');

  // Separate default from time-based entries
  const defaultUrl = value.default || '';
  const timeEntries = Object.entries(value).filter(([key]) => key !== 'default');

  const handleDefaultChange = (url) => {
    if (url.trim()) {
      onChange({ ...value, default: url.trim() });
    } else {
      const newValue = { ...value };
      delete newValue.default;
      onChange(newValue);
    }
  };

  const handleAddTimeImage = () => {
    if (selectedTimes.length > 0 && newUrl.trim()) {
      const key = selectedTimes.sort((a, b) =>
        TIME_OPTIONS.indexOf(a) - TIME_OPTIONS.indexOf(b)
      ).join(',');
      onChange({ ...value, [key]: newUrl.trim() });
      setSelectedTimes([]);
      setNewUrl('');
    }
  };

  const handleRemove = (key) => {
    const newValue = { ...value };
    delete newValue[key];
    onChange(newValue);
  };

  const handleUpdateUrl = (key, url) => {
    if (url.trim()) {
      onChange({ ...value, [key]: url.trim() });
    }
  };

  const toggleTime = (time) => {
    setSelectedTimes(prev =>
      prev.includes(time)
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  return (
    <div className="images-section">
      {/* Default image - always shown */}
      <div className="image-entry">
        <span className="image-key">default</span>
        <input
          type="text"
          value={defaultUrl}
          onChange={(e) => handleDefaultChange(e.target.value)}
          placeholder="Default image URL..."
        />
      </div>
      <div className="hint">Fallback when no time matches</div>

      {/* Existing time-based entries */}
      {timeEntries.map(([key, url]) => (
        <div key={key} className="image-entry">
          <span className="image-key time-key">{key}</span>
          <input
            type="text"
            value={typeof url === 'string' ? url : JSON.stringify(url)}
            onChange={(e) => handleUpdateUrl(key, e.target.value)}
            placeholder="URL..."
          />
          <button type="button" onClick={() => handleRemove(key)}>×</button>
        </div>
      ))}

      {/* Add new time-based image */}
      <div className="time-image-add">
        <div className="time-picker">
          {TIME_OPTIONS.map(time => (
            <button
              key={time}
              type="button"
              className={`time-chip ${selectedTimes.includes(time) ? 'selected' : ''}`}
              onClick={() => toggleTime(time)}
            >
              {time}
            </button>
          ))}
        </div>
        {selectedTimes.length > 0 && (
          <div className="time-url-row">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Image URL for selected times..."
            />
            <button type="button" className="add-time-btn" onClick={handleAddTimeImage}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}
