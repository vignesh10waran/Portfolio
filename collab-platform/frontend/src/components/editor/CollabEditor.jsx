import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

const CODEBLOC_THEME = {
  base: "vs-dark", inherit: true,
  rules: [
    { token: "comment",  foreground: "5c6773", fontStyle: "italic" },
    { token: "keyword",  foreground: "cf8dff" },
    { token: "string",   foreground: "89d185" },
    { token: "number",   foreground: "f78c6c" },
    { token: "type",     foreground: "4ec9b0" },
    { token: "function", foreground: "dcdcaa" },
    { token: "variable", foreground: "9cdcfe" },
    { token: "operator", foreground: "d4d4d4" }
  ],
  colors: {
    "editor.background":                "#0d1117",
    "editor.foreground":                "#c9d1d9",
    "editorLineNumber.foreground":      "#30363d",
    "editorLineNumber.activeForeground":"#6e7681",
    "editor.selectionBackground":       "#264f78",
    "editorCursor.foreground":          "#58a6ff",
    "editor.lineHighlightBackground":   "#161b22",
    "editorGutter.background":          "#0d1117",
    "editorWidget.background":          "#161b22",
    "editorWidget.border":              "#30363d",
    "input.background":                 "#0d1117",
    "input.border":                     "#30363d",
    "scrollbarSlider.background":       "#30363d66",
    "scrollbarSlider.hoverBackground":  "#30363daa",
    "editorBracketMatch.background":    "#1f6feb44",
    "editorBracketMatch.border":        "#388bfd",
    "editor.findMatchBackground":       "#f2cc6044",
    "editor.findMatchHighlightBackground": "#f2cc6022"
  }
};

export default function CollabEditor({
  file, content, onChange, onCursorChange, cursors = {},
  theme = "codebloc-dark", fontSize = 14, wordWrap = true
}) {
  const editorRef    = useRef(null);
  const monacoRef    = useRef(null);
  const decorRef     = useRef([]);
  const widgetsRef   = useRef({});

  function handleMount(editor, monaco) {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    monaco.editor.defineTheme("codebloc-dark", CODEBLOC_THEME);
    monaco.editor.setTheme(theme);

    editor.onDidChangeCursorPosition(e => {
      onCursorChange?.({ lineNumber: e.position.lineNumber, column: e.position.column });
    });

    // Cmd+S — no-op (save handled in hook)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {});
  }

  // Apply theme changes
  useEffect(() => {
    if (!monacoRef.current) return;
    monacoRef.current.editor.setTheme(theme);
  }, [theme]);

  // Remote cursor decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;
    const editor = editorRef.current;

    const newDecs = Object.values(cursors).map(c => ({
      range: new monaco.Range(c.line || 1, c.column || 1, c.line || 1, (c.column || 1) + 1),
      options: {
        className: "remote-cursor-line",
        afterContentClassName: `rcl-${(c.socketId || "").replace(/[^a-z0-9]/gi, "")}`,
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        overviewRuler: { color: c.cursorColor || "#58a6ff", position: 4 }
      }
    }));
    decorRef.current = editor.deltaDecorations(decorRef.current, newDecs);
  }, [cursors]);

  const monacoLang = file?.language === "markdown" ? "markdown" : file?.language || "plaintext";

  return (
    <div className="h-full w-full relative bg-[#0d1117]">
      {/* Dynamic CSS for remote cursors */}
      <style>{
        Object.values(cursors).map(c => {
          const id = (c.socketId || "").replace(/[^a-z0-9]/gi, "");
          return `
            .rcl-${id}::after {
              content: "${(c.username || "?").substring(0, 12)}" !important;
              background: ${c.cursorColor || "#58a6ff"} !important;
              color: #fff !important;
              font-size: 10px !important;
              font-family: "JetBrains Mono", monospace !important;
              padding: 1px 6px !important;
              border-radius: 4px 4px 4px 0 !important;
              white-space: nowrap !important;
              position: absolute !important;
              top: -20px !important;
              left: 0 !important;
              z-index: 100 !important;
              pointer-events: none !important;
            }
            .rcl-${id} {
              border-left: 2px solid ${c.cursorColor || "#58a6ff"} !important;
              height: 18px !important;
              display: inline-block !important;
            }
          `;
        }).join("")
      }</style>

      {file ? (
        <Editor
          height="100%"
          language={monacoLang}
          value={content}
          onChange={val => onChange?.(val || "")}
          onMount={handleMount}
          theme={theme}
          options={{
            fontSize,
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontLigatures: true,
            lineHeight: Math.round(fontSize * 1.6),
            tabSize: 2,
            minimap: { enabled: true, scale: 1, renderCharacters: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderWhitespace: "selection",
            wordWrap: wordWrap ? "on" : "off",
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            padding: { top: 16, bottom: 32 },
            smoothScrolling: true,
            mouseWheelZoom: true,
            suggest: { showWords: true, showSnippets: true },
            quickSuggestions: { other: true, comments: false, strings: false },
            formatOnPaste: true,
            formatOnType: false,
            scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
            glyphMargin: true,
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "mouseover",
            renderLineHighlight: "all",
            occurrencesHighlight: true,
            selectionHighlight: true
          }}
        />
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4">
          <div className="text-7xl opacity-30">{'</>'}</div>
          <p className="text-lg font-black uppercase tracking-tighter">Select a file to edit</p>
          <p className="text-sm text-slate-700">or create a new one from the explorer</p>
          <div className="mt-4 text-xs text-slate-800 font-mono space-y-1 text-center">
            <p>⌘K — Search in files</p>
            <p>⌘B — Toggle sidebar</p>
          </div>
        </div>
      )}
    </div>
  );
}
