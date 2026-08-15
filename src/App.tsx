import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import './App.css'
import JsonPathTool from "./jsonPath/json_path_tool";
import SecureNotesApp from "./secureNotes/secure_notes_local";
import DistinctListInput from "./distinctTool/distinct-list-input";
import DelimiterTool from "./delimiterTool/delimiter_tool";
import BatchApiRunner from "./batchApiRunner/batch_api_runner";
import TableToJson from "./tableToJson/table_to_json";

const APP_NAME = 'Developer Tools';

// Nguồn dùng chung cho Navigation, HomePage và tiêu đề trang
const TOOLS = [
  { path: '/jsonPath', name: 'JSON Path Tool', icon: '🔍', description: 'Query and extract data from JSON using path expressions' },
  { path: '/notes', name: 'Notes', icon: '📒', description: 'Secure Notes and Tasks' },
  { path: '/distinct', name: 'Distinct Tool', icon: '⌘', description: 'Check distinct and get unique list' },
  { path: '/delimiter', name: 'Delimiter Tool', icon: '🔗', description: 'Join a list with any delimiter, wrap items, and format output' },
  { path: '/batch-api', name: 'Batch API Runner', icon: '🚀', description: 'Run APIs in batch from JSON input' },
  { path: '/table-json', name: 'Table → JSON', icon: '📊', description: 'Convert Excel/Sheets pasted rows into a JSON array' },
  // Add more tools here in the future
];

// Cập nhật tiêu đề tab trình duyệt theo tool đang được chọn
function RouteTitle() {
  const location = useLocation();
  useEffect(() => {
    const tool = TOOLS.find(t => t.path === location.pathname);
    document.title = tool ? `${tool.icon} ${tool.name} · ${APP_NAME}` : APP_NAME;
  }, [location.pathname]);
  return null;
}

// Navigation component
function Navigation() {
  const location = useLocation();

  const tools = TOOLS;

  return (
    <nav className="bg-slate-800 border-b border-slate-700 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-white hover:text-purple-400 transition-colors">
            Developer Tools
          </Link>
          
          <div className="flex gap-3">
            {tools.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  location.pathname === tool.path
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                <span className="mr-2">{tool.icon}</span>
                {tool.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Home page component
function HomePage() {
  const tools = TOOLS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Developer Tools</h1>
          <p className="text-xl text-purple-200">A collection of useful tools for developers</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.path}
              to={tool.path}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="text-5xl mb-4">{tool.icon}</div>
              <h2 className="text-2xl font-bold text-white mb-2">{tool.name}</h2>
              <p className="text-purple-200">{tool.description}</p>
            </Link>
          ))}
          
          {/* Placeholder for future tools */}
          <div className="bg-white/5 backdrop-blur-lg border border-dashed border-white/20 rounded-xl p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">➕</div>
              <p className="text-slate-400">More tools coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouteTitle />
      <div className="h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 min-h-0 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/jsonPath" element={<JsonPathTool />} />
            <Route path="/notes" element={<SecureNotesApp />} />
            <Route path="/distinct" element={<DistinctListInput />} />
            <Route path="/delimiter" element={<DelimiterTool />} />
            <Route path="/batch-api" element={<BatchApiRunner />} />
            <Route path="/table-json" element={<TableToJson />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;