import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const COLUMNS = [
  { id: "backlog",     label: "Backlog",     color: "#64748b", icon: "📥" },
  { id: "todo",        label: "To Do",       color: "#3b82f6", icon: "📋" },
  { id: "in_progress", label: "In Progress", color: "#f59e0b", icon: "⚡" },
  { id: "review",      label: "Review",      color: "#8b5cf6", icon: "👁" },
  { id: "done",        label: "Done",        color: "#10b981", icon: "✅" }
];

const PRIORITY_CONFIG = {
  low:      { label: "Low",      color: "#64748b", dot: "●" },
  medium:   { label: "Medium",   color: "#3b82f6", dot: "●" },
  high:     { label: "High",     color: "#f59e0b", dot: "●" },
  critical: { label: "Critical", color: "#ef4444", dot: "●" }
};

export default function KanbanBoard({ projectId, collaborators, user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(null); // column id
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", assigneeId: "", dueDate: "" });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/tasks/project/${projectId}`);
      setTasks(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e, status) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setCreating(true);
    try {
      const { data } = await axios.post(`${API}/tasks`, {
        projectId, ...newTask, status,
        assigneeId: newTask.assigneeId || undefined
      });
      setTasks(prev => [...prev, data]);
      setNewTask({ title: "", description: "", priority: "medium", assigneeId: "", dueDate: "" });
      setShowCreate(null);
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (taskId) => {
    setTasks(prev => prev.filter(t => t._id !== taskId));
    setSelectedTask(null);
    try { await axios.delete(`${API}/tasks/${taskId}`); } catch (e) { console.error(e); }
  };

  const handleDragStart = (task) => setDraggedTask(task);
  const handleDragOver = (e, colId) => { e.preventDefault(); setDragOver(colId); };
  const handleDrop = (e, colId) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== colId) handleStatusChange(draggedTask._id, colId);
    setDraggedTask(null);
    setDragOver(null);
  };

  if (loading) return (
    <div className="flex gap-4 p-4 overflow-x-auto">
      {COLUMNS.map(c => (
        <div key={c.id} className="w-72 shrink-0 space-y-3">
          <div className="h-8 bg-slate-800 rounded-xl animate-pulse" />
          {[1,2].map(i => <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse" />)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Task Board</h2>
          <p className="text-xs text-slate-500 mt-0.5">{tasks.length} tasks across {COLUMNS.length} columns</p>
        </div>
        <div className="flex gap-3">
          {COLUMNS.map(c => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: c.color }}>●</span>
              <span className="text-[10px] font-bold text-slate-500">{tasks.filter(t => t.status === c.id).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            const isDragTarget = dragOver === col.id;
            return (
              <div
                key={col.id}
                className="w-72 flex flex-col rounded-2xl transition-all"
                style={{
                  background: isDragTarget ? "rgba(59,130,246,0.05)" : "rgba(15,23,42,0.6)",
                  border: isDragTarget ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.06)"
                }}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span>{col.icon}</span>
                    <span className="text-sm font-black text-white">{col.label}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: col.color + "22", color: col.color }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCreate(showCreate === col.id ? null : col.id)}
                    className="w-6 h-6 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 flex items-center justify-center transition text-sm"
                  >+</button>
                </div>

                {/* Create task form */}
                {showCreate === col.id && (
                  <form onSubmit={e => handleCreate(e, col.id)} className="p-3 border-b border-white/5 space-y-2">
                    <input
                      autoFocus
                      value={newTask.title}
                      onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
                      placeholder="Task title..."
                      className="w-full px-3 py-2 bg-slate-800 rounded-xl text-white text-xs font-medium placeholder-slate-600 focus:outline-none focus:ring-1 ring-blue-500"
                      required
                    />
                    <div className="flex gap-2">
                      <select
                        value={newTask.priority}
                        onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}
                        className="flex-1 px-2 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                      >
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <select
                        value={newTask.assigneeId}
                        onChange={e => setNewTask(n => ({ ...n, assigneeId: e.target.value }))}
                        className="flex-1 px-2 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {(collaborators || []).map(c => (
                          <option key={c.user?._id} value={c.user?._id}>{c.user?.username}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={creating}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg transition">
                        {creating ? "..." : "Add Task"}
                      </button>
                      <button type="button" onClick={() => setShowCreate(null)}
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition">
                        ✕
                      </button>
                    </div>
                  </form>
                )}

                {/* Task cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                  {colTasks.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs text-slate-700">Drop tasks here</p>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onDragStart={() => handleDragStart(task)}
                      onClick={() => setSelectedTask(task)}
                      isDragging={draggedTask?._id === task._id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          collaborators={collaborators}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDelete}
          onStatusChange={(newStatus) => {
            handleStatusChange(selectedTask._id, newStatus);
            setSelectedTask(t => ({ ...t, status: newStatus }));
          }}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onDragStart, onClick, isDragging }) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-3 rounded-xl cursor-pointer group transition-all select-none ${isDragging ? "opacity-40 scale-95" : "hover:scale-[1.02]"}`}
      style={{
        background: "#1e293b",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: isDragging ? "none" : "0 2px 8px rgba(0,0,0,0.3)"
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-white leading-snug flex-1">{task.title}</p>
        <span className="text-[9px] shrink-0" style={{ color: p.color }}>● {p.label}</span>
      </div>

      {task.description && (
        <p className="text-[10px] text-slate-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {task.labels?.slice(0, 2).map(l => (
            <span key={l} className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md font-bold">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={`text-[9px] font-mono ${isOverdue ? "text-red-400" : "text-slate-600"}`}>
              {isOverdue ? "⚠ " : ""}{new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
              style={{ backgroundColor: task.assignee.cursorColor || "#3b82f6" }}
              title={task.assignee.username}
            >
              {task.assignee.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskDetailModal({ task, collaborators, onClose, onDelete, onStatusChange }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-black text-white mb-1">{task.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                style={{ background: PRIORITY_CONFIG[task.priority]?.color + "22", color: PRIORITY_CONFIG[task.priority]?.color }}>
                {PRIORITY_CONFIG[task.priority]?.label}
              </span>
              <span className="text-[9px] font-black text-slate-400 uppercase">{task.status.replace("_"," ")}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl ml-4">✕</button>
        </div>

        {task.description && (
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-widest mb-1">Reporter</p>
            <p className="text-white font-bold">{task.reporter?.username || "—"}</p>
          </div>
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-widest mb-1">Assignee</p>
            <p className="text-white font-bold">{task.assignee?.username || "Unassigned"}</p>
          </div>
          {task.dueDate && (
            <div>
              <p className="text-slate-500 font-bold uppercase tracking-widest mb-1">Due Date</p>
              <p className="text-white font-bold">{new Date(task.dueDate).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <p className="text-slate-500 font-bold uppercase tracking-widest mb-1">Created</p>
            <p className="text-white font-bold">{new Date(task.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Move to column */}
        <div className="mb-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Move To</p>
          <div className="flex gap-2 flex-wrap">
            {COLUMNS.map(c => (
              <button
                key={c.id}
                onClick={() => onStatusChange(c.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition ${
                  task.status === c.id ? "text-white" : "text-slate-400 hover:text-white"
                }`}
                style={{
                  background: task.status === c.id ? c.color + "33" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${task.status === c.id ? c.color + "66" : "rgba(255,255,255,0.08)"}`
                }}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs rounded-xl transition uppercase tracking-wider">
            Close
          </button>
          <button onClick={() => onDelete(task._id)}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black text-xs rounded-xl transition border border-red-500/20">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
