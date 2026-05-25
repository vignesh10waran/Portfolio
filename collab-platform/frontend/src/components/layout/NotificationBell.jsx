import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TYPE_ICONS = {
  invite: "📨", mention: "💬", commit: "🔖", pr_opened: "🔀",
  pr_merged: "✅", pr_comment: "💬", task_assigned: "📋", project_star: "⭐"
};

export default function NotificationBell({ socket, user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/notifications`);
      setNotifications(data);
      setUnread(data.filter(n => !n.read).length);
    } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Real-time socket notifications
  useEffect(() => {
    if (!socket) return;
    socket.on("notification", (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(c => c + 1);
    });
    return () => socket.off("notification");
  }, [socket]);

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnread(c => Math.max(0, c - 1));
    try { await axios.put(`${API}/notifications/${id}/read`); } catch {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    try { await axios.put(`${API}/notifications/read-all`); } catch {}
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (!notifications.find(n => n._id === id)?.read) setUnread(c => Math.max(0, c - 1));
    try { await axios.delete(`${API}/notifications/${id}`); } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) load(); }}
        className="relative w-8 h-8 flex items-center justify-center rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition"
      >
        <span className="text-sm">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-xs font-black text-white uppercase tracking-widest">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-xs text-slate-600 font-bold">All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => markRead(n._id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 cursor-pointer transition hover:bg-slate-800 group ${!n.read ? "bg-blue-500/5" : ""}`}
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ background: n.read ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.15)" }}>
                    {TYPE_ICONS[n.type] || "📣"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white">{n.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[9px] text-slate-700 mt-1 font-mono">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    <button
                      onClick={(e) => deleteNotif(e, n._id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition text-xs"
                    >✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
