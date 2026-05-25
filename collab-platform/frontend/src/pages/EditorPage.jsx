import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useEditor } from "../hooks/useEditor";
import CollabEditor from "../components/editor/CollabEditor";
import FileTree from "../components/editor/FileTree";
import ChatPanel from "../components/chat/ChatPanel";
import VersionPanel from "../components/editor/VersionPanel";
import ExecutionPanel from "../components/editor/ExecutionPanel";
import KanbanBoard from "../components/editor/KanbanBoard";
import AnalyticsPanel from "../components/editor/AnalyticsPanel";
import PullRequestPanel from "../components/editor/PullRequestPanel";
import SearchPanel from "../components/editor/SearchPanel";
import NotificationBell from "../components/layout/NotificationBell";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const EDITOR_THEMES = [
  { id: "codebloc-dark", label: "CodeBloc Dark" },
  { id: "vs-dark",       label: "VS Dark"        },
  { id: "hc-black",      label: "High Contrast"  },
];

const FILE_ICONS = { js:"🟡",ts:"🔷",py:"🐍",java:"☕",cpp:"⚙️",html:"🌐",css:"🎨",md:"📝",json:"📋",sh:"💻",rs:"🦀",go:"🐹" };
const getFileIcon = n => FILE_ICONS[n?.split(".").pop()?.toLowerCase()] || "📄";

