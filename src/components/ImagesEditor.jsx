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

// Normalize value to array
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}

// Small clickable image preview
function ImagePreview({ url }) {
  if (!url || !url.trim()) return null;

  const handleClick = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="image-preview" onClick={handleClick} title="Click to open in new tab">
      <img src={url} alt="preview" onError={(e) => e.target.style.display = 'none'} />
    </div>
  );
}

export function ImagesEditor({ value = {}, onChange }) {
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [newUrl, setNewUrl] = useState('');

  // Separate default from time-based entries
  const defaultUrls = toArray(value.default);
  const timeEntries = Object.entries(value).filter(([key]) => key !== 'default');

  const handleDefaultChange = (urls) => {
    if (urls.length > 0) {
      // Store as array for consistency
      onChange({ ...value, default: urls });
    } else {
      const newValue = { ...value };
      delete newValue.default;
      onChange(newValue);
    }
  };

  const handleAddDefaultUrl = (url) => {
    if (url.trim()) {
      handleDefaultChange([...defaultUrls, url.trim()]);
    }
  };

  const handleRemoveDefaultUrl = (index) => {
    const newUrls = defaultUrls.filter((_, i) => i !== index);
    handleDefaultChange(newUrls);
  };

  const handleUpdateDefaultUrl = (index, url) => {
    const newUrls = [...defaultUrls];
    if (url.trim()) {
      newUrls[index] = url.trim();
      handleDefaultChange(newUrls);
    }
  };

  const handleAddTimeImage = () => {
    if (selectedTimes.length > 0 && newUrl.trim()) {
      const key = selectedTimes.sort((a, b) =>
        TIME_OPTIONS.indexOf(a) - TIME_OPTIONS.indexOf(b)
      ).join(',');
      const existingUrls = toArray(value[key]);
      onChange({ ...value, [key]: [...existingUrls, newUrl.trim()] });
      setNewUrl('');
    }
  };

  const handleRemove = (key) => {
    const newValue = { ...value };
    delete newValue[key];
    onChange(newValue);
  };

  const handleRemoveTimeUrl = (key, index) => {
    const urls = toArray(value[key]);
    const newUrls = urls.filter((_, i) => i !== index);
    if (newUrls.length > 0) {
      onChange({ ...value, [key]: newUrls });
    } else {
      const newValue = { ...value };
      delete newValue[key];
      onChange(newValue);
    }
  };

  const handleUpdateTimeUrl = (key, index, url) => {
    const urls = toArray(value[key]);
    if (url.trim()) {
      const newUrls = [...urls];
      newUrls[index] = url.trim();
      onChange({ ...value, [key]: newUrls });
    }
  };

  const handleAddUrlToTimeKey = (key, url) => {
    if (url.trim()) {
      const existingUrls = toArray(value[key]);
      onChange({ ...value, [key]: [...existingUrls, url.trim()] });
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
      {/* Default images */}
      <div className="image-group">
        <span className="image-key">default</span>
        {defaultUrls.map((url, index) => (
          <div key={index} className="image-entry-with-preview">
            <div className="image-entry">
              <input
                type="text"
                value={url}
                onChange={(e) => handleUpdateDefaultUrl(index, e.target.value)}
                placeholder="Image URL..."
              />
              <button type="button" onClick={() => handleRemoveDefaultUrl(index)}>×</button>
            </div>
            <ImagePreview url={url} />
          </div>
        ))}
        <div className="image-entry add-url-row">
          <input
            type="text"
            placeholder="Add default image URL..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                handleAddDefaultUrl(e.target.value);
                e.target.value = '';
              }
            }}
          />
          <button type="button" onClick={(e) => {
            const input = e.target.previousElementSibling;
            if (input.value.trim()) {
              handleAddDefaultUrl(input.value);
              input.value = '';
            }
          }}>+</button>
        </div>
      </div>
      <div className="hint">Fallback when no time matches. Multiple = random pick.</div>

      {/* Existing time-based entries */}
      {timeEntries.map(([key, urls]) => {
        const urlArray = toArray(urls);
        return (
          <div key={key} className="image-group">
            <div className="image-group-header">
              <span className="image-key time-key">{key}</span>
              <button type="button" className="remove-group-btn" onClick={() => handleRemove(key)}>Remove all</button>
            </div>
            {urlArray.map((url, index) => (
              <div key={index} className="image-entry-with-preview">
                <div className="image-entry">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUpdateTimeUrl(key, index, e.target.value)}
                    placeholder="URL..."
                  />
                  <button type="button" onClick={() => handleRemoveTimeUrl(key, index)}>×</button>
                </div>
                <ImagePreview url={url} />
              </div>
            ))}
            <div className="image-entry add-url-row">
              <input
                type="text"
                placeholder="Add another URL..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleAddUrlToTimeKey(key, e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button type="button" onClick={(e) => {
                const input = e.target.previousElementSibling;
                if (input.value.trim()) {
                  handleAddUrlToTimeKey(key, input.value);
                  input.value = '';
                }
              }}>+</button>
            </div>
          </div>
        );
      })}

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
