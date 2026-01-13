// Convert Cytoscape elements to lorebook.json format

// Only return images object if it has non-empty URLs
function cleanImages(images) {
  if (!images) return {};
  const cleaned = {};
  for (const [key, url] of Object.entries(images)) {
    if (url && typeof url === 'string' && url.trim()) {
      cleaned[key] = url.trim();
    }
  }
  return cleaned;
}

export function exportLorebook(elements) {
  const entries = [];

  // Build lookup maps
  const nodes = elements.filter(el => !el.data.source);
  const edges = elements.filter(el => el.data.source);

  const nodeById = {};
  nodes.forEach(n => {
    nodeById[n.data.id] = n.data;
  });

  // Process locations
  nodes.filter(n => n.data.type === 'location').forEach(node => {
    const data = node.data;

    // Find sublocations
    const subLocations = {};
    nodes.filter(n => n.data.type === 'sublocation' && n.data.parent === data.id)
      .forEach(sub => {
        const subImages = cleanImages(sub.data.images);
        subLocations[sub.data.name] = {
          images: subImages,
        };
      });

    // Find adjacent edges (bidirectional - location as source OR target)
    const adjacentAsSource = edges.filter(e =>
      e.data.source === data.id && e.data.edgeType === 'adjacent'
    );
    const adjacentAsTarget = edges.filter(e =>
      e.data.target === data.id && e.data.edgeType === 'adjacent'
    );

    const adjacentTriggers = [
      ...adjacentAsSource.map(e => nodeById[e.data.target]?.keywords?.[0]),
      ...adjacentAsTarget.map(e => nodeById[e.data.source]?.keywords?.[0]),
    ].filter(Boolean);

    // Triggers are auto-generated from edges only
    const allTriggers = [...new Set(adjacentTriggers)];

    const entry = {
      keywords: data.keywords || [],
      category: 'location',
      name: data.name,
      content: data.content || '',
      contentShort: data.contentShort || '',
      triggers: allTriggers,
      images: cleanImages(data.images),
      filters: data.filters || {},
      enabled: true,
    };

    // Only add subLocations if there are any
    if (Object.keys(subLocations).length > 0) {
      entry.subLocations = subLocations;
    }

    entries.push(entry);
  });

  // Collect "knows" edge data for characters
  const knowsEdges = edges.filter(e => e.data.edgeType === 'knows');
  const characterRelationships = {}; // charId -> { triggers: [], contentAppend: '', contentShortAppend: '' }

  knowsEdges.forEach(edge => {
    const sourceId = edge.data.source;
    const targetId = edge.data.target;
    const sourceNode = nodeById[sourceId];
    const targetNode = nodeById[targetId];
    const relationship = edge.data.relationship || '';
    const sourceThinks = edge.data.sourceThinks || '';
    const targetThinks = edge.data.targetThinks || '';

    // Initialize if not exists
    if (!characterRelationships[sourceId]) {
      characterRelationships[sourceId] = { triggers: [], contentAppend: '', contentShortAppend: '' };
    }
    if (!characterRelationships[targetId]) {
      characterRelationships[targetId] = { triggers: [], contentAppend: '', contentShortAppend: '' };
    }

    // Add triggers (each triggers the other via first keyword)
    if (targetNode?.keywords?.[0]) {
      characterRelationships[sourceId].triggers.push(targetNode.keywords[0]);
    }
    if (sourceNode?.keywords?.[0]) {
      characterRelationships[targetId].triggers.push(sourceNode.keywords[0]);
    }

    // Build relationship text for both characters
    if (relationship && targetNode?.keywords?.[0]) {
      const relText = ` ${relationship} with ${targetNode.keywords[0]}.`;
      characterRelationships[sourceId].contentAppend += relText;
      characterRelationships[sourceId].contentShortAppend += relText;
    }
    if (relationship && sourceNode?.keywords?.[0]) {
      const relText = ` ${relationship} with ${sourceNode.keywords[0]}.`;
      characterRelationships[targetId].contentAppend += relText;
      characterRelationships[targetId].contentShortAppend += relText;
    }

    // Add sourceThinks to source's content only
    if (sourceThinks) {
      characterRelationships[sourceId].contentAppend += ` ${sourceThinks}`;
    }

    // Add targetThinks to target's content only
    if (targetThinks) {
      characterRelationships[targetId].contentAppend += ` ${targetThinks}`;
    }
  });

  // Process characters
  nodes.filter(n => n.data.type === 'character').forEach(node => {
    const data = node.data;

    // Find spawn edges (character -> location)
    const spawnEdges = edges.filter(e =>
      e.data.source === data.id && e.data.edgeType === 'spawn'
    );

    const canSpawnAt = {};
    spawnEdges.forEach(e => {
      const target = nodeById[e.data.target];
      if (target?.keywords?.[0]) {
        canSpawnAt[target.keywords[0]] = e.data.probability || 0.1;
      }
    });

    // Get relationship data for this character
    const relData = characterRelationships[data.id] || { triggers: [], contentAppend: '', contentShortAppend: '' };

    // Character triggers locations they can spawn at (for short descriptions)
    const locationTriggers = spawnEdges
      .map(e => nodeById[e.data.target]?.keywords?.[0])
      .filter(Boolean);

    // Triggers are auto-generated: from knows edges + spawn locations
    const allTriggers = [...new Set([...relData.triggers, ...locationTriggers])];

    // Append relationship content if any
    let content = data.content || '';
    let contentShort = data.contentShort || '';
    if (relData.contentAppend && content) {
      // Insert before the closing bracket
      content = content.replace(/\]$/, relData.contentAppend + ']');
    }
    if (relData.contentShortAppend && contentShort) {
      contentShort = contentShort.replace(/\]$/, relData.contentShortAppend + ']');
    }

    entries.push({
      keywords: data.keywords || [],
      category: 'character',
      name: data.name,
      content,
      contentShort,
      triggers: allTriggers,
      canSpawnAt: Object.keys(canSpawnAt).length > 0 ? canSpawnAt : {},
      images: cleanImages(data.images),
      filters: data.filters || {},
      disabledFor: data.disabledFor || [],
      enabled: true,
    });
  });

  // Process events
  nodes.filter(n => n.data.type === 'event').forEach(node => {
    const data = node.data;

    // Find spawn edges (event -> location)
    const spawnEdges = edges.filter(e =>
      e.data.source === data.id && e.data.edgeType === 'spawn'
    );

    const canSpawnAt = {};
    if (data.isGlobal) {
      // Global events can spawn anywhere
      canSpawnAt['any'] = data.globalSpawnChance || 0.1;
    } else {
      // Location-specific spawns
      spawnEdges.forEach(e => {
        const target = nodeById[e.data.target];
        if (target?.keywords?.[0]) {
          canSpawnAt[target.keywords[0]] = e.data.probability || 0.1;
        }
      });
    }

    entries.push({
      keywords: data.keywords || [],
      category: 'event',
      name: data.name || '',
      content: data.content || '',
      contentShort: '',
      triggers: [],
      canSpawnAt,
      timeFilter: data.timeFilter || [],
      images: {},
      filters: data.filters || {},
      disabledFor: [],
      enabled: true,
    });
  });

  return { entries };
}
