import { useState, useCallback, useRef } from 'react';

let nodeIdCounter = 1;
let edgeIdCounter = 1;

function generateId(prefix) {
  if (prefix === 'edge') return `edge_${edgeIdCounter++}`;
  return `${prefix}_${nodeIdCounter++}`;
}

export function useGraph() {
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const cyRef = useRef(null);

  const addNode = useCallback((type, position = null) => {
    const pos = position || { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 };

    const baseData = {
      id: generateId(type),
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    };

    let data;
    switch (type) {
      case 'location':
        data = { ...baseData, keywords: [], content: '', contentShort: '', images: {}, triggers: [], filters: {} };
        break;
      case 'character':
        data = { ...baseData, keywords: [], content: '', contentShort: '', images: {}, triggers: [], disabledFor: [], filters: {} };
        break;
      case 'event':
        data = { ...baseData, keywords: [], content: '', timeFilter: [], isGlobal: false, filters: {} };
        break;
      default:
        data = baseData;
    }

    const newNode = { data, position: pos };
    setElements(prev => [...prev, newNode]);
    return data.id;
  }, []);

  const addSubLocation = useCallback((parentId, name) => {
    const data = {
      id: generateId('subloc'),
      type: 'sublocation',
      parent: parentId,
      name: name || 'New Sublocation',
      images: {},
    };

    // Get parent position from cytoscape if available, or find in elements
    let parentPos = { x: 300, y: 300 };
    if (cyRef.current) {
      const parentNode = cyRef.current.getElementById(parentId);
      if (parentNode.length) {
        parentPos = parentNode.position();
      }
    }

    // Count existing sublocations to offset position
    const existingSubs = elements.filter(el => el.data.parent === parentId);
    const offset = existingSubs.length * 50;

    const newNode = {
      data,
      position: { x: parentPos.x + offset, y: parentPos.y + 20 },
    };
    setElements(prev => [...prev, newNode]);
    return data.id;
  }, [cyRef, elements]);

  const addEdge = useCallback((source, target, edgeType, probability = 0.1, extraData = {}) => {
    const data = {
      id: generateId('edge'),
      source,
      target,
      edgeType,
      probability: edgeType === 'spawn' ? probability : undefined,
      // For "knows" edges
      ...(edgeType === 'knows' ? {
        relationship: extraData.relationship || '',
        sourceThinks: extraData.sourceThinks || '',
        targetThinks: extraData.targetThinks || '',
      } : {}),
    };

    const newEdge = { data };
    setElements(prev => [...prev, newEdge]);
    return data.id;
  }, []);

  const updateElement = useCallback((id, updates) => {
    setElements(prev => prev.map(el => {
      if (el.data.id === id) {
        return { ...el, data: { ...el.data, ...updates } };
      }
      return el;
    }));

    if (selectedElement?.id === id) {
      setSelectedElement(prev => ({ ...prev, ...updates }));
    }
  }, [selectedElement]);

  const deleteElement = useCallback((id) => {
    setElements(prev => {
      // Remove the element and any connected edges
      return prev.filter(el => {
        if (el.data.id === id) return false;
        if (el.data.source === id || el.data.target === id) return false;
        // Also remove sublocations if parent is deleted
        if (el.data.parent === id) return false;
        return true;
      });
    });

    if (selectedElement?.id === id) {
      setSelectedElement(null);
    }
  }, [selectedElement]);

  const clearGraph = useCallback(() => {
    setElements([]);
    setSelectedElement(null);
    nodeIdCounter = 1;
    edgeIdCounter = 1;
  }, []);

  const loadElements = useCallback((newElements) => {
    // Find max IDs to continue counting
    let maxNodeId = 0;
    let maxEdgeId = 0;

    newElements.forEach(el => {
      const id = el.data.id;
      if (id.startsWith('edge_')) {
        const num = parseInt(id.split('_')[1], 10);
        if (num > maxEdgeId) maxEdgeId = num;
      } else {
        const parts = id.split('_');
        const num = parseInt(parts[parts.length - 1], 10);
        if (num > maxNodeId) maxNodeId = num;
      }
    });

    nodeIdCounter = maxNodeId + 1;
    edgeIdCounter = maxEdgeId + 1;

    setElements(newElements);
    setSelectedElement(null);
  }, []);

  const selectElement = useCallback((elementData) => {
    setSelectedElement(elementData);
  }, []);

  return {
    elements,
    selectedElement,
    cyRef,
    addNode,
    addSubLocation,
    addEdge,
    updateElement,
    deleteElement,
    clearGraph,
    loadElements,
    selectElement,
  };
}
