import { useState, useEffect } from 'react';
import { Search, Copy, Check, AlertCircle, Wand2 } from 'lucide-react';

function generatePaths(obj: unknown, prefix = '', depth = 0): { path: string; desc: string }[] {
  if (depth > 3) return [];
  const paths: { path: string; desc: string }[] = [];

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      paths.push({ path: `${prefix}[0]`, desc: 'First element' });
      if (typeof obj[0] === 'object' && obj[0] !== null && !Array.isArray(obj[0])) {
        for (const subKey of Object.keys(obj[0] as object).slice(0, 3)) {
          paths.push({ path: `${prefix}[*].${subKey}`, desc: `All "${subKey}" values` });
        }
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        paths.push({ path, desc: `Array (${value.length} items)` });
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
          for (const subKey of Object.keys(value[0] as object).slice(0, 3)) {
            paths.push({ path: `${path}[*].${subKey}`, desc: `All "${subKey}" from array` });
          }
        } else if (value.length > 0) {
          paths.push({ path: `${path}[0]`, desc: 'First item' });
        }
      } else if (typeof value === 'object' && value !== null) {
        paths.push({ path, desc: 'Object' });
        paths.push(...generatePaths(value, path, depth + 1));
      } else {
        const preview = String(value).substring(0, 30);
        paths.push({ path, desc: `→ ${preview}` });
      }
    }
  }

  return paths;
}

export default function JsonPathTool() {
  const [jsonInput, setJsonInput] = useState('{\n  "user": {\n    "name": "John Doe",\n    "age": 30,\n    "email": "john@example.com",\n    "address": {\n      "city": "New York",\n      "country": "USA"\n    },\n    "hobbies": ["reading", "gaming", "coding"]\n  },\n  "data": {\n    "records": [\n      {"id": 1, "name": "Alice"},\n      {"id": 2, "name": "Bob"},\n      {"id": 3, "name": "Charlie"}\n    ]\n  }\n}');
  const [jsonPath, setJsonPath] = useState('user.name');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [examplePaths, setExamplePaths] = useState<{ path: string; desc: string }[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      setExamplePaths(generatePaths(parsed).slice(0, 12));
    } catch {
      setExamplePaths([]);
    }
  }, [jsonInput]);

  const handleBeautify = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch {
      setError('Invalid JSON — cannot beautify');
    }
  };

  const evaluateJsonPath = () => {
    try {
      setError('');
      const parsedJson = JSON.parse(jsonInput);

      const pathParts = jsonPath.split('.').filter(p => p.length > 0);

      let current = parsedJson;
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];

        // Standalone [*] — root or chained array wildcard (e.g. "[*].id")
        if (part.match(/^\[\*\]$/)) {
          if (!Array.isArray(current)) throw new Error('Current value is not an array');
          if (i < pathParts.length - 1) {
            const remainingPath = pathParts.slice(i + 1);
            current = current.map(item => {
              let temp = item;
              for (const remainingPart of remainingPath) {
                if (temp === undefined) return undefined;
                temp = temp[remainingPart];
              }
              return temp;
            }).filter(item => item !== undefined);
            break;
          }
          break;
        }

        // Standalone [N] — root or chained array index (e.g. "[0].name")
        const standaloneIndex = part.match(/^\[(\d+)\]$/);
        if (standaloneIndex) {
          if (!Array.isArray(current)) throw new Error('Current value is not an array');
          current = current[parseInt(standaloneIndex[1])];
          if (current === undefined) throw new Error(`Index ${standaloneIndex[1]} out of bounds`);
          continue;
        }

        // key[*] — wildcard after a named key (e.g. "records[*]")
        const wildcardMatch = part.match(/^(\w+)\[\*\]$/);
        if (wildcardMatch) {
          const [, key] = wildcardMatch;
          current = current[key];
          if (current === undefined) throw new Error(`Property "${key}" not found`);
          if (!Array.isArray(current)) throw new Error(`Property "${key}" is not an array`);

          if (i < pathParts.length - 1) {
            const remainingPath = pathParts.slice(i + 1);
            current = current.map(item => {
              let temp = item;
              for (const remainingPart of remainingPath) {
                if (temp === undefined) return undefined;
                temp = temp[remainingPart];
              }
              return temp;
            }).filter(item => item !== undefined);
            break;
          }
          break;
        }

        // key[N] — named key with index (e.g. "hobbies[0]")
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, key, index] = arrayMatch;
          current = current[key];
          if (current === undefined) throw new Error(`Property "${key}" not found`);
          current = current[parseInt(index)];
          if (current === undefined) throw new Error(`Index ${index} out of bounds`);
        } else {
          current = current[part];
          if (current === undefined) throw new Error(`Property "${part}" not found in path`);
        }
      }

      setResult(JSON.stringify(current, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResult('');
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JSON Path Query Tool</h1>
          <p className="text-purple-200">Extract values from JSON using path expressions</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">JSON Input</h2>
              <button
                onClick={handleBeautify}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Wand2 size={15} />
                Beautify
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 p-3 bg-slate-800 text-white rounded border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              placeholder="Enter your JSON here..."
            />
          </div>

          {/* Query Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">JSON Path Query</h2>
            <div className="mb-4">
              <input
                type="text"
                value={jsonPath}
                onChange={(e) => setJsonPath(e.target.value)}
                className="w-full p-3 bg-slate-800 text-white rounded border border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                placeholder="e.g., user.address.city"
              />
            </div>

            <button
              onClick={evaluateJsonPath}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search size={20} />
              Query JSON
            </button>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-purple-200 mb-2">
                Example Paths:
                {examplePaths.length === 0 && (
                  <span className="text-slate-400 font-normal ml-2">enter valid JSON to auto-generate</span>
                )}
              </h3>
              {examplePaths.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {examplePaths.map((ex, idx) => (
                    <button
                      key={idx}
                      onClick={() => setJsonPath(ex.path)}
                      className="w-full text-left p-2 bg-slate-800/50 hover:bg-slate-800 rounded text-sm text-white transition-colors"
                    >
                      <code className="text-purple-300">{ex.path}</code>
                      <span className="text-slate-400 ml-2">- {ex.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result Section */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Result</h2>
            {result && (
              <button
                onClick={copyResult}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded p-4 flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-200 font-semibold">Error</p>
                <p className="text-red-100 text-sm">{error}</p>
              </div>
            </div>
          )}

          {result && !error && (
            <pre className="bg-slate-800 text-green-300 p-4 rounded overflow-x-auto font-mono text-sm">
              {result}
            </pre>
          )}

          {!result && !error && (
            <p className="text-slate-400 text-center py-8">Enter a JSON path and click "Query JSON" to see results</p>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">How to use:</h3>
          <ul className="text-purple-200 space-y-2 text-sm">
            <li>• Use dot notation for nested properties: <code className="bg-slate-800 px-2 py-1 rounded text-purple-300">user.address.city</code></li>
            <li>• Access array elements with brackets: <code className="bg-slate-800 px-2 py-1 rounded text-purple-300">hobbies[0]</code></li>
            <li>• Use wildcard [*] to get all elements: <code className="bg-slate-800 px-2 py-1 rounded text-purple-300">data.records[*].id</code></li>
            <li>• Combine both for complex paths: <code className="bg-slate-800 px-2 py-1 rounded text-purple-300">users[0].address.city</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