export default function EditorPage() {
  const { projectId }    = useParams();
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const { socket, connected } = useSocket();

  const [project,        setProject]        = useState(null);
  const [activeTab,      setActiveTab]      = useState("editor");
  const [rightPanel,     setRightPanel]     = useState("chat");
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [rightOpen,      setRightOpen]      = useState(true);
  const [inviteUsername, setInviteUsername] = useState("");
  const [showInvite,     setShowInvite]     = useState(false);
  const [inviting,       setInviting]       = useState(false);
  const [openTabs,       setOpenTabs]       = useState([]);
  const [activeTabFile,  setActiveTabFile]  = useState(null);
  const [editorTheme,    setEditorTheme]    = useState("codebloc-dark");
  const [showThemes,     setShowThemes]     = useState(false);
  const [cursorPos,      setCursorPos]      = useState({ line: 1, col: 1 });
  const [wordWrap,       setWordWrap]       = useState(true);
  const [fontSize,       setFontSize]       = useState(14);

  const {
    files, activeFile, content, projectUsers, cursors,
    openFile, handleCodeChange, handleCursorMove, createFile, deleteFile
  } = useEditor(projectId, socket);

  useEffect(() => {
    axios.get(`${API}/projects/${projectId}`)
      .then(r => setProject(r.data))
      .catch(() => navigate("/dashboard"));
  }, [projectId]);

  // Multi-tab sync
  useEffect(() => {
    if (!activeFile) return;
    setOpenTabs(prev => prev.find(t => t._id === activeFile._id) ? prev : [...prev, activeFile]);
    setActiveTabFile(activeFile._id);
  }, [activeFile]);

  const closeTab = (e, fileId) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const next = prev.filter(t => t._id !== fileId);
      if (activeTabFile === fileId && next.length > 0) openFile(next[next.length - 1]);
      return next;
    });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviting(true);
    try {
      const { data } = await axios.post(`${API}/projects/${projectId}/collaborators`, { username: inviteUsername.trim(), role: "editor" });
      setProject(data); setInviteUsername(""); setShowInvite(false);
    } catch (err) { alert(err.response?.data?.error || "Could not invite"); }
    finally { setInviting(false); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setRightPanel("search"); setRightOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); setSidebarOpen(v => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const MAIN_TABS = [
    { id: "editor",    icon: "⌨️",  label: "Editor"         },
    { id: "kanban",    icon: "📋",  label: "Tasks"          },
    { id: "pr",        icon: "🔀",  label: "Pull Requests"  },
    { id: "analytics", icon: "📊",  label: "Analytics"      },
  ];
  const RIGHT_TABS = [
    { id: "chat",     icon: "💬", label: "Chat"    },
    { id: "versions", icon: "🔖", label: "History" },
    { id: "run",      icon: "▶",  label: "Run"     },
    { id: "search",   icon: "🔍", label: "Search"  },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <header className="flex items-center h-12 px-3 border-b border-slate-800 bg-slate-950 shrink-0 z-30 gap-2">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate("/dashboard")} className="group flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-[9px]">CB</span>
            </div>
            <span className="text-[10px] font-black text-slate-600 group-hover:text-white transition hidden md:block">Dashboard</span>
          </button>
          <span className="text-slate-700 text-xs">›</span>
          <span className="text-xs font-black text-white truncate max-w-[100px]">{project?.name || "…"}</span>
          {activeFile && activeTab === "editor" && (
            <><span className="text-slate-700 text-xs">›</span>
            <span className="text-xs font-mono text-blue-400 truncate max-w-[90px]">{activeFile.name}</span></>
          )}
        </div>

        {/* Main tab switcher */}
        <div className="flex items-center gap-0.5 mx-2 p-0.5 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
          {MAIN_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap ${
                activeTab === t.id ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:text-white"
              }`}>
              <span>{t.icon}</span>
              <span className="hidden lg:block">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Live users */}
        <div className="hidden md:flex items-center gap-1 flex-1 min-w-0">
          {projectUsers.slice(0, 5).map((u, i) => (
            <div key={u.socketId || i} title={u.username}
              className="relative w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-slate-950"
              style={{ backgroundColor: u.cursorColor || "#3b82f6", marginLeft: i > 0 ? "-5px" : 0 }}>
              {u.username?.charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-slate-950" />
            </div>
          ))}
          {projectUsers.length > 0 && <span className="text-[9px] text-slate-600 ml-2 font-bold">{projectUsers.length} live</span>}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Auto-save */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-[9px] font-black text-green-400 tracking-wider">Saved</span>
          </div>

          {/* Font size */}
          <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <button onClick={() => setFontSize(s => Math.max(10, s-1))} className="text-slate-400 hover:text-white text-xs font-bold">A-</button>
            <span className="text-[10px] font-mono text-slate-500 w-4 text-center">{fontSize}</span>
            <button onClick={() => setFontSize(s => Math.min(22, s+1))} className="text-slate-400 hover:text-white text-xs font-bold">A+</button>
          </div>

          {/* Theme */}
          <div className="relative hidden xl:block">
            <button onClick={() => setShowThemes(v => !v)}
              className="px-2 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-800 hover:border-slate-600 rounded-lg transition">
              🎨
            </button>
            {showThemes && (
              <div className="absolute right-0 top-9 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {EDITOR_THEMES.map(t => (
                  <button key={t.id} onClick={() => { setEditorTheme(t.id); setShowThemes(false); }}
                    className={`w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-slate-800 transition ${editorTheme === t.id ? "text-blue-400 bg-blue-500/10" : "text-slate-400"}`}>
                    {editorTheme === t.id ? "✓ " : ""}{t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Word wrap */}
          <button onClick={() => setWordWrap(v => !v)}
            className={`hidden xl:flex px-2 py-1.5 text-[9px] font-black uppercase border rounded-lg transition ${wordWrap ? "border-blue-500/40 text-blue-400 bg-blue-500/10" : "border-slate-800 text-slate-600"}`}>
            ↵
          </button>

          <NotificationBell socket={socket} user={user} />

          <button onClick={() => setShowInvite(v => !v)}
            className="hidden sm:flex px-2.5 py-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest border border-slate-700 hover:border-blue-500 hover:text-blue-400 rounded-xl transition">
            + Invite
          </button>

          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} title={connected ? "Connected" : "Disconnected"} />
        </div>
      </header>

      {/* ── INVITE DROPDOWN ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-12 right-12 z-50 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-white uppercase tracking-widest">Team</p>
              <button onClick={() => setShowInvite(false)} className="text-slate-600 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleInvite} className="flex gap-2 mb-4">
              <input autoFocus value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="username"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500" />
              <button type="submit" disabled={inviting}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl transition disabled:opacity-50">
                {inviting ? "…" : "Add"}
              </button>
            </form>
            <div className="space-y-2">
              {[{ user: project?.owner, role: "owner" }, ...(project?.collaborators || [])].filter(c => c.user).map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ backgroundColor: c.user?.cursorColor || "#3b82f6" }}>
                    {c.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-300 flex-1">{c.user?.username}</span>
                  <span className="text-[9px] font-black text-slate-600 uppercase">{c.role}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-[9px] text-slate-600">⌘K = Search · ⌘B = Toggle Sidebar</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: File Tree (editor tab only) */}
        <AnimatePresence initial={false}>
          {sidebarOpen && activeTab === "editor" && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18 }}
              className="shrink-0 border-r border-slate-800 bg-slate-950 overflow-hidden flex flex-col" style={{ width: 220 }}>
              <FileTree files={files} activeFile={activeFile} onOpenFile={openFile} onCreateFile={createFile} onDeleteFile={deleteFile} />
              {project && (
                <div className="p-3 border-t border-slate-800 shrink-0 space-y-1">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Project Info</p>
                  <p className="text-xs font-bold text-slate-400 truncate">{project.name}</p>
                  <div className="flex gap-3">
                    <span className="text-[10px] text-slate-600">{project.totalCommits || 0} commits</span>
                    <span className="text-[10px] text-slate-600">{files.length} files</span>
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {activeTab === "editor" && (
          <button onClick={() => setSidebarOpen(v => !v)}
            className="shrink-0 w-3 flex items-center justify-center bg-slate-900 border-r border-slate-800 hover:bg-slate-800 transition text-slate-700 hover:text-white">
            <span className="text-[9px]">{sidebarOpen ? "‹" : "›"}</span>
          </button>
        )}

        {/* CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* EDITOR ───────────────────────────────────────────────────────── */}
          {activeTab === "editor" && (
            <>
              {openTabs.length > 0 && (
                <div className="flex items-center h-9 border-b border-slate-800 bg-slate-950 overflow-x-auto scrollbar-thin shrink-0 px-2 gap-1">
                  {openTabs.map(tab => (
                    <div key={tab._id} onClick={() => openFile(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition shrink-0 group ${
                        activeTabFile === tab._id ? "bg-slate-800 border border-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}>
                      <span className="text-xs">{getFileIcon(tab.name)}</span>
                      <span className="text-xs font-mono">{tab.name}</span>
                      <button onClick={e => closeTab(e, tab._id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition text-[10px]">✕</button>
                    </div>
                  ))}
                  <div className="flex-1" />
                  <span className="text-[9px] text-slate-700 font-mono uppercase px-2 shrink-0">{activeFile?.language}</span>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                <CollabEditor
                  file={activeFile} content={content}
                  onChange={handleCodeChange}
                  onCursorChange={pos => { handleCursorMove(pos); setCursorPos({ line: pos.lineNumber, col: pos.column }); }}
                  cursors={cursors} theme={editorTheme} fontSize={fontSize} wordWrap={wordWrap}
                />
              </div>

              <div className="h-6 flex items-center px-4 gap-4 bg-blue-600 shrink-0 overflow-hidden">
                <span className="text-[10px] font-bold text-blue-100">{connected ? "● Connected" : "○ Offline"}</span>
                {activeFile && (
                  <>
                    <span className="text-[10px] text-blue-200 font-mono">{activeFile.language}</span>
                    <span className="text-[10px] text-blue-200">Ln {cursorPos.line}, Col {cursorPos.col}</span>
                    <span className="text-[10px] text-blue-200">{content.split("\n").length} lines</span>
                  </>
                )}
                <span className="ml-auto text-[10px] text-blue-200 font-mono hidden md:block">
                  {editorTheme} · {fontSize}px {wordWrap ? "· Wrap" : ""}
                </span>
              </div>
            </>
          )}

          {activeTab === "kanban" && (
            <div className="flex-1 overflow-hidden">
              <KanbanBoard projectId={projectId} collaborators={project?.collaborators || []} user={user} />
            </div>
          )}

          {activeTab === "pr" && (
            <div className="flex-1 overflow-hidden">
              <PullRequestPanel projectId={projectId} files={files} collaborators={project?.collaborators || []} user={user} />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="flex-1 overflow-hidden">
              <AnalyticsPanel projectId={projectId} />
            </div>
          )}
        </div>

        {/* Right toggle */}
        <button onClick={() => setRightOpen(v => !v)}
          className="shrink-0 w-3 flex items-center justify-center bg-slate-900 border-l border-slate-800 hover:bg-slate-800 transition text-slate-700 hover:text-white">
          <span className="text-[9px]">{rightOpen ? "›" : "‹"}</span>
        </button>

        {/* RIGHT PANEL */}
        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18 }}
              className="shrink-0 flex flex-col border-l border-slate-800 bg-slate-950 overflow-hidden" style={{ width: 300 }}>
              <div className="flex border-b border-slate-800 shrink-0">
                {RIGHT_TABS.map(t => (
                  <button key={t.id} onClick={() => setRightPanel(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[9px] font-black uppercase tracking-wider transition ${
                      rightPanel === t.id ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5" : "text-slate-600 hover:text-slate-300"
                    }`}>
                    <span>{t.icon}</span>
                    <span className="hidden sm:block">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-hidden">
                {rightPanel === "chat"     && <ChatPanel socket={socket} projectId={projectId} user={user} />}
                {rightPanel === "versions" && <VersionPanel projectId={projectId} activeFile={activeFile} />}
                {rightPanel === "run"      && <ExecutionPanel content={content} language={activeFile?.language || "javascript"} />}
                {rightPanel === "search"   && <SearchPanel projectId={projectId} files={files} onOpenFile={openFile} />}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
