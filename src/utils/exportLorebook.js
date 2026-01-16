// Convert Cytoscape elements to lorebook.json format

// Only return images object if it has non-empty URLs
// Supports both single strings and arrays of URLs
function cleanImages(images) {
  if (!images) return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(images)) {
    if (Array.isArray(value)) {
      const cleanedUrls = value.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim());
      if (cleanedUrls.length > 0) {
        cleaned[key] = cleanedUrls;
      }
    } else if (value && typeof value === 'string' && value.trim()) {
      // Single string - wrap in array for consistency
      cleaned[key] = [value.trim()];
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
  // Store as structured data: { charId: { triggers: [], knows: { otherKeyword: { relationship, thoughts } } } }
  const knowsEdges = edges.filter(e => e.data.edgeType === 'knows');
  const characterRelationships = {};

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
      characterRelationships[sourceId] = { triggers: [], knows: {} };
    }
    if (!characterRelationships[targetId]) {
      characterRelationships[targetId] = { triggers: [], knows: {} };
    }

    // Add triggers (each triggers the other via first keyword)
    const sourceKeyword = sourceNode?.keywords?.[0];
    const targetKeyword = targetNode?.keywords?.[0];

    if (targetKeyword) {
      characterRelationships[sourceId].triggers.push(targetKeyword);
      // Source knows about target
      characterRelationships[sourceId].knows[targetKeyword] = {
        relationship: relationship || '',
        thoughts: sourceThinks || '',
      };
    }
    if (sourceKeyword) {
      characterRelationships[targetId].triggers.push(sourceKeyword);
      // Target knows about source
      characterRelationships[targetId].knows[sourceKeyword] = {
        relationship: relationship || '',
        thoughts: targetThinks || '',
      };
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
      // Add sublocation-specific probabilities
      if (e.data.sublocationProbabilities) {
        Object.entries(e.data.sublocationProbabilities).forEach(([subName, prob]) => {
          // Only add if probability is > 0 (0 means "never spawn here")
          if (prob > 0) {
            canSpawnAt[subName] = prob;
          }
        });
      }
    });

    // Get relationship data for this character
    const relData = characterRelationships[data.id] || { triggers: [], knows: {} };

    // Triggers are auto-generated from knows edges only
    const allTriggers = [...new Set(relData.triggers)];

    // Content stays clean - relationships are stored in knows field
    const entry = {
      keywords: data.keywords || [],
      category: 'character',
      name: data.name,
      content: data.content || '',
      contentShort: data.contentShort || '',
      triggers: allTriggers,
      canSpawnAt: Object.keys(canSpawnAt).length > 0 ? canSpawnAt : {},
      images: cleanImages(data.images),
      filters: data.filters || {},
      disabledFor: data.disabledFor || [],
      enabled: true,
    };

    // Add knows field if there are any relationships
    if (Object.keys(relData.knows).length > 0) {
      entry.knows = relData.knows;
    }

    entries.push(entry);
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
        // Add sublocation-specific probabilities
        if (e.data.sublocationProbabilities) {
          Object.entries(e.data.sublocationProbabilities).forEach(([subName, prob]) => {
            if (prob > 0) {
              canSpawnAt[subName] = prob;
            }
          });
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
      images: cleanImages(data.images),
      filters: data.filters || {},
      disabledFor: [],
      enabled: true,
    });
  });

  return entries;
}
