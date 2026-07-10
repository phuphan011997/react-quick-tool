import { useState, useEffect, useRef, useMemo } from 'react';

// Ví dụ dữ liệu JSON mẫu để người dùng dễ dàng kiểm thử ngay lập tức
const SAMPLE_JSON = [
  { "id": 1, "name": "Nguyen Van A", "email": "a@example.com", "role": "Admin" },
  { "id": 2, "name": "Tran Thi B", "email": "b@example.com", "role": "User" },
  { "id": 3, "name": "Le Van C", "email": "c@example.com", "role": "Editor" },
  { "id": 4, "name": "Pham Minh D", "email": "d@example.com", "role": "User" },
  { "id": 5, "name": "Hoang Thi E", "email": "e@example.com", "role": "Moderator" }
];

export default function BatchApiRunner() {
  // --- STATE ---
  const [jsonInput, setJsonInput] = useState(JSON.stringify(SAMPLE_JSON, null, 2));
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Cấu hình API
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/posts');
  const [httpMethod, setHttpMethod] = useState('POST');
  const [headers, setHeaders] = useState<any[]>([
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }
  ]);
  const [bodyTemplate, setBodyTemplate] = useState('{\n  "title": "Gửi thông tin cho {{name}}",\n  "body": "Email: {{email}} với quyền {{role}}",\n  "userId": {{id}}\n}');
  
  // Cấu hình nâng cao
  const [delayMs, setDelayMs] = useState(1000); // Độ trễ giữa các request (ms)
  const [isMockMode, setIsMockMode] = useState(false); // Mặc định bật chế độ giả lập để chạy thử an toàn
  const [stopOnError, setStopOnError] = useState(false); // Dừng lại nếu gặp lỗi
  
  // Cấu hình Bypass CORS Proxy
  const [useCorsProxy, setUseCorsProxy] = useState(false);
  const [corsProxyUrl, setCorsProxyUrl] = useState('/api/proxy?url={{url}}');

  // Trạng thái thực thi cuộc gọi (Dùng cho UI hiển thị)
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logs, setLogs] = useState<any[]>([]); // Chứa lịch sử log đã call
  const [rightActiveTab, setRightActiveTab] = useState('overview'); // overview, log_detail
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null); // Bản ghi đang được chọn xem chi tiết

  // --- TRẠNG THÁI ĐỒNG BỘ DÙNG TRONG VÒNG LẶP ---
  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentIndexRef = useRef(0);

  // Kiểm tra tính hợp lệ của JSON Input khi thay đổi
  useEffect(() => {
    try {
      if (!jsonInput.trim()) {
        setParsedData([]);
        setJsonError("Vui lòng nhập danh sách JSON.");
        return;
      }
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setParsedData([]);
        setJsonError("Dữ liệu JSON phải là một Mảng (Array of Objects) ví dụ: [ {...}, {...} ]");
      } else {
        setParsedData(parsed);
        setJsonError(null);
        // Default select bản ghi đầu tiên nếu có dữ liệu
        if (parsed.length > 0) {
          setSelectedTaskIndex(0);
        }
      }
    } catch (e: any) {
      setJsonError(`JSON không hợp lệ: ${e.message}`);
      setParsedData([]);
    }
  }, [jsonInput]);

  // --- HÀM HELPER ĐỂ THAY THẾ BIẾN {{variable}} ---
  const interpolate = (template: string, dataItem: any) => {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return dataItem[trimmedKey] !== undefined ? String(dataItem[trimmedKey]) : match;
    });
  };

  // Trả về tên hiển thị an toàn của bản ghi để tránh lỗi render object trực tiếp trong JSX
  const getRecordDisplayName = (item: any, index: number) => {
    if (!item) return 'N/A';
    const val = item.name || item.title || item.email;
    if (val === undefined || val === null) {
      return `Record ID: ${item.id !== undefined ? String(item.id) : index + 1}`;
    }
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  };

  // Thêm / Xóa Header dòng cấu hình
  const addHeaderRow = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeaderRow = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeaderRow = (index: number, field: string, val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  // Tra cứu log hiện tại của một bản ghi dựa trên index
  const getLogForIndex = (idx: number) => {
    return logs.find(l => l.index === idx + 1);
  };

  // --- CHẠY TIẾN TRÌNH CALL REQUEST ---
  const startProcessing = async () => {
    if (parsedData.length === 0) return;
    
    // Reset lại trạng thái hoặc tiếp tục từ index cũ nếu đang Pause
    const startIndex = isPaused ? currentIndexRef.current : 0;
    if (!isPaused) {
      setLogs([]);
      currentIndexRef.current = 0;
      setCurrentIndex(0);
    }
    
    // Cập nhật trạng thái tức thời cho Ref
    isRunningRef.current = true;
    isPausedRef.current = false;
    
    // Cập nhật trạng thái cho UI
    setIsRunning(true);
    setIsPaused(false);
    setRightActiveTab('overview'); // Chuyển sang Tab tổng quan để giám sát

    // Chạy vòng lặp qua từng Object trong danh sách
    for (let i = startIndex; i < parsedData.length; i++) {
      // Kiểm tra đồng bộ xem người dùng có bấm Stop hoặc Pause không
      if (!isRunningRef.current || isPausedRef.current) {
        break;
      }

      setCurrentIndex(i);
      currentIndexRef.current = i;
      setSelectedTaskIndex(i); // Tự động chọn xem chi tiết bản ghi đang chạy
      const item = parsedData[i];
      
      // Xử lý Render URL, Headers, Body dựa theo đối tượng hiện tại
      const formattedUrl = interpolate(apiUrl, item);
      const formattedBody = httpMethod !== 'GET' ? interpolate(bodyTemplate, item) : null;
      
      const requestId = crypto.randomUUID();

      const requestHeaders: Record<string, string> = {};
      headers.forEach(h => {
        if (h.key.trim()) {
          requestHeaders[h.key] = interpolate(h.value, item);
        }
      });
      // Tự động thêm X-Request-ID nếu người dùng chưa tự cấu hình
      if (!requestHeaders['X-Request-ID'] && !requestHeaders['x-request-id']) {
        requestHeaders['X-Request-ID'] = requestId;
      }

      const startTime = Date.now();
      let logEntry = {
        index: i + 1,
        total: parsedData.length,
        itemData: item,
        requestId,
        url: formattedUrl,
        method: httpMethod,
        headersSent: requestHeaders,
        bodySent: formattedBody,
        timestamp: new Date().toLocaleTimeString(),
        status: 'pending'
      };

      // Thêm log tạm thời là đang chạy
      setLogs(prev => [logEntry, ...prev]);

      try {
        let responseStatus = 200;
        let responseData = null;
        let isSuccess = true;

        if (isMockMode) {
          // CHẾ ĐỘ GIẢ LẬP (MOCK API)
          await new Promise(resolve => setTimeout(resolve, 600)); // Trễ mạng ảo
          responseStatus = 200;
          responseData = { 
            message: "Mock API thành công!", 
            receivedData: item, 
            processedAt: new Date().toISOString() 
          };
        } else {
          // CHẾ ĐỘ CHẠY THẬT (CALL FETCH)
          let finalUrl = formattedUrl;
          const fetchOptions: RequestInit = {
            method: httpMethod,
            headers: requestHeaders,
          };
          
          if (httpMethod !== 'GET' && formattedBody) {
            fetchOptions.body = formattedBody;
          }

          // Áp dụng Bypass CORS Proxy nếu được bật
          if (useCorsProxy && corsProxyUrl) {
            finalUrl = corsProxyUrl.replace('{{url}}', encodeURIComponent(formattedUrl));
            // Lưu ý: Một số proxy công cộng có thể chặn/không truyền tiếp một số custom Header đặc thù
          }

          const response = await fetch(finalUrl, fetchOptions);
          responseStatus = response.status;
          isSuccess = response.ok;
          
          try {
            responseData = await response.json();
          } catch (e) {
            responseData = await response.text();
          }
        }

        const duration = Date.now() - startTime;
        
        // Cập nhật trạng thái log thành công/lỗi
        const updatedLog = {
          ...logEntry,
          status: isSuccess ? 'success' : 'error',
          statusCode: responseStatus,
          duration: `${duration}ms`,
          response: responseData
        };

        // Cập nhật log vào danh sách
        setLogs(prev => prev.map(l => l.index === i + 1 ? updatedLog : l));

        if (!isSuccess && stopOnError) {
          isRunningRef.current = false;
          setIsRunning(false);
          const errorLog = {
            index: 'SYSTEM',
            url: 'Dừng do lỗi',
            method: 'ALERT',
            status: 'error',
            statusCode: 'STOPPED',
            timestamp: new Date().toLocaleTimeString(),
            response: `Đã dừng tiến trình tại vị trí #${i + 1} do thiết lập 'Dừng lại khi gặp lỗi'`
          };
          setLogs(prev => [errorLog, ...prev]);
          break;
        }

      } catch (error: any) {
        const duration = Date.now() - startTime;
        const updatedLog = {
          ...logEntry,
          status: 'error',
          statusCode: 'FAILED',
          duration: `${duration}ms`,
          response: error.message || error
        };
        
        setLogs(prev => prev.map(l => l.index === i + 1 ? updatedLog : l));

        if (stopOnError) {
          isRunningRef.current = false;
          setIsRunning(false);
          break;
        }
      }

      // Đánh dấu phần tử i đã xử lý xong, nếu có pause thì lần sau sẽ bắt đầu từ i + 1
      currentIndexRef.current = i + 1;

      // Kiểm tra lại trạng thái dừng trước khi tiến hành Delay
      if (!isRunningRef.current || isPausedRef.current) {
        break;
      }

      // Đợi hết khoảng thời gian delay trước khi gọi request tiếp theo (không chạy ở item cuối cùng)
      if (i < parsedData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Hoàn thành tất cả vòng lặp
    if (currentIndexRef.current >= parsedData.length && isRunningRef.current && !isPausedRef.current) {
      isRunningRef.current = false;
      setIsRunning(false);
      setCurrentIndex(parsedData.length);
    }
  };

  const pauseProcessing = () => {
    isPausedRef.current = true;
    isRunningRef.current = false;
    setIsPaused(true);
    setIsRunning(false);
  };

  const stopProcessing = () => {
    isRunningRef.current = false;
    isPausedRef.current = false;
    currentIndexRef.current = 0;
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setSelectedTaskIndex(0);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Tải dữ liệu JSON mẫu vào trình soạn thảo
  const loadSampleJson = () => {
    setJsonInput(JSON.stringify(SAMPLE_JSON, null, 2));
  };

  // --- TÍNH TOÁN CÁC THÔNG SỐ ĐỂ HIỂN THỊ ---
  const stats = useMemo(() => {
    const total = parsedData.length;
    const completed = logs.filter(l => l.status === 'success' || (l.status === 'error' && l.statusCode !== 'STOPPED')).length;
    const successes = logs.filter(l => l.status === 'success').length;
    const errors = logs.filter(l => l.status === 'error').length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, successes, errors, progressPercent };
  }, [logs, parsedData]);

  // Đối tượng đang được chọn xem chi tiết Log
  const activeTaskDetail = useMemo(() => {
    if (selectedTaskIndex === null || !parsedData[selectedTaskIndex]) return null;
    const rawData = parsedData[selectedTaskIndex];
    const logInfo = getLogForIndex(selectedTaskIndex);
    return {
      index: selectedTaskIndex + 1,
      rawData,
      logInfo
    };
  }, [selectedTaskIndex, parsedData, logs]);

  // Xuất file Log dạng JSON để tải về máy
  const exportLogsAsJson = () => {
    if (logs.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `api-runner-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Xem chi tiết một bản ghi bất kỳ từ danh sách tổng quan
  const inspectTask = (index: number) => {
    setSelectedTaskIndex(index);
    setRightActiveTab('log_detail');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Batch API Runner Tool
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">v2.2</span>
            </h1>
            <p className="text-xs text-slate-400">Tự động lặp mảng JSON gọi API hàng loạt & Quản lý tiến trình trực quan</p>
          </div>
        </div>
        
        {/* Chế độ chạy */}
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-300">
          <label className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors">
            <span className={`w-2 h-2 rounded-full ${isMockMode ? 'bg-indigo-500 animate-ping' : 'bg-slate-500'}`}></span>
            <span className="text-xs font-medium text-slate-300">Giả Lập Mock API:</span>
            <div className="relative inline-flex items-center">
              <input 
                type="checkbox" 
                checked={isMockMode} 
                onChange={(e) => setIsMockMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white"></div>
            </div>
            <strong className={`text-xs ml-1 ${isMockMode ? 'text-indigo-400' : 'text-slate-500'}`}>
              {isMockMode ? "BẬT" : "TẮT"}
            </strong>
          </label>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* Left Side: Inputs & Setup (6 Columns) */}
        <section className="xl:col-span-6 flex flex-col gap-6">
          
          {/* STEP 1: JSON Input */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">1</span>
                <h2 className="text-base font-semibold text-slate-200">Nhập Danh Sách Đối Tượng JSON (Array)</h2>
              </div>
              <button 
                onClick={loadSampleJson}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-600 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải JSON mẫu thử nghiệm
              </button>
            </div>

            <div className="relative">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Nhập mảng JSON của bạn ở đây... Ví dụ: [{ 'id': 1 }, { 'id': 2 }]"
                className="w-full h-44 bg-slate-950 font-mono text-sm p-4 rounded-xl border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-indigo-300 outline-none resize-y transition-all"
              />
              <div className="absolute right-3 bottom-3 text-xs text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                {parsedData.length} phần tử được nạp
              </div>
            </div>

            {/* Trạng thái Parser JSON */}
            {jsonError ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{jsonError}</span>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Cú pháp JSON hoàn toàn chính xác! Hệ thống sẵn sàng lặp qua {parsedData.length} bản ghi.</span>
              </div>
            )}
          </div>

          {/* STEP 2: API Configuration */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">2</span>
              <h2 className="text-base font-semibold text-slate-200">Cấu Hình Gọi Request API</h2>
            </div>

            {/* Method + URL */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Method</label>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Endpoint URL <span className="text-slate-500 font-normal">(Sử dụng cấu pháp <code className="text-indigo-400 font-mono text-[10px] bg-indigo-950 px-1 py-0.5 rounded">{"{{key}}"}</code> để truyền biến)</span>
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="Ví dụ: https://api.example.com/users/{{id}}"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Custom Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-400">Headers cấu hình</label>
                <button
                  type="button"
                  onClick={addHeaderRow}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 focus:outline-none"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm Header mới
                </button>
              </div>
              
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {headers.map((hdr, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={hdr.key}
                      onChange={(e) => updateHeaderRow(i, 'key', e.target.value)}
                      placeholder="Header Name (ví dụ: X-API-KEY)"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                    />
                    <input
                      type="text"
                      value={hdr.value}
                      onChange={(e) => updateHeaderRow(i, 'value', e.target.value)}
                      placeholder="Header Value (hoặc {{token}})"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeaderRow(i)}
                      className="p-1.5 bg-slate-700/50 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg transition-colors border border-slate-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {headers.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2 bg-slate-900/30 rounded-lg border border-dashed border-slate-800">Không có header bổ sung được cấu hình.</p>
                )}
              </div>
            </div>

            {/* Request Body (Only displays if NOT GET) */}
            {httpMethod !== 'GET' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Request Body Payload Template <span className="text-slate-500 font-normal">(Chỉ áp dụng với {httpMethod})</span>
                </label>
                <textarea
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  placeholder="Ví dụ: { 'name': '{{name}}', 'email': '{{email}}' }"
                  className="w-full h-32 bg-slate-950 font-mono text-xs p-3.5 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none resize-y text-indigo-300"
                />
              </div>
            )}
          </div>

          {/* STEP 3: Configs & Settings */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">3</span>
              <h2 className="text-base font-semibold text-slate-200">Cấu Hình Nâng Cao</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Delay range */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Độ Trễ Giữa Request</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="5000"
                      step="100"
                      value={delayMs}
                      onChange={(e) => setDelayMs(Number(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-sm font-semibold font-mono text-indigo-400 w-16 text-right">
                      {delayMs}ms
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Tránh bị khóa IP do gửi quá nhanh.</p>
              </div>

              {/* Stop on error toggler */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400">Dừng Khi Gặp Lỗi</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={stopOnError} 
                      onChange={(e) => setStopOnError(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Dừng toàn bộ tiến trình nếu một API gọi thất bại.</p>
              </div>

              {/* CORS Bypass Proxy Configuration */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col justify-between border-emerald-500/20 bg-gradient-to-br from-slate-900/60 to-emerald-950/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400">Bypass CORS Proxy</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={useCorsProxy} 
                      onChange={(e) => setUseCorsProxy(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                {useCorsProxy && (
                  <input
                    type="text"
                    value={corsProxyUrl}
                    onChange={(e) => setCorsProxyUrl(e.target.value)}
                    placeholder="URL Proxy với {{url}}"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] font-mono mt-1 text-slate-300 outline-none focus:border-emerald-500"
                  />
                )}
                <p className="text-[10px] text-slate-400 mt-2">Dùng máy chủ proxy làm cầu nối để bỏ qua hạn chế CORS của trình duyệt.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Execution Dashboard, Record Overview and Detailed Inspector (6 Columns) */}
        <section className="xl:col-span-6 flex flex-col gap-6">
          
          {/* CONTROL BOARD */}
          <div className="bg-gradient-to-b from-indigo-950/30 to-slate-900 rounded-2xl border border-indigo-500/20 p-5 shadow-lg flex flex-col gap-5">
            <h2 className="text-base font-bold text-white tracking-wide">BẢNG ĐIỀU KHIỂN CHẠY TIẾN TRÌNH</h2>

            {/* Run Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">TỔNG REQUEST</span>
                <span className="text-xl font-black font-mono text-white mt-1">{stats.total}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">ĐÃ CHẠY</span>
                <span className="text-xl font-black font-mono text-indigo-400 mt-1">{stats.completed}</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center">
                <span className="text-[10px] text-emerald-400 uppercase font-semibold">THÀNH CÔNG</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1">{stats.successes}</span>
              </div>
              <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex flex-col items-center justify-center">
                <span className="text-[10px] text-rose-400 uppercase font-semibold">BỊ LỖI</span>
                <span className="text-xl font-black font-mono text-rose-400 mt-1">{stats.errors}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                <span className="font-semibold flex items-center gap-1.5">
                  Tiến trình chạy: 
                  {isRunning && <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                  {isPaused && <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>}
                </span>
                <span className="font-mono font-bold text-white">{stats.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex gap-2">
                {/* START / RESUME BUTTON */}
                {!isRunning && (
                  <button
                    onClick={startProcessing}
                    disabled={parsedData.length === 0}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-800 border border-indigo-500/20 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    {isPaused ? 'Tiếp tục chạy' : 'Bắt đầu gửi Request'}
                  </button>
                )}

                {/* PAUSE BUTTON */}
                {isRunning && (
                  <button
                    onClick={pauseProcessing}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Tạm dừng tiến trình
                  </button>
                )}

                {/* STOP BUTTON */}
                {(isRunning || isPaused || currentIndex > 0) && (
                  <button
                    onClick={stopProcessing}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Dừng lại
                  </button>
                )}
              </div>

              {/* Status Message */}
              <div className="text-center text-xs text-slate-400 py-1">
                {isRunning && parsedData[currentIndex] && (
                  <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Đang gọi dòng #{currentIndex + 1} ({getRecordDisplayName(parsedData[currentIndex], currentIndex)})...
                  </span>
                )}
                {isPaused && <span className="text-amber-400">Đã tạm dừng. Bạn có thể nhấn tiếp tục.</span>}
                {!isRunning && !isPaused && currentIndex === 0 && <span className="text-slate-400">Đang chờ khởi chạy...</span>}
                {!isRunning && currentIndex === parsedData.length && currentIndex > 0 && (
                  <span className="text-indigo-400 font-bold flex items-center justify-center gap-1.5 animate-bounce">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Đã hoàn thành toàn bộ {parsedData.length} API Requests!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* PROCESS AND MONITORING TAB SYSTEM */}
          <div className="bg-slate-800/50 rounded-2xl border border-slate-800 p-5 flex flex-col flex-1 min-h-[460px] shadow-sm">
            
            {/* Tabs Control Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-4">
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setRightActiveTab('overview')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
                    rightActiveTab === 'overview' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Danh sách bản ghi ({parsedData.length})
                </button>
                <button
                  onClick={() => setRightActiveTab('log_detail')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all relative ${
                    rightActiveTab === 'log_detail' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Chi tiết Log {activeTaskDetail ? `#${activeTaskDetail.index}` : ''}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearLogs}
                  disabled={logs.length === 0}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-all"
                >
                  Xóa sạch logs
                </button>
                <button
                  onClick={exportLogsAsJson}
                  disabled={logs.length === 0}
                  className="text-[11px] bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-all flex items-center gap-1"
                >
                  Xuất JSON
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: OVERVIEW GRID LIST OF TASKS */}
            {rightActiveTab === 'overview' && (
              <div className="flex-1 flex flex-col">
                <div className="overflow-y-auto max-h-[400px] flex-1 pr-1 space-y-2">
                  {parsedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                      <svg className="w-12 h-12 text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-sm">Chưa có dữ liệu JSON được nạp.</p>
                      <p className="text-xs text-slate-600">Vui lòng kiểm tra lại cấu hình bước 1.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-medium">
                          <th className="py-2.5 px-3 w-12">#</th>
                          <th className="py-2.5 px-3">Bản ghi đối tượng</th>
                          <th className="py-2.5 px-3 w-32">Trạng thái</th>
                          <th className="py-2.5 px-3 w-20 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {parsedData.map((item, index) => {
                          const log = getLogForIndex(index);
                          const isActive = index === currentIndex && isRunning;
                          const isSelected = index === selectedTaskIndex;
                          
                          // Xác định badge trạng thái
                          let statusBadge = (
                            <span className="inline-flex items-center gap-1.5 text-slate-400 bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              Chờ xử lý
                            </span>
                          );

                          if (log) {
                            if (log.status === 'pending') {
                              statusBadge = (
                                <span className="inline-flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                                  Đang gửi...
                                </span>
                              );
                            } else if (log.status === 'success') {
                              statusBadge = (
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Thành công
                                </span>
                              );
                            } else if (log.status === 'error') {
                              statusBadge = (
                                <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  Thất bại ({log.statusCode})
                                </span>
                              );
                            }
                          }

                          return (
                            <tr 
                              key={index} 
                              onClick={() => setSelectedTaskIndex(index)}
                              className={`cursor-pointer transition-colors group ${
                                isActive ? 'bg-indigo-600/10 text-white' : 
                                isSelected ? 'bg-slate-800 text-slate-200' : 'hover:bg-slate-800/30 text-slate-300'
                              }`}
                            >
                              <td className="py-3 px-3 font-mono text-slate-500 font-semibold">
                                {index + 1}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-200">
                                  {getRecordDisplayName(item, index)}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-xs font-mono mt-0.5">
                                  {JSON.stringify(item)}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                {statusBadge}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    inspectTask(index);
                                  }}
                                  className="text-[10px] bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2 py-1 rounded transition-colors"
                                >
                                  Xem log
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: DETAILED RECORD LOG INSPECTOR */}
            {rightActiveTab === 'log_detail' && (
              <div className="flex-1 flex flex-col space-y-4">
                {activeTaskDetail ? (
                  <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 pr-1">
                    
                    {/* Header Info */}
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-xs text-slate-400">Đang kiểm tra log bản ghi</div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-1">
                          #{activeTaskDetail.index}: {getRecordDisplayName(activeTaskDetail.rawData, activeTaskDetail.index - 1)}
                        </h4>
                      </div>
                      
                      {/* Trạng thái xử lý của Bản ghi này */}
                      <div>
                        {!activeTaskDetail.logInfo ? (
                          <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-700">
                            Chưa thực thi
                          </span>
                        ) : activeTaskDetail.logInfo.status === 'success' ? (
                          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/20">
                            Thành công ({activeTaskDetail.logInfo.statusCode})
                          </span>
                        ) : activeTaskDetail.logInfo.status === 'pending' ? (
                          <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20 animate-pulse">
                            Đang chạy...
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-rose-500/20">
                            Lỗi ({activeTaskDetail.logInfo.statusCode})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dữ liệu thô đầu vào */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold block">1. Dữ liệu Object đầu vào (JSON):</span>
                      <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-xs text-indigo-300 border border-slate-800/80 max-h-32">
                        {JSON.stringify(activeTaskDetail.rawData, null, 2)}
                      </pre>
                    </div>

                    {/* Chi tiết Request đã cấu hình & gửi */}
                    {activeTaskDetail.logInfo ? (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-semibold block">2. Chi tiết Request gửi đi:</span>
                          <button
                            onClick={() => {
                              const logInfo = activeTaskDetail.logInfo;
                              let curl = `curl -X ${logInfo.method} "${logInfo.url}"`;
                              if (logInfo.headersSent) {
                                Object.entries(logInfo.headersSent).forEach(([key, value]) => {
                                  curl += ` \\\n  -H "${key}: ${value}"`;
                                });
                              }
                              if (logInfo.bodySent) {
                                const escapedBody = logInfo.bodySent.replace(/'/g, "'\\''");
                                curl += ` \\\n  -d '${escapedBody}'`;
                              }
                              navigator.clipboard.writeText(curl);
                              
                              const btn = document.getElementById('copy-curl-btn');
                              if (btn) {
                                const originalHTML = btn.innerHTML;
                                btn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Đã Copy!';
                                btn.classList.add('text-emerald-400', 'border-emerald-500/50');
                                setTimeout(() => {
                                  btn.innerHTML = originalHTML;
                                  btn.classList.remove('text-emerald-400', 'border-emerald-500/50');
                                }, 2000);
                              }
                            }}
                            id="copy-curl-btn"
                            className="text-[10px] bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 border border-slate-700"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy cURL
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                            <span className="text-slate-500 block text-[10px]">Phương thức (Method):</span>
                            <span className="text-indigo-400 font-bold">{activeTaskDetail.logInfo.method}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                            <span className="text-slate-500 block text-[10px]">Thời gian gọi:</span>
                            <span className="text-slate-300">{activeTaskDetail.logInfo.timestamp}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 min-w-0">
                            <span className="text-slate-500 block text-[10px]">Request ID:</span>
                            <span className="text-slate-300 truncate block" title={activeTaskDetail.logInfo.requestId}>{activeTaskDetail.logInfo.requestId || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-xs font-mono break-all">
                          <span className="text-slate-500 block text-[10px] mb-1">URL Endpoint thực tế:</span>
                          <span className="text-slate-300">{activeTaskDetail.logInfo.url}</span>
                        </div>

                        {/* Headers Sent */}
                        {activeTaskDetail.logInfo.headersSent && Object.keys(activeTaskDetail.logInfo.headersSent).length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-mono">Headers thực tế đã truyền:</span>
                            <pre className="p-2.5 bg-slate-950 rounded-lg text-[10px] text-slate-300 font-mono border border-slate-800/60">
                              {JSON.stringify(activeTaskDetail.logInfo.headersSent, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Request Body Sent */}
                        {activeTaskDetail.logInfo.bodySent && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-mono">Body Payload thực tế đã truyền:</span>
                            <pre className="p-2.5 bg-slate-950 rounded-lg text-[10px] text-indigo-300 font-mono border border-slate-800/60">
                              {activeTaskDetail.logInfo.bodySent}
                            </pre>
                          </div>
                        )}

                        {/* Response Log */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                          <span className="text-[11px] text-slate-400 font-semibold flex items-center justify-between">
                            <span>3. Kết quả phản hồi từ Server (Response):</span>
                            {activeTaskDetail.logInfo.duration && (
                              <span className="text-[10px] font-normal text-slate-500">Mất {activeTaskDetail.logInfo.duration}</span>
                            )}
                          </span>
                          <pre className={`p-3 rounded-xl overflow-x-auto text-[11px] font-mono border max-h-56 ${
                            activeTaskDetail.logInfo.status === 'success' 
                              ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-300' 
                              : 'bg-rose-950/20 border-rose-800/30 text-rose-300'
                          }`}>
                            {typeof activeTaskDetail.logInfo.response === 'object'
                              ? JSON.stringify(activeTaskDetail.logInfo.response, null, 2)
                              : String(activeTaskDetail.logInfo.response)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <svg className="w-10 h-10 mx-auto text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-xs">Bản ghi này chưa được thực thi.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Vui lòng bấm chạy tiến trình ở bảng điều khiển.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
                    <p className="text-sm">Vui lòng chọn một bản ghi ở Tab "Danh sách bản ghi" để xem thông tin chi tiết.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>© 2026 Batch API Runner Tool. Được phát triển an toàn, bảo mật dữ liệu.</p>
      </footer>
    </div>
  );
}