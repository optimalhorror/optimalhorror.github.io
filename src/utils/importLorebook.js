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
  const entries = json.entries || [];
  nodeCounter = 0;

  // First pass: create all location nodes (we need their IDs for spawn edges)
  const locationMap = {}; // keyword -> node id

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
          _importedTriggers: entry.triggers || [],
        },
        position: pos,
      });

      // Map keywords to this location's ID
      (entry.keywords || []).forEach(kw => {
        locationMap[kw.toLowerCase()] = id;
      });

      // Handle sublocations - position them relative to parent
      if (entry.subLocations) {
        const subEntries = Object.entries(entry.subLocations);
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
        Object.entries(entry.canSpawnAt).forEach(([locKeyword, probability]) => {
          const targetId = locationMap[locKeyword.toLowerCase()];
          if (targetId) {
            elements.push({
              data: {
                id: `edge_${++nodeCounter}`,
                source: id,
                target: targetId,
                edgeType: 'spawn',
                probability,
              },
            });
          }
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
        Object.entries(entry.canSpawnAt).forEach(([locKeyword, probability]) => {
          const targetId = locationMap[locKeyword.toLowerCase()];
          if (targetId) {
            elements.push({
              data: {
                id: `edge_${++nodeCounter}`,
                source: id,
                target: targetId,
                edgeType: 'spawn',
                probability,
              },
            });
          }
        });
      }
    }
  });

  // Third pass: create adjacent edges from location triggers
  // If a location's triggers include another location's keyword, create an adjacent edge
  elements.forEach(el => {
    if (el.data.type === 'location' && el.data._importedTriggers) {
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
