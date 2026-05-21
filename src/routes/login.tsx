import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";


function LoginPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav("/");
  }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    nav("/");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display text-xl font-bold leading-tight">MindSprint</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Welcome back</div>
        </div>
      </div>

      <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-5">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ms-input"
            placeholder="you@school.edu"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="ms-input"
            placeholder="••••••••"
          />
        </Field>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl gradient-primary px-4 py-3 font-bold text-primary-foreground glow disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-neon-blue">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        <Link to="/admin" className="font-semibold text-neon-purple">
          Admin sign in →
        </Link>
      </p>

      <style>{`.ms-input{background:oklch(1 0 0 / 0.06);border:1px solid var(--glass-border);border-radius:0.75rem;padding:0.75rem 0.875rem;font-size:14px;color:var(--foreground);outline:none;width:100%}.ms-input:focus{border-color:var(--neon-purple)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default LoginPage;
