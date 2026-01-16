import { useEffect, useRef, useCallback, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

function getStylesheet(isDark) {
  const labelColor = isDark ? '#e0e0e0' : undefined; // undefined uses node-specific colors in light mode
  const textBg = isDark ? '#2f2f2f' : '#fff';
  const selectedBorder = isDark ? '#fff' : '#000';
  const selectedEdge = isDark ? '#fff' : '#000';

  return [
    // Location nodes
    {
      selector: 'node[type="location"]',
      style: {
        'background-color': '#3b82f6',
        'label': 'data(name)',
        'color': labelColor || '#1e40af',
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'font-size': 12,
        'width': 50,
        'height': 50,
        'border-width': 2,
        'border-color': '#1e40af',
      }
    },
    // Character nodes
    {
      selector: 'node[type="character"]',
      style: {
        'background-color': '#22c55e',
        'label': 'data(name)',
        'color': labelColor || '#166534',
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'font-size': 12,
        'width': 50,
        'height': 50,
        'border-width': 2,
        'border-color': '#166534',
      }
    },
    // Event nodes
    {
      selector: 'node[type="event"]',
      style: {
        'background-color': '#f97316',
        'label': 'data(name)',
        'color': labelColor || '#c2410c',
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'font-size': 12,
        'width': 50,
        'height': 50,
        'border-width': 2,
        'border-color': '#c2410c',
      }
    },
    // Sublocation nodes
    {
      selector: 'node[type="sublocation"]',
      style: {
        'background-color': '#818cf8',
        'label': 'data(name)',
        'color': labelColor || '#3730a3',
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'font-size': 10,
        'width': 30,
        'height': 30,
        'border-width': 2,
        'border-color': '#3730a3',
      }
    },
    // Parent nodes (compound)
    {
      selector: ':parent',
      style: {
        'background-opacity': 0.1,
        'border-width': 2,
        'border-color': '#1e40af',
        'padding': 20,
      }
    },
    // Selected nodes
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': selectedBorder,
      }
    },
    // Spawn edges (character/event -> location) - more subtle/transparent
    {
      selector: 'edge[edgeType="spawn"]',
      style: {
        'width': 2,
        'line-color': isDark ? '#6b7280' : '#d1d5db',
        'target-arrow-color': isDark ? '#6b7280' : '#d1d5db',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'line-style': 'dashed',
        'opacity': 0.5,
        'label': 'data(probability)',
        'font-size': 10,
        'color': isDark ? '#9ca3af' : '#6b7280',
        'text-background-color': textBg,
        'text-background-opacity': 0.8,
        'text-background-padding': 2,
      }
    },
    // Adjacent edges (location -- location, undirected)
    {
      selector: 'edge[edgeType="adjacent"]',
      style: {
        'width': 2,
        'line-color': '#60a5fa',
        'curve-style': 'bezier',
      }
    },
    // Knows edges (character -- character, undirected)
    {
      selector: 'edge[edgeType="knows"]',
      style: {
        'width': 2,
        'line-color': '#a855f7',
        'curve-style': 'bezier',
        'label': 'data(relationship)',
        'font-size': 10,
        'color': isDark ? '#e0e0e0' : '#333',
        'text-background-color': textBg,
        'text-background-opacity': 1,
        'text-background-padding': 2,
      }
    },
    // Selected edges
    {
      selector: 'edge:selected',
      style: {
        'width': 3,
        'line-color': selectedEdge,
        'target-arrow-color': selectedEdge,
      }
    },
  ];
}

