import { useState, useEffect } from 'react';
import { Lock, Plus, Check, Edit2, Trash2, Eye, EyeOff, X } from 'lucide-react';

interface Note {
  id: number;
  title: string;
  content: string;
  isTask: boolean;
  status: 'pending' | 'complete';
  color: string;
  createdAt: string;
}

export default function SecureNotesApp() {
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', isTask: false, status: 'pending', color: 'purple' });
  const [error, setError] = useState('');

  const colors = [
    { name: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100', complete: 'bg-purple-100', button: 'bg-purple-600 hover:bg-purple-700' },
    { name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', complete: 'bg-blue-100', button: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'green', bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100', complete: 'bg-green-100', button: 'bg-green-600 hover:bg-green-700' },
    { name: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', hover: 'hover:bg-yellow-100', complete: 'bg-yellow-100', button: 'bg-yellow-600 hover:bg-yellow-700' },
    { name: 'pink', bg: 'bg-pink-50', border: 'border-pink-200', hover: 'hover:bg-pink-100', complete: 'bg-pink-100', button: 'bg-pink-600 hover:bg-pink-700' },
    { name: 'red', bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:bg-red-100', complete: 'bg-red-100', button: 'bg-red-600 hover:bg-red-700' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      // Load password from localStorage
      const storedPassword = localStorage.getItem('app_password');
      if (storedPassword) {
        setSavedPassword(storedPassword);
      }

      // Load notes from localStorage
      const storedNotes = localStorage.getItem('notes_data');
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const saveData = (updatedNotes: Note[]) => {
    try {
      localStorage.setItem('notes_data', JSON.stringify(updatedNotes));
    } catch (err) {
      console.error('Error saving data:', err);
      setError('Error saving data');
    }
  };

  const handleSetPassword = () => {
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    try {
      localStorage.setItem('app_password', password);
      setSavedPassword(password);
      setIsLocked(false);
      setError('');
      setPassword('');
    } catch (err) {
      setError('Error setting password');
    }
  };

  const handleUnlock = () => {
    if (password === savedPassword) {
      setIsLocked(false);
      setError('');
      setPassword('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    setPassword('');
    setEditingId(null);
    setViewingNote(null);
    setNewNote({ title: '', content: '', isTask: false, status: 'pending', color: 'purple' });
  };

  const addNote = () => {
    if (!newNote.title.trim()) {
      setError('Title is required');
      return;
    }

    const note = {
      id: Date.now(),
      ...newNote,
      createdAt: new Date().toISOString()
    };

    const updatedNotes = [...notes, note];
    setNotes(updatedNotes);
    saveData(updatedNotes);
    setNewNote({ title: '', content: '', isTask: false, status: 'pending', color: 'purple' });
    setError('');
  };

  const updateNote = (id: number, updates: Partial<Note>) => {
    const updatedNotes = notes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    );
    setNotes(updatedNotes);
    saveData(updatedNotes);
  };

  const deleteNote = (id: number) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    saveData(updatedNotes);
    if (viewingNote?.id === id) {
      setViewingNote(null);
    }
  };

  const toggleStatus = (id: number) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newStatus = note.status === 'complete' ? 'pending' : 'complete';
    updateNote(id, { status: newStatus });
  };

  const getColorClasses = (colorName: string) => {
    return colors.find(c => c.name === colorName) || colors[0];
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <Lock className="w-12 h-12 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Secure Notes</h1>
            <p className="text-gray-600 mt-2 text-center">
              {savedPassword ? 'Enter password to unlock' : 'Set a password to protect your notes'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (savedPassword ? handleUnlock() : handleSetPassword())}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={savedPassword ? handleUnlock : handleSetPassword}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              {savedPassword ? 'Unlock' : 'Set Password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">My Notes & Tasks</h1>
            <button
              onClick={handleLock}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              <Lock className="w-4 h-4" />
              Lock
            </button>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Title"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newNote.isTask}
                    onChange={(e) => setNewNote({ ...newNote, isTask: e.target.checked })}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Task</span>
                </label>
                <button
                  onClick={addNote}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Content"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none mb-3"
            />
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600 font-medium">Color:</span>
              {colors.map(color => (
                <button
                  key={color.name}
                  onClick={() => setNewNote({ ...newNote, color: color.name })}
                  className={`w-8 h-8 rounded-full border-2 transition ${color.bg} ${
                    newNote.color === color.name ? 'border-gray-800 scale-110' : 'border-gray-300'
                  }`}
                  title={color.name}
                />
              ))}
            </div>
            {error && (
              <div className="mt-2 text-red-600 text-sm">{error}</div>
            )}
          </div>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No notes yet</p>
                <p className="text-sm">Create your first note or task above</p>
              </div>
            ) : (
              notes.map(note => {
                const colorClasses = getColorClasses(note.color);
                return (
                  <div
                    key={note.id}
                    className={`border rounded-xl p-4 transition cursor-pointer ${
                      note.isTask && note.status === 'complete'
                        ? `${colorClasses.complete} ${colorClasses.border}`
                        : `${colorClasses.bg} ${colorClasses.border} ${colorClasses.hover}`
                    }`}
                    onClick={() => setViewingNote(note)}
                  >
                    {editingId === note.id ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={note.title}
                          onChange={(e) => updateNote(note.id, { title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <textarea
                          value={note.content}
                          onChange={(e) => updateNote(note.id, { content: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        />
                        <div className="flex gap-2 items-center mb-2">
                          <span className="text-sm text-gray-600 font-medium">Color:</span>
                          {colors.map(color => (
                            <button
                              key={color.name}
                              onClick={() => updateNote(note.id, { color: color.name })}
                              className={`w-6 h-6 rounded-full border-2 transition ${color.bg} ${
                                note.color === color.name ? 'border-gray-800 scale-110' : 'border-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {note.isTask && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStatus(note.id);
                                  }}
                                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                                    note.status === 'complete'
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300 hover:border-green-500'
                                  }`}
                                >
                                  {note.status === 'complete' && (
                                    <Check className="w-4 h-4 text-white" />
                                  )}
                                </button>
                              )}
                              <h3 className={`text-lg font-semibold break-words ${
                                note.isTask && note.status === 'complete'
                                  ? 'line-through text-gray-500'
                                  : 'text-gray-800'
                              }`}>
                                {note.title}
                              </h3>
                              {note.isTask && (
                                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                                  note.status === 'complete'
                                    ? 'bg-green-200 text-green-800'
                                    : 'bg-yellow-200 text-yellow-800'
                                }`}>
                                  {note.status}
                                </span>
                              )}
                            </div>
                            {note.content && (
                              <p className={`text-gray-600 break-words line-clamp-3 ${
                                note.isTask && note.status === 'complete' ? 'line-through' : ''
                              }`}>
                                {note.content}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(note.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setEditingId(note.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {viewingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setViewingNote(null)}>
          <div 
            className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto ${getColorClasses(viewingNote.color).bg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {viewingNote.isTask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(viewingNote.id);
                      setViewingNote({...viewingNote, status: viewingNote.status === 'complete' ? 'pending' : 'complete'});
                    }}
                    className={`flex-shrink-0 w-7 h-7 rounded border-2 flex items-center justify-center transition ${
                      viewingNote.status === 'complete'
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {viewingNote.status === 'complete' && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </button>
                )}
                <h2 className={`text-2xl font-bold break-words ${
                  viewingNote.isTask && viewingNote.status === 'complete'
                    ? 'line-through text-gray-500'
                    : 'text-gray-800'
                }`}>
                  {viewingNote.title}
                </h2>
                {viewingNote.isTask && (
                  <span className={`text-xs px-3 py-1 rounded-full flex-shrink-0 ${
                    viewingNote.status === 'complete'
                      ? 'bg-green-200 text-green-800'
                      : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {viewingNote.status}
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {viewingNote.content ? (
                <p className={`text-gray-700 text-lg whitespace-pre-wrap break-words ${
                  viewingNote.isTask && viewingNote.status === 'complete' ? 'line-through' : ''
                }`}>
                  {viewingNote.content}
                </p>
              ) : (
                <p className="text-gray-400 italic">No content</p>
              )}
              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Created: {new Date(viewingNote.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(viewingNote.id);
                      setViewingNote(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      deleteNote(viewingNote.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}