import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const LANG_COLORS = {
  javascript:"#F7DF1E", typescript:"#3178C6", python:"#3776AB", java:"#ED8B00",
  cpp:"#00599C", c:"#555555", go:"#00ADD8", rust:"#CE422B", html:"#E34F26",
  css:"#1572B6", markdown:"#083FA1", php:"#777BB4", ruby:"#CC342D"
};

export default function AnalyticsPanel({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    axios.get(`${API}/analytics/project/${projectId}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-900 rounded-2xl animate-pulse" />)}
    </div>
  );
  if (!data) return <p className="text-center text-slate-600 py-12">No analytics data</p>;

  // Build 30-day heatmap grid
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split("T")[0];
    days.push({ key, count: data.heatmap[key] || 0, label: d.toLocaleDateString() });
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);

  const fmt = (n) => n >= 1000 ? (n/1000).toFixed(1)+"k" : n;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6 scrollbar-thin">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Commits", value: data.summary.totalCommits, icon: "🔖", color: "#8b5cf6" },
          { label: "Total Files",   value: data.summary.totalFiles,   icon: "📄", color: "#3b82f6" },
          { label: "Total Lines",   value: fmt(data.summary.totalLines), icon: "📝", color: "#10b981" },
          { label: "Contributors",  value: data.summary.contributors, icon: "👥", color: "#f59e0b" }
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
            <div className="text-xl mb-2">{s.icon}</div>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Commit Heatmap */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Commit Activity — Last 30 Days</h3>
        <div className="flex gap-1.5 flex-wrap">
          {days.map(day => (
            <div
              key={day.key}
              title={`${day.label}: ${day.count} commit${day.count !== 1 ? "s" : ""}`}
              className="w-6 h-6 rounded-md cursor-pointer transition-transform hover:scale-125"
              style={{
                backgroundColor: day.count === 0
                  ? "#1e293b"
                  : `rgba(59,130,246,${0.15 + (day.count / maxCount) * 0.85})`,
                border: day.count > 0 ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.04)"
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[9px] text-slate-600">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: v === 0 ? "#1e293b" : `rgba(59,130,246,${0.15 + v * 0.85})` }} />
          ))}
          <span className="text-[9px] text-slate-600">More</span>
        </div>
      </div>

      {/* Language Breakdown */}
      {data.languages.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Languages</h3>
          <div className="space-y-3">
            {data.languages.slice(0, 8).map(lang => (
              <div key={lang.language}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-slate-300">{lang.language}</span>
                  <span className="text-xs font-mono text-slate-500">{lang.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${lang.percentage}%`, backgroundColor: LANG_COLORS[lang.language] || "#64748b" }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Color legend */}
          <div className="flex flex-wrap gap-3 mt-4">
            {data.languages.slice(0, 8).map(lang => (
              <div key={lang.language} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: LANG_COLORS[lang.language] || "#64748b" }} />
                <span className="text-[10px] text-slate-400 font-mono">{lang.language}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contributors */}
      {data.linesByUser.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Contributors</h3>
          <div className="space-y-3">
            {data.linesByUser.sort((a,b) => b.commits - a.commits).map(u => (
              <div key={u.username} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ backgroundColor: u.color || "#3b82f6" }}>
                  {u.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white">{u.username}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-500">{u.commits} commits</span>
                    <span className="text-[10px] font-mono text-green-500">+{u.added}</span>
                    <span className="text-[10px] font-mono text-red-400">-{u.removed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {data.recentActivity.slice(0, 8).map(v => (
              <div key={v._id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                  style={{ backgroundColor: v.author?.cursorColor || "#3b82f6" }}>
                  {v.author?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">
                    <span className="font-bold text-white">{v.author?.username}</span>
                    {" committed to "}
                    <span className="text-blue-400 font-mono">{v.file?.name}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{v.commitMessage}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-[9px] text-blue-400">#{v.commitHash}</span>
                  <p className="text-[9px] text-slate-600 mt-0.5">{new Date(v.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