export function GraphCanvas({ elements, cyRef, onSelect, onAddEdge }) {
  const containerRef = useRef(null);
  const [edgeSource, setEdgeSource] = useState(null);
  const edgeSourceRef = useRef(null);
  const initializedCyRef = useRef(null);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark'
  );

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Update cytoscape stylesheet when theme changes
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.style(getStylesheet(isDark).concat({
        selector: '.edge-source',
        style: {
          'border-width': 4,
          'border-color': '#ef4444',
        }
      }));
    }
  }, [isDark, cyRef]);

  // Keep ref in sync with state
  useEffect(() => {
    edgeSourceRef.current = edgeSource;
  }, [edgeSource]);

  const handleCyInit = useCallback((cy) => {
    // Skip if this is the same cy instance we already initialized
    if (initializedCyRef.current === cy) return;
    initializedCyRef.current = cy;
    cyRef.current = cy;

    // Remove any existing listeners (in case of re-init)
    cy.removeAllListeners();

    cy.on('tap', 'node', (e) => {
      const node = e.target;
      const currentEdgeSource = edgeSourceRef.current;

      // If we have an edge source, create edge
      if (currentEdgeSource && currentEdgeSource !== node.id()) {
        const sourceNode = cy.getElementById(currentEdgeSource);
        const targetNode = node;
        let sourceType = sourceNode.data('type');
        let targetType = targetNode.data('type');

        // Determine edge type based on source/target
        let edgeType = null;
        let edgeData = {};
        let actualSource = currentEdgeSource;
        let actualTarget = node.id();

        // Character/Event → Location = spawn
        if ((sourceType === 'character' || sourceType === 'event') && targetType === 'location') {
          // Check if event is global - global events can't have spawn edges
          if (sourceType === 'event' && sourceNode.data('isGlobal')) {
            alert('Global events cannot have location-specific spawn edges. Uncheck "Global Event" first.');
          } else {
            edgeType = 'spawn';
            edgeData.probability = parseFloat(prompt('Spawn probability (0-1):', '0.1') || '0.1');
          }
        }
        // Location → Character/Event = spawn (flip direction)
        else if (sourceType === 'location' && (targetType === 'character' || targetType === 'event')) {
          // Check if event is global
          if (targetType === 'event' && targetNode.data('isGlobal')) {
            alert('Global events cannot have location-specific spawn edges. Uncheck "Global Event" first.');
          } else {
            edgeType = 'spawn';
            edgeData.probability = parseFloat(prompt('Spawn probability (0-1):', '0.1') || '0.1');
            // Flip: character/event should be source, location should be target
            actualSource = node.id();
            actualTarget = currentEdgeSource;
          }
        }
        // Location ↔ Location = adjacent
        else if (sourceType === 'location' && targetType === 'location') {
          edgeType = 'adjacent';
        }
        // Character ↔ Character = knows
        else if (sourceType === 'character' && targetType === 'character') {
          edgeType = 'knows';
          edgeData.relationship = prompt('Relationship (e.g., "roommates"):', '') || '';
          edgeData.sourceThinks = '';
          edgeData.targetThinks = '';
        }

        if (edgeType) {
          onAddEdge(actualSource, actualTarget, edgeType, edgeData.probability, edgeData);
        } else if (!((sourceType === 'event' && sourceNode.data('isGlobal')) || (targetType === 'event' && targetNode.data('isGlobal')))) {
          alert('Invalid connection. Characters/Events ↔ Locations (spawn). Locations ↔ Locations (adjacent). Characters ↔ Characters (knows).');
        }

        cy.getElementById(currentEdgeSource).removeClass('edge-source');
        setEdgeSource(null);
      } else if (!currentEdgeSource) {
        onSelect(node.data());
      }
    });

    cy.on('tap', 'edge', (e) => {
      if (!edgeSourceRef.current) {
        onSelect(e.target.data());
      }
    });

    cy.on('tap', (e) => {
      if (e.target === cy) {
        onSelect(null);
        const currentEdgeSource = edgeSourceRef.current;
        if (currentEdgeSource) {
          cy.getElementById(currentEdgeSource).removeClass('edge-source');
          setEdgeSource(null);
        }
      }
    });

    // Right-click or long-press to start edge creation
    const startEdgeCreation = (node) => {
      const type = node.data('type');

      // Can only start edges from location, character, or event
      if (type === 'location' || type === 'character' || type === 'event') {
        const currentEdgeSource = edgeSourceRef.current;
        if (currentEdgeSource) {
          cy.getElementById(currentEdgeSource).removeClass('edge-source');
        }
        setEdgeSource(node.id());
        node.addClass('edge-source');
      }
    };

    // Right-click (desktop)
    cy.on('cxttap', 'node', (e) => startEdgeCreation(e.target));

    // Long-press (mobile) - 500ms hold
    cy.on('taphold', 'node', (e) => startEdgeCreation(e.target));
  }, [cyRef, onSelect, onAddEdge]);

  // Add style for edge source
  const fullStylesheet = [
    ...getStylesheet(isDark),
    {
      selector: '.edge-source',
      style: {
        'border-width': 4,
        'border-color': '#ef4444',
      }
    }
  ];

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.3);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() / 1.3);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  return (
    <div className="graph-container" ref={containerRef}>
      <CytoscapeComponent
        elements={elements}
        stylesheet={fullStylesheet}
        style={{ width: '100%', height: '100%' }}
        cy={handleCyInit}
        layout={{ name: 'preset' }}
        boxSelectionEnabled={false}
        autounselectify={false}
      />

      <div className="zoom-controls">
        <button onClick={handleZoomIn} title="Zoom in">+</button>
        <button onClick={handleZoomOut} title="Zoom out">−</button>
        <button onClick={handleFit} title="Fit to screen">⊡</button>
      </div>

      {edgeSource && (
        <div className="edge-mode-hint">
          Click a target node to connect, or click empty space to cancel
        </div>
      )}
    </div>
  );
}
