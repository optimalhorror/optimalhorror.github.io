import { useEffect, useRef, useCallback, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

const stylesheet = [
  // Location nodes
  {
    selector: 'node[type="location"]',
    style: {
      'background-color': '#3b82f6',
      'label': 'data(name)',
      'color': '#1e40af',
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
      'color': '#166534',
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
      'color': '#c2410c',
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
      'color': '#3730a3',
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
      'border-color': '#000',
    }
  },
  // Spawn edges (character/event -> location)
  {
    selector: 'edge[edgeType="spawn"]',
    style: {
      'width': 2,
      'line-color': '#9ca3af',
      'target-arrow-color': '#9ca3af',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'line-style': 'dashed',
      'label': 'data(probability)',
      'font-size': 10,
      'text-background-color': '#fff',
      'text-background-opacity': 1,
      'text-background-padding': 2,
    }
  },
  // Adjacent edges (location -> location)
  {
    selector: 'edge[edgeType="adjacent"]',
    style: {
      'width': 2,
      'line-color': '#60a5fa',
      'target-arrow-color': '#60a5fa',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
    }
  },
  // Knows edges (character <-> character)
  {
    selector: 'edge[edgeType="knows"]',
    style: {
      'width': 2,
      'line-color': '#a855f7',
      'target-arrow-color': '#a855f7',
      'target-arrow-shape': 'triangle',
      'source-arrow-color': '#a855f7',
      'source-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(relationship)',
      'font-size': 10,
      'text-background-color': '#fff',
      'text-background-opacity': 1,
      'text-background-padding': 2,
    }
  },
  // Selected edges
  {
    selector: 'edge:selected',
    style: {
      'width': 3,
      'line-color': '#000',
      'target-arrow-color': '#000',
    }
  },
];

export function GraphCanvas({ elements, cyRef, onSelect, onAddEdge }) {
  const containerRef = useRef(null);
  const [edgeSource, setEdgeSource] = useState(null);
  const edgeSourceRef = useRef(null);
  const initializedCyRef = useRef(null);

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
        const sourceType = cy.getElementById(currentEdgeSource).data('type');
        const targetType = node.data('type');

        // Determine edge type based on source/target
        let edgeType = null;
        let edgeData = {};

        if ((sourceType === 'character' || sourceType === 'event') && targetType === 'location') {
          edgeType = 'spawn';
          edgeData.probability = parseFloat(prompt('Spawn probability (0-1):', '0.1') || '0.1');
        } else if (sourceType === 'location' && targetType === 'location') {
          edgeType = 'adjacent';
        } else if (sourceType === 'character' && targetType === 'character') {
          edgeType = 'knows';
          edgeData.relationship = prompt('Relationship (e.g., "roommates"):', '') || '';
          edgeData.sourceThinks = '';
          edgeData.targetThinks = '';
        }

        if (edgeType) {
          onAddEdge(currentEdgeSource, node.id(), edgeType, edgeData.probability, edgeData);
        } else {
          alert('Invalid connection. Characters/Events can connect to Locations. Locations can connect to Locations. Characters can connect to Characters (knows).');
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

    // Right-click to start edge creation
    cy.on('cxttap', 'node', (e) => {
      const node = e.target;
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
    });
  }, [cyRef, onSelect, onAddEdge]);

  // Add style for edge source
  const fullStylesheet = [
    ...stylesheet,
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
