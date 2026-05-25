import { useState, useRef, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SearchPanel({ projectId, onOpenFile, files }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/search?projectId=${projectId}&q=${encodeURIComponent(q)}`);
      setResults(data.results);
      setSearched(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 350);
  };

  const handleFileClick = (fileId) => {
    const file = files?.find(f => f._id === fileId);
    if (file && onOpenFile) onOpenFile(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Search input */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Search in files..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
            </span>
          )}
        </div>
        {searched && (
          <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
            {results.length} file{results.length !== 1 ? "s" : ""} matched
          </p>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!searched && !loading && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-xs font-bold text-slate-700">Type to search across all files</p>
          </div>
        )}

        {results.map(result => (
          <div key={result.file._id} className="border-b border-slate-900">
            {/* File header */}
            <button
              onClick={() => handleFileClick(result.file._id)}
              className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800 transition text-left"
            >
              <span className="text-sm">📄</span>
              <span className="text-xs font-mono font-bold text-blue-400 flex-1">{result.file.path}</span>
              <span className="text-[9px] font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                {result.totalMatches} match{result.totalMatches !== 1 ? "es" : ""}
              </span>
            </button>

            {/* Line matches */}
            {result.matches.map((match, i) => (
              <button
                key={i}
                onClick={() => handleFileClick(result.file._id)}
                className="w-full flex items-start gap-3 px-4 py-1.5 hover:bg-slate-800/50 transition text-left"
              >
                <span className="text-[9px] font-mono text-slate-600 w-8 shrink-0 pt-0.5 text-right">
                  {match.lineNumber}
                </span>
                <span className="text-[11px] font-mono text-slate-400 truncate flex-1">
                  {highlightMatch(match.lineContent, query)}
                </span>
              </button>
            ))}
          </div>
        ))}

        {searched && results.length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">😶</p>
            <p className="text-xs font-bold text-slate-700">No results for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

function highlightMatch(line, query) {
  if (!query) return line;
  const idx = line.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return line;
  return (
    <>
      <span className="text-slate-500">{line.slice(0, idx)}</span>
      <span className="bg-yellow-500/30 text-yellow-300 rounded-sm px-0.5">{line.slice(idx, idx + query.length)}</span>
      <span className="text-slate-500">{line.slice(idx + query.length)}</span>
    </>
  );
}
