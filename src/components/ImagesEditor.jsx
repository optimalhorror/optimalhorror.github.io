import { useState } from 'react';

export function ImagesEditor({ value = {}, onChange }) {
  const [newKey, setNewKey] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const entries = Object.entries(value);

  const handleAdd = () => {
    if (newKey.trim() && newUrl.trim()) {
      onChange({ ...value, [newKey.trim()]: newUrl.trim() });
      setNewKey('');
      setNewUrl('');
    }
  };

  const handleRemove = (key) => {
    const newValue = { ...value };
    delete newValue[key];
    onChange(newValue);
  };

  const handleUpdate = (oldKey, newUrl) => {
    onChange({ ...value, [oldKey]: newUrl });
  };

  return (
    <div className="images-section">
      {entries.map(([key, url]) => (
        <div key={key} className="image-entry">
          <input
            type="text"
            value={key}
            disabled
            style={{ width: 80, background: '#f5f5f5' }}
          />
          <input
            type="text"
            value={typeof url === 'string' ? url : JSON.stringify(url)}
            onChange={(e) => handleUpdate(key, e.target.value)}
            placeholder="URL..."
          />
          <button onClick={() => handleRemove(key)}>×</button>
        </div>
      ))}

      <div className="image-entry">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Key (e.g., default)"
          style={{ width: 80 }}
        />
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Image URL..."
        />
        <button onClick={handleAdd}>+</button>
      </div>

      <div className="hint" style={{ marginTop: 4 }}>
        Keys: "default", "night", "evening,night", etc.
      </div>
    </div>
  );
}
