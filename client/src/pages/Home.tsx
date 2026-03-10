import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const INTERVIEW_TYPES = [
  "Ruby",
  "Python",
  "JavaScript/TypeScript",
  "Go",
  "Java",
  "System Design",
  "Behavioral",
  "DevOps/SRE",
  "SQL/Databases",
  "Custom",
];

export function Home() {
  const navigate = useNavigate();
  const [interviewType, setInterviewType] = useState("Ruby");
  const [customPrompt, setCustomPrompt] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const form = new FormData();
    form.append("interviewType", interviewType);
    form.append("customPrompt", customPrompt);
    if (resume) form.append("resume", resume);

    const res = await fetch("/api/session", { method: "POST", body: form });
    const { sessionId } = await res.json();
    navigate(`/s/${sessionId}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>⚡ HackTheInterview</h1>
        <p style={styles.subtitle}>AI-powered real-time interview assistant</p>

        <div style={styles.field}>
          <label style={styles.label}>Interview Type</label>
          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
            style={styles.select}
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Context / Job Description / Custom Instructions
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Paste the job description, interview prompt, or any context that will help generate better answers..."
            style={styles.textarea}
            rows={5}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Resume (PDF)</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setResume(e.target.files?.[0] || null)}
            style={styles.fileInput}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating..." : "Create Session"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    background: "#141414",
    borderRadius: 16,
    padding: 40,
    maxWidth: 520,
    width: "100%",
    border: "1px solid #2a2a2a",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 4,
    color: "#fff",
  },
  subtitle: {
    color: "#888",
    marginBottom: 32,
    fontSize: 14,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#aaa",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#e0e0e0",
    fontSize: 15,
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#e0e0e0",
    fontSize: 14,
    resize: "vertical" as const,
    fontFamily: "inherit",
    outline: "none",
  },
  fileInput: {
    color: "#aaa",
    fontSize: 14,
  },
  button: {
    width: "100%",
    padding: "14px 20px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
  },
};
