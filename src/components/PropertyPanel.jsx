import { useState, useEffect } from 'react';
import { TagsInput } from './TagsInput';
import { ImagesEditor } from './ImagesEditor';
import { parseContent, formatContent } from '../utils/contentFormat';

export function PropertyPanel({ selected, elements, onUpdate, onDelete, onAddSubLocation }) {
  const [formData, setFormData] = useState({});
  // Store the "inner" content separately for editing (without Name=[...] wrapper)
  const [innerContent, setInnerContent] = useState('');
  const [innerContentShort, setInnerContentShort] = useState('');

  useEffect(() => {
    if (selected) {
      setFormData({ ...selected });
      // Parse the content to get inner part for editing
      setInnerContent(parseContent(selected.content, selected.name, selected.type));
      setInnerContentShort(parseContent(selected.contentShort, selected.name, selected.type));
    } else {
      setFormData({});
      setInnerContent('');
      setInnerContentShort('');
    }
  }, [selected]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onUpdate(selected.id, { [field]: value });
  };

  const handleContentChange = (innerValue) => {
    setInnerContent(innerValue);
    const formatted = formatContent(innerValue, formData.name || selected.name, selected.type);
    onUpdate(selected.id, { content: formatted });
  };

  const handleContentShortChange = (innerValue) => {
    setInnerContentShort(innerValue);
    const formatted = formatContent(innerValue, formData.name || selected.name, selected.type);
    onUpdate(selected.id, { contentShort: formatted });
  };

  const handleNameChange = (newName) => {
    setFormData(prev => ({ ...prev, name: newName }));
    // Re-format both content fields with new name (for events, name doesn't affect format)
    const updates = { name: newName };
    if (innerContent) {
      updates.content = formatContent(innerContent, newName, selected.type);
    }
    if (innerContentShort) {
      updates.contentShort = formatContent(innerContentShort, newName, selected.type);
    }
    onUpdate(selected.id, updates);
  };

  if (!selected) {
    return (
      <div className="property-panel">
        <h3>Properties</h3>
        <p className="empty">Select a node or edge to edit</p>
        <p className="hint-text">
          Tap nodes to select. Long-press (or right-click) a node to start creating an edge, then tap the target.
        </p>

        <div className="info-section">
          <h4>About Graph Lorebook</h4>
          <p>
            Keyword-based lorebook with location graphs, character spawn chances, and dynamic events.
            Best for <strong>spatial narratives</strong> where characters move between locations.
          </p>
          <ul>
            <li><strong>Locations</strong> — Places with triggers to load related content</li>
            <li><strong>Characters</strong> — NPCs with spawn probabilities per location</li>
            <li><strong>Events</strong> — Time-filtered or global occurrences</li>
          </ul>
          <p className="script-link">
            Script: <a href="https://janitorai.com/characters/969e2b4a-037c-4242-aa25-55ccacd45785_character-running-1st-year" target="_blank" rel="noopener">Template Bot</a>
          </p>
        </div>
      </div>
    );
  }

  // Edge selected
  if (selected.source && selected.target) {
    const sourceNode = elements.find(el => el.data.id === selected.source)?.data;
    const targetNode = elements.find(el => el.data.id === selected.target)?.data;

    // Build edge description based on type
    const getEdgeDescription = () => {
      const srcName = sourceNode?.name || selected.source;
      const tgtName = targetNode?.name || selected.target;

      switch (selected.edgeType) {
        case 'adjacent':
          return `${srcName} is connected to ${tgtName}`;
        case 'spawn':
          if (sourceNode?.type === 'character') {
            return `${srcName} shows up in ${tgtName}`;
          } else {
            return `${srcName} occurs in ${tgtName}`;
          }
        case 'knows':
          return `${srcName} and ${tgtName} are ${formData.relationship || '...'}`;
        default:
          return `${srcName} → ${tgtName}`;
      }
    };

    return (
      <div className="property-panel">
        <h3>Edge Properties</h3>
        <span className={`node-type-badge ${selected.edgeType === 'knows' ? 'knows' : 'edge'}`}>{selected.edgeType}</span>

        <div className="edge-info">
          <div>{getEdgeDescription()}</div>
        </div>

        {selected.edgeType === 'spawn' && (
          <SpawnProbabilityEditor
            formData={formData}
            targetNode={targetNode}
            elements={elements}
            onUpdate={(updates) => {
              Object.entries(updates).forEach(([key, value]) => {
                handleChange(key, value);
              });
            }}
          />
        )}

        {selected.edgeType === 'knows' && (
          <>
            <div className="form-group">
              <label>Relationship</label>
              <input
                type="text"
                value={formData.relationship || ''}
                onChange={(e) => handleChange('relationship', e.target.value)}
                placeholder="e.g., roommates, siblings, rivals"
              />
              <div className="hint">Goes to both characters' descriptions</div>
            </div>

            <div className="form-group">
              <label>What {sourceNode?.name || 'Source'} thinks about {targetNode?.name || 'Target'}</label>
              <textarea
                value={formData.sourceThinks || ''}
                onChange={(e) => handleChange('sourceThinks', e.target.value)}
                placeholder={`${sourceNode?.name || 'Source'}'s thoughts about ${targetNode?.name || 'Target'}...`}
              />
              <div className="hint">Goes to {sourceNode?.name || 'source'}'s description only</div>
            </div>

            <div className="form-group">
              <label>What {targetNode?.name || 'Target'} thinks about {sourceNode?.name || 'Source'}</label>
              <textarea
                value={formData.targetThinks || ''}
                onChange={(e) => handleChange('targetThinks', e.target.value)}
                placeholder={`${targetNode?.name || 'Target'}'s thoughts about ${sourceNode?.name || 'Source'}...`}
              />
              <div className="hint">Goes to {targetNode?.name || 'target'}'s description only</div>
            </div>
          </>
        )}

        <button className="delete-btn" onClick={() => onDelete(selected.id)}>
          Delete Edge
        </button>
      </div>
    );
  }

  // Node selected
  const { type } = selected;

  return (
    <div className="property-panel">
      <h3>Node Properties</h3>
      <span className={`node-type-badge ${type}`}>{type}</span>

      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      {(type === 'location' || type === 'character') && (
        <div className="form-group">
          <label>Keywords</label>
          <TagsInput
            value={formData.keywords || []}
            onChange={(keywords) => handleChange('keywords', keywords)}
            placeholder="Add keyword..."
          />
          <div className="hint">Press Enter or tap + to add</div>
        </div>
      )}

      {(type === 'location' || type === 'character') && (
        <>
          <div className="form-group">
            <label>Content (Full)</label>
            <textarea
              value={innerContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Full description..."
            />
            <div className="hint">Saved as: {formData.name}=[your content]</div>
          </div>

          <div className="form-group">
            <label>Content (Short)</label>
            <textarea
              value={innerContentShort}
              onChange={(e) => handleContentShortChange(e.target.value)}
              placeholder="Short description..."
            />
            <div className="hint">Triggered by connected nodes</div>
          </div>

          <div className="form-group">
            <label>Requires Any (Filter)</label>
            <TagsInput
              value={formData.filters?.requiresAny || []}
              onChange={(requiresAny) => handleChange('filters', { ...formData.filters, requiresAny })}
              placeholder="e.g., forest, cave..."
            />
            <div className="hint">Keyword must match AND any of these words must appear</div>
          </div>
        </>
      )}

      {type === 'event' && (
        <>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={innerContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Event description..."
            />
            <div className="hint">Saved as: Current event=[your content]</div>
          </div>

          <div className="form-group">
            <label>Time Filter</label>
            <TagsInput
              value={formData.timeFilter || []}
              onChange={(timeFilter) => handleChange('timeFilter', timeFilter)}
              placeholder="e.g., evening, night..."
            />
          </div>

          <div className="form-group">
            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={formData.isGlobal || false}
                onChange={(e) => handleChange('isGlobal', e.target.checked)}
              />
              Global Event (can happen anywhere)
            </label>
          </div>

          {formData.isGlobal && (
            <div className="form-group">
              <label>Global Spawn Probability</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={formData.globalSpawnChance || 0.1}
                onChange={(e) => handleChange('globalSpawnChance', parseFloat(e.target.value))}
              />
              <div className="hint">0-1, e.g., 0.12 = 12% chance at any location</div>
            </div>
          )}
        </>
      )}

      {type === 'character' && (
        <div className="form-group">
          <label>Disabled For</label>
          <TagsInput
            value={formData.disabledFor || []}
            onChange={(disabledFor) => handleChange('disabledFor', disabledFor)}
            placeholder="Bot names to exclude..."
          />
        </div>
      )}

      {(type === 'location' || type === 'character' || type === 'sublocation') && (
        <div className="form-group">
          <label>Images</label>
          <ImagesEditor
            value={formData.images || {}}
            onChange={(images) => handleChange('images', images)}
          />
        </div>
      )}

      {type === 'location' && (
        <div className="form-group">
          <label>Sublocations</label>
          <SublocationsDisplay
            parentId={selected.id}
            elements={elements}
            onAddSubLocation={onAddSubLocation}
            onDelete={onDelete}
          />
        </div>
      )}

      <button className="delete-btn" onClick={() => onDelete(selected.id)}>
        Delete {type.charAt(0).toUpperCase() + type.slice(1)}
      </button>
    </div>
  );
}

function SpawnProbabilityEditor({ formData, targetNode, elements, onUpdate }) {
  // Find sublocations of the target location
  const sublocations = targetNode?.type === 'location'
    ? elements
        .filter(el => el.data.type === 'sublocation' && el.data.parent === targetNode.id)
        .map(el => el.data)
    : [];

  const handleMainProbChange = (value) => {
    onUpdate({ probability: value });
  };

  const handleSublocationProbChange = (subName, value) => {
    const currentProbs = formData.sublocationProbabilities || {};
    onUpdate({
      sublocationProbabilities: {
        ...currentProbs,
        [subName]: value,
      },
    });
  };

  return (
    <>
      <div className="form-group">
        <label>Spawn Probability ({targetNode?.name || 'Location'})</label>
        <input
          type="number"
          min="0"
          max="1"
          step="0.05"
          value={formData.probability || 0.1}
          onChange={(e) => handleMainProbChange(parseFloat(e.target.value))}
        />
        <div className="hint">0-1, e.g., 0.25 = 25% chance</div>
      </div>

      {sublocations.length > 0 && (
        <div className="form-group">
          <label>Sublocation Probabilities</label>
          <div className="sublocation-probs">
            {sublocations.map(sub => {
              const prob = formData.sublocationProbabilities?.[sub.name];
              const isEnabled = prob !== undefined && prob !== null;
              const displayProb = isEnabled ? prob : formData.probability || 0.1;

              return (
                <div key={sub.id} className="subloc-prob-row">
                  <label className="checkbox-group">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSublocationProbChange(sub.name, formData.probability || 0.1);
                        } else {
                          // Remove from sublocationProbabilities
                          const currentProbs = { ...formData.sublocationProbabilities };
                          delete currentProbs[sub.name];
                          onUpdate({ sublocationProbabilities: currentProbs });
                        }
                      }}
                    />
                    {sub.name}
                  </label>
                  {isEnabled && (
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={displayProb}
                      onChange={(e) => handleSublocationProbChange(sub.name, parseFloat(e.target.value))}
                      className="subloc-prob-input"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="hint">Check to set different probability per sublocation (0 = never spawns there)</div>
        </div>
      )}
    </>
  );
}

function SublocationsDisplay({ parentId, elements, onAddSubLocation, onDelete }) {
  const sublocations = elements
    .filter(el => el.data.type === 'sublocation' && el.data.parent === parentId)
    .map(el => el.data);

  return (
    <div>
      {sublocations.map(sub => (
        <div key={sub.id} className="sublocation-item">
          <div className="header">
            <span className="name">{sub.name}</span>
            <button onClick={() => onDelete(sub.id)}>×</button>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={() => {
        const name = prompt('Sublocation name:');
        if (name) onAddSubLocation(parentId, name);
      }}>
        + Add Sublocation
      </button>
    </div>
  );
}
