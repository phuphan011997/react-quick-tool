import { useState } from 'react';
import { List, Trash2, AlertCircle, Copy, Check } from 'lucide-react';

export default function DistinctListInput() {
  const [input, setInput] = useState('');
  const [distinctItems, setDistinctItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [itemCounts, setItemCounts] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [copied, setCopied] = useState(false);
  const [copiedDuplicates, setCopiedDuplicates] = useState(false);

  const handleProcess = () => {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const unique = [...new Set(lines)];
    
    // Count occurrences of each item
    const counts = {};
    lines.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    // Find duplicates (items that appear more than once)
    const dupes = Object.entries(counts)
      .filter(([_, count]) => count > 1)
      .map(([item, count]) => ({ item, count }));
    
    setDistinctItems(unique);
    setTotalCount(lines.length);
    setItemCounts(counts);
    setDuplicates(dupes);
  };

  const handleClear = () => {
    setInput('');
    setDistinctItems([]);
    setTotalCount(0);
    setItemCounts({});
    setDuplicates([]);
    setCopied(false);
    setCopiedDuplicates(false);
  };

  const handleCopyDistinct = async () => {
    const text = distinctItems.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Copy failed:', e);
      }
      document.body.removeChild(textarea);
    }
  };

  const handleCopyDuplicates = async () => {
    const text = duplicates.map(dup => dup.item).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDuplicates(true);
      setTimeout(() => setCopiedDuplicates(false), 2000);
    } catch (err) {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedDuplicates(true);
        setTimeout(() => setCopiedDuplicates(false), 2000);
      } catch (e) {
        console.error('Copy failed:', e);
      }
      document.body.removeChild(textarea);
    }
  };

  const distinctCount = distinctItems.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Distinct Count & Duplicate Finder</h1>
          
          <div className="grid lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Input List (paste your items here)
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="V1101501&#10;V1101502&#10;V1101502&#10;V1101928"
                className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleProcess}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-semibold"
                >
                  <List size={20} />
                  Process List
                </button>
                <button
                  onClick={handleClear}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={20} />
                  Clear
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Summary
              </label>
              
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg p-6 mb-4">
                <div className="text-sm opacity-90 mb-1">Distinct Count</div>
                <div className="text-5xl font-bold">{distinctCount}</div>
                {totalCount > 0 && (
                  <div className="text-sm opacity-90 mt-2">
                    out of {totalCount} total items
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    All Distinct Items
                  </h3>
                  {distinctItems.length > 0 && (
                    <button
                      onClick={handleCopyDistinct}
                      className={`text-xs px-3 py-1 rounded flex items-center gap-1 transition-colors ${
                        copied 
                          ? 'bg-green-500 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy List
                        </>
                      )}
                    </button>
                  )}
                </div>
                {distinctItems.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    No items processed yet
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {distinctItems.map((item, index) => (
                      <li
                        key={index}
                        className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 flex justify-between items-center"
                      >
                        <span>{item}</span>
                        <span className="text-xs text-gray-500">×{itemCounts[item]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Duplicates
              </label>
              
              <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-lg p-6 mb-4">
                <div className="text-sm opacity-90 mb-1">Duplicate Items Found</div>
                <div className="text-5xl font-bold">{duplicates.length}</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 h-48 overflow-y-auto border-2 border-red-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Duplicate Values
                  </h3>
                  {duplicates.length > 0 && (
                    <button
                      onClick={handleCopyDuplicates}
                      className={`text-xs px-3 py-1 rounded flex items-center gap-1 transition-colors ${
                        copiedDuplicates 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {copiedDuplicates ? (
                        <>
                          <Check size={14} />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                {duplicates.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">
                    {totalCount > 0 ? 'No duplicates found! 🎉' : 'No items processed yet'}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {duplicates.map((dup, index) => (
                      <li
                        key={index}
                        className="bg-white px-3 py-2 rounded border border-red-300"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-mono text-gray-800">{dup.item}</span>
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-semibold">
                            ×{dup.count}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}