import { useMemo, useState } from 'react';
import { parseTableToJson } from '../utils/tableToJson';

const SAMPLE_TSV = `id\tname\temail\trole
1\tNguyen Van A\ta@example.com\tAdmin
2\tTran Thi B\tb@example.com\tUser`;

export default function TableToJson() {
  const [input, setInput] = useState(SAMPLE_TSV);
  const [hasHeader, setHasHeader] = useState(true);
  const [delimiter, setDelimiter] = useState<'auto' | '\t' | ',' | ';'>('auto');
  const [inferTypes, setInferTypes] = useState(true);
  const [copied, setCopied] = useState(false);

  const { output, count, detectedDelimiter, error } = useMemo(() => {
    try {
      const result = parseTableToJson(input, { hasHeader, delimiter, inferTypes });
      return {
        output: JSON.stringify(result.rows, null, 2),
        count: result.rows.length,
        detectedDelimiter: result.delimiter,
        error: null as string | null,
      };
    } catch (e: any) {
      return { output: '', count: 0, detectedDelimiter: '\t', error: e.message || 'Lỗi phân tích dữ liệu.' };
    }
  }, [input, hasHeader, delimiter, inferTypes]);

  const delimiterLabel = (d: string) => (d === '\t' ? 'Tab' : d === ',' ? 'Dấu phẩy (,)' : d === ';' ? 'Chấm phẩy (;)' : d);

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadJson = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-to-json-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Table → JSON</h1>
            <p className="text-xs text-slate-400">Dán dữ liệu copy từ Excel / Google Sheets (nhiều cột) và chuyển thành mảng JSON</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1600px] w-full mx-auto">
        {/* Input */}
        <section className="flex flex-col gap-4">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200">1. Dán dữ liệu bảng</h2>
              <span className="text-xs text-slate-500 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
                Phân tách: <span className="text-emerald-400 font-semibold">{delimiterLabel(detectedDelimiter)}</span>
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Dán trực tiếp từ Excel (Ctrl+V)... Mỗi cột cách nhau bằng Tab."
              className="w-full h-72 bg-slate-950 font-mono text-sm p-4 rounded-xl border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-emerald-300 outline-none resize-y"
            />

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer">
                <span className="text-xs font-medium text-slate-300">Dòng đầu là tiêu đề</span>
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="accent-emerald-500" />
              </label>
              <label className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 cursor-pointer">
                <span className="text-xs font-medium text-slate-300">Suy luận kiểu</span>
                <input type="checkbox" checked={inferTypes} onChange={(e) => setInferTypes(e.target.checked)} className="accent-emerald-500" />
              </label>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value as any)}
                  className="w-full bg-transparent text-xs font-medium text-slate-300 outline-none"
                >
                  <option value="auto">Tự nhận diện</option>
                  <option value={'\t'}>Tab (Excel)</option>
                  <option value=",">Dấu phẩy (,)</option>
                  <option value=";">Chấm phẩy (;)</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setInput(SAMPLE_TSV)}
              className="self-start text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
            >
              Tải dữ liệu mẫu
            </button>
          </div>
        </section>

        {/* Output */}
        <section className="flex flex-col gap-4">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-200">
                2. Kết quả JSON <span className="text-xs font-normal text-slate-500">({count} bản ghi)</span>
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyOutput}
                  disabled={!output}
                  className="text-[11px] bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-all"
                >
                  {copied ? 'Đã copy!' : 'Copy JSON'}
                </button>
                <button
                  onClick={downloadJson}
                  disabled={!output}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-all"
                >
                  Tải .json
                </button>
              </div>
            </div>

            {error ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">{error}</div>
            ) : (
              <pre className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-auto text-xs font-mono text-emerald-300 max-h-[520px]">
                {output || '// Chưa có dữ liệu'}
              </pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
