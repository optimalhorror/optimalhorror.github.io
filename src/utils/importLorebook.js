// Convert lorebook.json to Cytoscape elements

let nodeCounter = 0;

function generatePosition(index, total) {
  // Arrange nodes in a grid
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  return {
    x: 150 + col * 200,
    y: 150 + row * 180,
  };
}

export function importLorebook(json) {
  const elements = [];
  // Support both array format [...] and object format { entries: [...] }
  let entries;
  if (Array.isArray(json)) {
    entries = json;
  } else if (json && typeof json === 'object' && Array.isArray(json.entries)) {
    entries = json.entries;
  } else {
    console.error('Invalid lorebook format:', json);
    return [];
  }
  nodeCounter = 0;

  // First pass: create all location nodes (we need their IDs for spawn edges)
  const locationMap = {}; // keyword -> node id
  const sublocationMap = {}; // sublocation name -> { parentId, parentKeyword }

  entries.forEach((entry, index) => {
    if (entry.category === 'location') {
      const id = `loc_${++nodeCounter}`;
      const pos = generatePosition(index, entries.length);

      elements.push({
        data: {
          id,
          type: 'location',
          name: entry.name,
          keywords: entry.keywords || [],
          content: entry.content || '',
          contentShort: entry.contentShort || '',
          images: entry.images || {},
          filters: entry.filters || {},
          // triggers stored temporarily for edge reconstruction
          _importedTriggers: Array.isArray(entry.triggers) ? entry.triggers : [],
        },
        position: pos,
      });

      // Map keywords to this location's ID
      const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
      keywords.forEach(kw => {
        if (typeof kw === 'string') {
          locationMap[kw.toLowerCase()] = id;
        }
      });

      // Handle sublocations - position them relative to parent
      if (entry.subLocations) {
        const subEntries = Object.entries(entry.subLocations);
        const firstKeyword = keywords[0];
        subEntries.forEach(([subName, subData], subIndex) => {
          const subId = `subloc_${++nodeCounter}`;
          // Position sublocations in a row below the parent center
          const subX = pos.x + (subIndex - (subEntries.length - 1) / 2) * 50;
          const subY = pos.y + 20;
          elements.push({
            data: {
              id: subId,
              type: 'sublocation',
              parent: id,
              name: subName,
              images: subData.images || {},
            },
            position: { x: subX, y: subY },
          });
          // Map sublocation name to parent location info (store original name for export)
          sublocationMap[subName.toLowerCase()] = { parentId: id, parentKeyword: firstKeyword, originalName: subName };
        });
      }
    }
  });

  // Second pass: create character and event nodes, and their spawn edges
  entries.forEach((entry, index) => {
    if (entry.category === 'character') {
      const id = `char_${++nodeCounter}`;
      const pos = generatePosition(index, entries.length);

      elements.push({
        data: {
          id,
          type: 'character',
          name: entry.name,
          keywords: entry.keywords || [],
          content: entry.content || '',
          contentShort: entry.contentShort || '',
          images: entry.images || {},
          disabledFor: entry.disabledFor || [],
          filters: entry.filters || {},
        },
        position: pos,
      });

      // Create spawn edges from canSpawnAt
      if (entry.canSpawnAt) {
        // Group by location - main locations and their sublocations
        const locationSpawns = {}; // locationId -> { probability, sublocationProbabilities }

        Object.entries(entry.canSpawnAt).forEach(([key, probability]) => {
          const keyLower = key.toLowerCase();

          // Check if this is a location keyword
          const locId = locationMap[keyLower];
          if (locId) {
            if (!locationSpawns[locId]) {
              locationSpawns[locId] = { probability, sublocationProbabilities: {} };
            } else {
              locationSpawns[locId].probability = probability;
            }
          } else {
            // Check if this is a sublocation name
            const subInfo = sublocationMap[keyLower];
            if (subInfo) {
              if (!locationSpawns[subInfo.parentId]) {
                locationSpawns[subInfo.parentId] = { probability: 0.1, sublocationProbabilities: {} };
              }
              // Use the original case name from the sublocation
              locationSpawns[subInfo.parentId].sublocationProbabilities[subInfo.originalName] = probability;
            }
          }
        });

        // Create edges for each location
        Object.entries(locationSpawns).forEach(([targetId, spawnData]) => {
          elements.push({
            data: {
              id: `edge_${++nodeCounter}`,
              source: id,
              target: targetId,
              edgeType: 'spawn',
              probability: spawnData.probability,
              sublocationProbabilities: Object.keys(spawnData.sublocationProbabilities).length > 0
                ? spawnData.sublocationProbabilities
                : undefined,
            },
          });
        });
      }
    }

    if (entry.category === 'event') {
      const id = `event_${++nodeCounter}`;
      const pos = generatePosition(index, entries.length);

      // Check if this is a global event (has "any" key in canSpawnAt)
      const isGlobal = entry.canSpawnAt && 'any' in entry.canSpawnAt;
      const globalSpawnChance = isGlobal ? entry.canSpawnAt['any'] : 0.1;

      elements.push({
        data: {
          id,
          type: 'event',
          name: entry.name || 'Unnamed Event',
          keywords: entry.keywords || [],
          content: entry.content || '',
          timeFilter: entry.timeFilter || [],
          isGlobal,
          globalSpawnChance,
          filters: entry.filters || {},
        },
        position: pos,
      });

      // Create spawn edges from canSpawnAt (only for non-global, non-"any" entries)
      if (entry.canSpawnAt && !isGlobal) {
        // Group by location - main locations and their sublocations
        const locationSpawns = {}; // locationId -> { probability, sublocationProbabilities }

        Object.entries(entry.canSpawnAt).forEach(([key, probability]) => {
          const keyLower = key.toLowerCase();

          // Check if this is a location keyword
          const locId = locationMap[keyLower];
          if (locId) {
            if (!locationSpawns[locId]) {
              locationSpawns[locId] = { probability, sublocationProbabilities: {} };
            } else {
              locationSpawns[locId].probability = probability;
            }
          } else {
            // Check if this is a sublocation name
            const subInfo = sublocationMap[keyLower];
            if (subInfo) {
              if (!locationSpawns[subInfo.parentId]) {
                locationSpawns[subInfo.parentId] = { probability: 0.1, sublocationProbabilities: {} };
              }
              // Use the original case name from the sublocation
              locationSpawns[subInfo.parentId].sublocationProbabilities[subInfo.originalName] = probability;
            }
          }
        });

        // Create edges for each location
        Object.entries(locationSpawns).forEach(([targetId, spawnData]) => {
          elements.push({
            data: {
              id: `edge_${++nodeCounter}`,
              source: id,
              target: targetId,
              edgeType: 'spawn',
              probability: spawnData.probability,
              sublocationProbabilities: Object.keys(spawnData.sublocationProbabilities).length > 0
                ? spawnData.sublocationProbabilities
                : undefined,
            },
          });
        });
      }
    }
  });

  // Third pass: create adjacent edges from location triggers
  // If a location's triggers include another location's keyword, create an adjacent edge
  elements.forEach(el => {
    if (el.data.type === 'location' && Array.isArray(el.data._importedTriggers)) {
      el.data._importedTriggers.forEach(trigger => {
        const targetId = locationMap[trigger.toLowerCase()];
        if (targetId && targetId !== el.data.id) {
          // Check if this edge already exists
          const exists = elements.some(e =>
            e.data.source === el.data.id &&
            e.data.target === targetId &&
            e.data.edgeType === 'adjacent'
          );

          if (!exists) {
            elements.push({
              data: {
                id: `edge_${++nodeCounter}`,
                source: el.data.id,
                target: targetId,
                edgeType: 'adjacent',
              },
            });
          }
        }
      });
      // Clean up temporary field
      delete el.data._importedTriggers;
    }
  });

  return elements;
}
