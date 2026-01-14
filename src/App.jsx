import { useState, useEffect } from 'react';
import { useGraph } from './hooks/useGraph';
import { GraphCanvas } from './components/GraphCanvas';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { StemmerTab } from './components/StemmerTab';
import { importLorebook } from './utils/importLorebook';
import { exportLorebook } from './utils/exportLorebook';
import exampleLorebook from './data/example-lorebook.json';

function App() {
  const graph = useGraph();
  const [activeTab, setActiveTab] = useState('graph');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const elements = importLorebook(json);
        graph.loadElements(elements);
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const json = exportLorebook(graph.elements);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lorebook.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadExample = () => {
    const elements = importLorebook(exampleLorebook);
    graph.loadElements(elements);
  };

  return (
    <div className="app">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Graph
        </button>
        <button
          className={`tab ${activeTab === 'stemmer' ? 'active' : ''}`}
          onClick={() => setActiveTab('stemmer')}
        >
          Stemmer
        </button>
        <div className="toolbar-spacer" />
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? '☾' : '☼'}
        </button>
      </div>

      {activeTab === 'graph' && (
        <>
          <Toolbar
            onAddNode={graph.addNode}
            onImport={handleImport}
            onExport={handleExport}
            onClear={graph.clearGraph}
            onLoadExample={handleLoadExample}
          />
          <div className="main-content">
            <GraphCanvas
              elements={graph.elements}
              cyRef={graph.cyRef}
              onSelect={graph.selectElement}
              onAddEdge={graph.addEdge}
            />
            <PropertyPanel
              selected={graph.selectedElement}
              elements={graph.elements}
              onUpdate={graph.updateElement}
              onDelete={graph.deleteElement}
              onAddSubLocation={graph.addSubLocation}
            />
          </div>
        </>
      )}

      {activeTab === 'stemmer' && (
        <div className="main-content">
          <StemmerTab />
        </div>
      )}
    </div>
  );
}

export default App;
