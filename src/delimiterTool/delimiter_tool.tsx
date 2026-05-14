import { useState, useMemo } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';

const PRESETS = [
  { label: 'Comma', value: ',' },
  { label: 'Comma + Space', value: ', ' },
  { label: 'Comma + Enter', value: ',\n' },
  { label: 'Semicolon', value: ';' },
  { label: 'Pipe', value: ' | ' },
  { label: 'Space', value: ' ' },
  { label: 'Tab', value: '\t' },
  { label: 'Newline', value: '\n' },
];

const WRAP_OPTIONS = [
  { label: 'None', prefix: '', suffix: '' },
  { label: '"double"', prefix: '"', suffix: '"' },
  { label: "'single'", prefix: "'", suffix: "'" },
  { label: '`backtick`', prefix: '`', suffix: '`' },
  { label: '(parens)', prefix: '(', suffix: ')' },
  { label: '[bracket]', prefix: '[', suffix: ']' },
];

export default function DelimiterTool() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(', ');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [wrapIndex, setWrapIndex] = useState(0);
  const [trimItems, setTrimItems] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [copied, setCopied] = useState(false);

  const activeDelimiter = isCustom ? customDelimiter : delimiter;
  const wrap = WRAP_OPTIONS[wrapIndex];

  const items = useMemo(() => {
    let lines = input.split('\n');
    if (trimItems) lines = lines.map(l => l.trim());
    if (removeEmpty) lines = lines.filter(l => l.length > 0);
    return lines;
  }, [input, trimItems, removeEmpty]);

  const output = useMemo(() => {
    if (items.length === 0) return '';
    const wrapped = items.map(item => `${wrap.prefix}${item}${wrap.suffix}`);
    return `${prefix}${wrapped.join(activeDelimiter)}${suffix}`;
  }, [items, activeDelimiter, wrap, prefix, suffix]);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = output;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput('');
    setPrefix('');
    setSuffix('');
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-teal-50 p-4 flex flex-col">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="bg-white rounded-lg shadow-lg p-6 flex-1 flex flex-col min-h-0">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Delimiter Tool</h1>

          <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">

            {/* Left — input + options */}
            <div className="flex flex-col min-h-0 gap-4">

              {/* Input */}
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Input List <span className="font-normal text-gray-400">(one item per line)</span>
                  </label>
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                </div>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={'apple\nbanana\ncherry'}
                  className="flex-1 min-h-0 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm resize-none"
                />
                {items.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Options */}
              <div className="shrink-0 space-y-4">

                {/* Delimiter presets */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Delimiter</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setDelimiter(p.value); setIsCustom(false); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          !isCustom && delimiter === p.value
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsCustom(true)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isCustom
                          ? 'bg-teal-500 text-white border-teal-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {isCustom && (
                    <input
                      autoFocus
                      value={customDelimiter}
                      onChange={e => setCustomDelimiter(e.target.value)}
                      placeholder="Type your delimiter…"
                      className="w-full px-3 py-2 border border-teal-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                </div>

                {/* Wrap */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Wrap each item</label>
                  <div className="flex flex-wrap gap-2">
                    {WRAP_OPTIONS.map((w, i) => (
                      <button
                        key={w.label}
                        onClick={() => setWrapIndex(i)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border font-mono transition-colors ${
                          wrapIndex === i
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prefix / Suffix for whole output */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Output prefix</label>
                    <input
                      value={prefix}
                      onChange={e => setPrefix(e.target.value)}
                      placeholder="e.g.  ("
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Output suffix</label>
                    <input
                      value={suffix}
                      onChange={e => setSuffix(e.target.value)}
                      placeholder="e.g.  )"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={trimItems}
                      onChange={e => setTrimItems(e.target.checked)}
                      className="accent-teal-500 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Trim whitespace</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={removeEmpty}
                      onChange={e => setRemoveEmpty(e.target.checked)}
                      className="accent-teal-500 w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Remove empty lines</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right — output */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Output</label>
                <button
                  onClick={handleCopy}
                  disabled={!output}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    output
                      ? copied
                        ? 'bg-green-500 text-white'
                        : 'bg-teal-500 hover:bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="flex-1 min-h-0 relative">
                {output ? (
                  <pre className="absolute inset-0 overflow-auto bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-sm text-gray-800 whitespace-pre-wrap break-all">
                    {output}
                  </pre>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-400 text-sm">Output will appear here</p>
                  </div>
                )}
              </div>

              {output && (
                <p className="text-xs text-gray-400 mt-1">{output.length} character{output.length !== 1 ? 's' : ''}</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
