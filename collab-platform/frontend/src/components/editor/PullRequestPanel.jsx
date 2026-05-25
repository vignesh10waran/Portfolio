import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const STATUS_CONFIG = {
  open:   { label: "Open",   color: "#22c55e", bg: "#22c55e22" },
  merged: { label: "Merged", color: "#8b5cf6", bg: "#8b5cf622" },
  closed: { label: "Closed", color: "#64748b", bg: "#64748b22" }
};

export default function PullRequestPanel({ projectId, files, collaborators, user }) {
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [newPR, setNewPR] = useState({ title: "", description: "", fileIds: [], reviewerIds: [] });
  const [creating, setCreating] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState("commented");

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/pr/project/${projectId}`);
      setPRs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await axios.post(`${API}/pr`, { projectId, ...newPR });
      setPRs(prev => [data, ...prev]);
      setShowCreate(false);
      setNewPR({ title: "", description: "", fileIds: [], reviewerIds: [] });
    } catch (e) { alert(e.response?.data?.error || "Failed"); }
    finally { setCreating(false); }
  };

  const handleReview = async (prId) => {
    try {
      const { data } = await axios.post(`${API}/pr/${prId}/review`, { status: reviewStatus, comment: reviewComment });
      setPRs(prev => prev.map(p => p._id === prId ? data : p));
      setSelectedPR(data);
      setReviewComment("");
    } catch (e) { console.error(e); }
  };

  const handleMerge = async (prId) => {
    if (!confirm("Merge this pull request? File changes will be applied.")) return;
    try {
      const { data } = await axios.post(`${API}/pr/${prId}/merge`);
      setPRs(prev => prev.map(p => p._id === prId ? data : p));
      setSelectedPR(data);
    } catch (e) { alert(e.response?.data?.error || "Merge failed"); }
  };

  const handleClose = async (prId) => {
    try {
      const { data } = await axios.put(`${API}/pr/${prId}/close`);
      setPRs(prev => prev.map(p => p._id === prId ? data : p));
      setSelectedPR(data);
    } catch (e) { console.error(e); }
  };

  const toggleFileId = (id) => setNewPR(p => ({
    ...p,
    fileIds: p.fileIds.includes(id) ? p.fileIds.filter(f => f !== id) : [...p.fileIds, id]
  }));

  const toggleReviewerId = (id) => setNewPR(p => ({
    ...p,
    reviewerIds: p.reviewerIds.includes(id) ? p.reviewerIds.filter(r => r !== id) : [...p.reviewerIds, id]
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Pull Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {prs.filter(p => p.status === "open").length} open · {prs.filter(p => p.status === "merged").length} merged
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs rounded-xl transition shadow-lg shadow-green-900/30 uppercase tracking-widest">
          + New PR
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-slate-900 rounded-2xl animate-pulse" />)}</div>
        ) : prs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🔀</div>
            <p className="font-black text-slate-600 text-lg uppercase tracking-tight">No Pull Requests</p>
            <p className="text-slate-700 text-xs mt-2">Open a PR to propose and review code changes</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {prs.map(pr => {
              const s = STATUS_CONFIG[pr.status];
              return (
                <div key={pr._id}
                  onClick={() => setSelectedPR(pr)}
                  className="p-4 rounded-2xl cursor-pointer hover:scale-[1.01] transition-all"
                  style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">🔀</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-black text-white truncate">{pr.title}</p>
                        <span className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        by <span className="text-slate-300 font-bold">{pr.author?.username}</span>
                        {" · "}{new Date(pr.createdAt).toLocaleDateString()}
                        {" · "}{pr.fileChanges?.length || 0} file{pr.fileChanges?.length !== 1 ? "s" : ""}
                        {" · "}{pr.reviews?.length || 0} review{pr.reviews?.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create PR Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">Open Pull Request</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Title *</label>
                <input value={newPR.title} onChange={e => setNewPR(p => ({ ...p, title: e.target.value }))}
                  placeholder="Add feature / Fix bug..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea value={newPR.description} onChange={e => setNewPR(p => ({ ...p, description: e.target.value }))}
                  placeholder="What changes are you proposing?"
                  rows={3} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Include Files</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                  {files.filter(f => !f.isDirectory).map(f => (
                    <label key={f._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
                      <input type="checkbox" checked={newPR.fileIds.includes(f._id)}
                        onChange={() => toggleFileId(f._id)}
                        className="w-3.5 h-3.5 accent-blue-500" />
                      <span className="text-xs font-mono text-slate-300">{f.path}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Request Reviewers</label>
                <div className="space-y-1.5">
                  {(collaborators || []).map(c => (
                    <label key={c.user?._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
                      <input type="checkbox" checked={newPR.reviewerIds.includes(c.user?._id)}
                        onChange={() => toggleReviewerId(c.user?._id)}
                        className="w-3.5 h-3.5 accent-blue-500" />
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                        style={{ backgroundColor: c.user?.cursorColor || "#3b82f6" }}>
                        {c.user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-300">{c.user?.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 font-black text-xs rounded-xl uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black text-xs rounded-xl uppercase tracking-widest disabled:opacity-50">
                  {creating ? "Opening..." : "Open PR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PR Detail Modal */}
      {selectedPR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setSelectedPR(null)}>
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                      style={{ background: STATUS_CONFIG[selectedPR.status].bg, color: STATUS_CONFIG[selectedPR.status].color }}>
                      {STATUS_CONFIG[selectedPR.status].label}
                    </span>
                    <span className="text-[10px] text-slate-500">#{selectedPR._id?.slice(-6)}</span>
                  </div>
                  <h3 className="text-xl font-black text-white">{selectedPR.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">by {selectedPR.author?.username} · {new Date(selectedPR.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setSelectedPR(null)} className="text-slate-500 hover:text-white text-xl">✕</button>
              </div>
              {selectedPR.description && <p className="text-sm text-slate-400 mt-3">{selectedPR.description}</p>}
            </div>

            {/* File changes */}
            <div className="p-6 border-b border-slate-800">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Files Changed ({selectedPR.fileChanges?.length})</h4>
              <div className="space-y-2">
                {selectedPR.fileChanges?.map((fc, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
                    <span className="text-sm">📄</span>
                    <span className="text-xs font-mono text-slate-300 flex-1">{fc.fileName}</span>
                    <span className="text-[10px] font-mono text-green-400">+{fc.linesAdded}</span>
                    <span className="text-[10px] font-mono text-red-400">-{fc.linesRemoved}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="p-6 border-b border-slate-800">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Reviews ({selectedPR.reviews?.length})</h4>
              {selectedPR.reviews?.length === 0 && <p className="text-xs text-slate-700">No reviews yet</p>}
              <div className="space-y-3">
                {selectedPR.reviews?.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-800 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">
                      {r.reviewer?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{r.reviewer?.username}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          r.status === "approved" ? "bg-green-500/20 text-green-400" :
                          r.status === "changes_requested" ? "bg-red-500/20 text-red-400" :
                          "bg-slate-700 text-slate-400"
                        }`}>{r.status.replace("_"," ")}</span>
                      </div>
                      {r.comment && <p className="text-xs text-slate-400 mt-1">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit review */}
              {selectedPR.status === "open" && selectedPR.author?._id !== user?._id && (
                <div className="mt-4 space-y-2">
                  <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none">
                    <option value="commented">Comment</option>
                    <option value="approved">Approve</option>
                    <option value="changes_requested">Request Changes</option>
                  </select>
                  <div className="flex gap-2">
                    <input value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                      placeholder="Leave a review comment..."
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                    <button onClick={() => handleReview(selectedPR._id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition">
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedPR.status === "open" && (
              <div className="p-6 flex gap-3">
                <button onClick={() => handleMerge(selectedPR._id)}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl transition uppercase tracking-widest">
                  🔀 Merge PR
                </button>
                <button onClick={() => handleClose(selectedPR._id)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs rounded-xl transition uppercase tracking-widest">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
