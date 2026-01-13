import { useState } from 'react';

export function TagsInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    if (input.trim() && !value.includes(input.trim())) {
      onChange([...value, input.trim()]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      addTag();
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="tags-input" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
      {value.map((tag, i) => (
        <span key={i} className="tag">
          {tag}
          <button type="button" onClick={() => removeTag(i)}>×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        enterKeyHint="done"
        placeholder={value.length === 0 ? placeholder : ''}
      />
      {input.trim() && (
        <button type="button" className="add-tag-btn" onClick={addTag}>+</button>
      )}
    </div>
  );
}
