import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Shield, Upload, ArrowLeft, Database } from "lucide-react";

type Row = {
  question: string;
  options: string[];
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
};

// Tiny robust CSV parser (handles quoted fields with commas / escaped quotes).
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { val += '"'; i++; }
      else if (c === '"') inQ = false;
      else val += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(val); val = ""; }
      else if (c === "\n" || c === "\r") {
        if (val.length || cur.length) { cur.push(val); rows.push(cur); cur = []; val = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else val += c;
    }
  }
  if (val.length || cur.length) { cur.push(val); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim().length));
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ total: number; used: number; remaining: number } | null>(null);
  const [preview, setPreview] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/login"); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user, loading, nav]);

  const refreshStats = async () => {
    const { data } = await supabase.rpc("duel_question_stats");
    if (data) setStats(data as any);
  };

  useEffect(() => { if (isAdmin) refreshStats(); }, [isAdmin]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { toast.error("Empty CSV"); return; }
    // Skip header if it looks like one
    const first = rows[0].map((c) => c.trim().toLowerCase());
    const dataRows = first.includes("question") ? rows.slice(1) : rows;

    const parsed: Row[] = [];
    const errors: string[] = [];
    dataRows.forEach((r, i) => {
      const [question, a, b, c, d, answer, diff, cat] = r.map((x) => (x ?? "").trim());
      const opts = [a, b, c, d].filter(Boolean);
      if (!question || opts.length < 2 || !answer) {
        errors.push(`Row ${i + 2}: missing fields`); return;
      }
      if (!opts.includes(answer)) {
        errors.push(`Row ${i + 2}: answer "${answer}" not in options`); return;
      }
      const difficulty = (["easy","medium","hard"].includes(diff) ? diff : "medium") as Row["difficulty"];
      parsed.push({ question, options: opts, answer, difficulty, category: cat || "mixed" });
    });

    if (errors.length) toast.warning(`${errors.length} row(s) skipped`, { description: errors.slice(0,3).join("; ") });
    setPreview(parsed);
    toast.success(`${parsed.length} questions ready to import`);
  };

  const importAll = async () => {
    if (!preview.length) return;
    setBusy(true);
    // Chunk to avoid payload limits
    const chunks: Row[][] = [];
    for (let i = 0; i < preview.length; i += 200) chunks.push(preview.slice(i, i + 200));
    let inserted = 0;
    for (const ch of chunks) {
      const { error, count } = await supabase
        .from("duel_questions")
        .insert(ch.map((r) => ({ ...r })), { count: "exact" });
      if (error) { toast.error(error.message); setBusy(false); return; }
      inserted += count ?? ch.length;
    }
    toast.success(`Imported ${inserted} questions`);
    setPreview([]);
    setBusy(false);
    refreshStats();
  };

  if (loading || isAdmin === null) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Home</Link>
        <div className="glass-strong rounded-2xl p-6 text-center">
          <Shield className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-xl font-bold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user?.email}) is not an admin. Share this email with the system owner to be granted admin access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-5 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Home</Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          <Shield className="h-3 w-3"/> Admin
        </div>
      </div>

      <h1 className="font-display text-2xl font-bold">Duel Questions</h1>
      <p className="text-sm text-muted-foreground">Import questions from CSV. Each question is used at most once across every duel — once picked, it's removed from the pool forever.</p>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Total" value={stats.total} />
          <Stat label="Used" value={stats.used} />
          <Stat label="Remaining" value={stats.remaining} highlight />
        </div>
      )}

      <div className="mt-6 glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Upload className="h-4 w-4"/>Upload CSV</div>
        <p className="text-xs text-muted-foreground mb-3">
          Columns (with header row): <code>question, optionA, optionB, optionC, optionD, answer, difficulty, category</code>.
          <br/>Difficulty: easy / medium / hard. Answer must exactly match one of the options.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
        />

        {preview.length > 0 && (
          <>
            <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-glass-border text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-secondary/60"><tr><th className="p-2 text-left">#</th><th className="p-2 text-left">Question</th><th className="p-2 text-left">Answer</th><th className="p-2 text-left">Diff</th></tr></thead>
                <tbody>
                  {preview.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-glass-border"><td className="p-2">{i+1}</td><td className="p-2">{r.question}</td><td className="p-2 text-success">{r.answer}</td><td className="p-2">{r.difficulty}</td></tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && <div className="p-2 text-center text-muted-foreground">+ {preview.length - 50} more…</div>}
            </div>
            <button
              onClick={importAll}
              disabled={busy}
              className="mt-4 w-full rounded-xl gradient-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Importing…" : `Import ${preview.length} questions`}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 glass rounded-2xl p-4 text-xs text-muted-foreground flex gap-2">
        <Database className="h-4 w-4 shrink-0"/>
        <span>The system never repeats a question. Once a question is picked for any duel, it is permanently excluded from the pool until every question has been used.</span>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`glass rounded-xl p-3 text-center ${highlight ? "ring-1 ring-primary/40" : ""}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}
