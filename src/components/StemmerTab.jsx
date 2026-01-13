import { useState } from 'react';
import { parse } from '../utils/stemmer';

export function StemmerTab() {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    // Small delay to show spinner for fast parses
    await new Promise(r => setTimeout(r, 100));
    const result = parse(text);
    setParsed(result);
    setParsing(false);
  };

  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportEntries = () => {
    if (!parsed) return;
    downloadFile(JSON.stringify(parsed.entries, null, 2), 'entries.json');
  };

  const handleExportVocab = () => {
    if (!parsed) return;
    downloadFile(JSON.stringify(parsed.vocab, null, 2), 'vocab.json');
  };

  return (
    <div className="stemmer-container">
      <div className="stemmer-header">
        <div className="stemmer-info">
          <h2>Stemmer Lorebook</h2>
          <p className="description">
            TF-IDF semantic search lorebook. Matches lore entries by meaning, not just keywords.
            Best for <strong>dense lore</strong> where topics overlap and exact keyword matching fails.
          </p>
          <p className="description">
            Paste text below. Separate entries with blank lines. Export entries + vocabulary for the runtime script.
          </p>
          <p className="script-link">
            Script: <a href="https://janitorai.com/characters/ca0b9d9c-5e64-47fc-8b2b-ff00121ee66a_character-mairon-aules-apprentice" target="_blank" rel="noopener">Template Bot</a>
          </p>
        </div>
      </div>

      <div className="stemmer-editor">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Entry 1 title
First paragraph of lore content here. This will become one entry in the lorebook.

Entry 2 title
Second entry goes here. Each double-newline separates entries.

Entry 3 title
Third entry content...`}
        />
      </div>

      <div className="stemmer-toolbar">
        <button className="primary" onClick={handleParse} disabled={parsing || !text.trim()}>
          {parsing ? (
            <>
              <span className="spinner" /> Parsing...
            </>
          ) : (
            'Parse Text'
          )}
        </button>

        <button onClick={handleExportEntries} disabled={!parsed}>
          Export Entries
        </button>

        <button onClick={handleExportVocab} disabled={!parsed}>
          Export Vocabulary
        </button>

        {parsed && (
          <div className="stats">
            <strong>{parsed.entries.length}</strong> entries,{' '}
            <strong>{parsed.vocab.length}</strong> vocabulary terms
          </div>
        )}
      </div>
    </div>
  );
}
