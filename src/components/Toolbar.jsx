import { useRef } from 'react';

export function Toolbar({ onAddNode, onImport, onExport, onClear, onLoadExample }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={() => onAddNode('location')}>+ Location</button>
        <button onClick={() => onAddNode('character')}>+ Character</button>
        <button onClick={() => onAddNode('event')}>+ Event</button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button onClick={() => fileInputRef.current?.click()}>Import</button>
        <button onClick={onLoadExample} className="secondary">Load Example</button>
        <button onClick={onExport} className="primary">Export</button>
      </div>

      <div className="toolbar-separator" />

      <button onClick={() => {
        if (confirm('Clear all nodes and edges?')) {
          onClear();
        }
      }}>Clear</button>

      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
      />

      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
        Right-click or long-press node to start edge, then click target
      </div>
    </div>
  );
}
