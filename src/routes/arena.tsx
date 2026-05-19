import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { Swords, Zap, Trophy, Radio, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";


interface DuelRow {
  id: string;
  player_a: string;
  player_b: string | null;
  status: "waiting" | "active" | "finished" | "cancelled";
  current_round: number;
  total_rounds: number;
  score_a: number;
  score_b: number;
  winner_id: string | null;
}

function ArenaPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [matching, setMatching] = useState(false);
  const [activeDuels, setActiveDuels] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [topSchools, setTopSchools] = useState<{ school: string; xp: number }[]>([]);

  const load = async () => {
    const [{ data: duels }, { data: ch }, { data: profs }] = await Promise.all([
      supabase
        .from("duels")
        .select(
          `id, status, score_a, score_b, current_round, total_rounds,
           a:profiles!duels_player_a_fkey ( handle, display_name, avatar ),
           b:profiles!duels_player_b_fkey ( handle, display_name, avatar )`,
        )
        .in("status", ["active", "waiting"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("challenges").select("id, question, difficulty, reward_xp, time_limit").order("created_at", { ascending: false }).limit(5),
      supabase.from("profiles").select("school, xp"),
    ]);
    setActiveDuels(duels ?? []);
    setChallenges(ch ?? []);
    const m = new Map<string, number>();
    (profs ?? []).forEach((p: any) => m.set(p.school, (m.get(p.school) ?? 0) + p.xp));
    setTopSchools([...m.entries()].map(([school, xp]) => ({ school, xp })).sort((a, b) => b.xp - a.xp).slice(0, 3));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("arena-duels")
      .on("postgres_changes", { event: "*", schema: "public", table: "duels" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Listen for own duel match
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my-duels-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "duels" },
        (payload) => {
          const d = payload.new as DuelRow;
          if (d.player_a === user.id || d.player_b === user.id) {
            setMatching(false);
            toast.success("Match found!");
            nav(`/duel/${d.id}`);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, nav]);

  const findMatch = async () => {
    if (!user) return;
    setMatching(true);
    const { data, error } = await supabase.rpc("join_duel_queue");
    if (error) {
      setMatching(false);
      return toast.error(error.message);
    }
    const r = data as { matched: boolean; duel_id?: string };
    if (r.matched && r.duel_id) {
      setMatching(false);
      nav(`/duel/${r.duel_id}`);
    }
  };

  const cancelMatch = async () => {
    if (!user) return;
    await supabase.from("duel_queue").delete().eq("user_id", user.id);
    setMatching(false);
  };

  return (
    <AppShell
      title={
        <>
          <div>
            <div className="font-display text-lg font-bold">Arena</div>
            <div className="text-[11px] text-muted-foreground">{activeDuels.length} live</div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-semibold uppercase text-destructive">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Live
          </div>
        </>
      }
    >
      <button
        onClick={matching ? cancelMatch : findMatch}
        className={`relative w-full overflow-hidden rounded-2xl gradient-primary p-5 text-left text-primary-foreground transition-transform active:scale-[0.99] ${matching ? "animate-glow-pulse" : "glow"}`}
      >
        <div className="flex items-center gap-3">
          {matching ? <X className="h-7 w-7" /> : <Swords className="h-7 w-7" />}
          <div>
            <div className="font-display text-xl font-bold">{matching ? "Searching… tap to cancel" : "Quick Duel"}</div>
            <div className="text-xs opacity-90">5 rounds · 50 XP if you win</div>
          </div>
        </div>
      </button>

      <section className="mt-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio className="h-4 w-4 text-neon-pink" /> Live Duels
        </h2>
        {activeDuels.length === 0 && <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">No active duels. Start one!</div>}
        <div className="space-y-2">
          {activeDuels.map((d) => (
            <button key={d.id} onClick={() => nav(`/duel/${d.id}`)} className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left">
              <Player avatar={d.a?.avatar ?? "👤"} name={d.a?.display_name ?? "?"} />
              <div className="flex flex-col items-center text-xs">
                <span className="font-display text-lg font-bold text-gradient">
                  {d.score_a} - {d.score_b}
                </span>
                <span className="text-muted-foreground">
                  {d.current_round} / {d.total_rounds}
                </span>
              </div>
              <Player avatar={d.b?.avatar ?? "🕒"} name={d.b?.display_name ?? "Waiting…"} reverse />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Zap className="h-4 w-4 text-xp" /> Challenge Board
        </h2>
        <div className="space-y-2">
          {challenges.length === 0 && <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">No challenges yet.</div>}
          {challenges.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground uppercase">{p.difficulty}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {p.time_limit}s
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{p.question}</p>
              <div className="mt-2 text-right">
                <span className="rounded-full gradient-hot px-3 py-1 text-xs font-bold text-primary-foreground">+{p.reward_xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="h-4 w-4 text-xp" /> School Wars
        </h2>
        <div className="glass rounded-2xl p-1">
          {topSchools.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Awaiting first XP gains.</div>}
          {topSchools.map((s, i) => (
            <div key={s.school} className="flex items-center gap-3 rounded-xl p-3">
              <span className={`font-display text-lg font-bold ${i === 0 ? "text-xp" : "text-muted-foreground"}`}>#{i + 1}</span>
              <span className="flex-1 truncate font-semibold">{s.school}</span>
              <span className="font-mono text-sm">{s.xp.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Player({ avatar, name, reverse }: { avatar: string; name: string; reverse?: boolean }) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${reverse ? "flex-row-reverse text-right" : ""}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-lg">{avatar}</div>
      <span className="truncate text-sm font-semibold">{name}</span>
    </div>
  );
}

export default ArenaPage;
