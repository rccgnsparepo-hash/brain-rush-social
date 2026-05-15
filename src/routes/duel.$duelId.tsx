import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Swords, Clock, Trophy, ArrowLeft, Zap } from "lucide-react";

,
});

const ROUND_SECONDS = 6;

function DuelPage() {
  const { duelId } = useParams() as any;
  const { user } = useAuth();
  const nav = useNavigate();
  const [duel, setDuel] = useState<any>(null);
  const [round, setRound] = useState<any>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [intro, setIntro] = useState<"3" | "2" | "1" | "Fight!!" | "Final Round" | null>(null);
  const resolvedRef = useRef<Set<string>>(new Set());
  const advancingRef = useRef<Set<number>>(new Set());

  const isA = !!(user && duel && user.id === duel.player_a);

  const loadDuel = useCallback(async () => {
    const { data } = await supabase
      .from("duels")
      .select(`*, a:profiles!duels_player_a_fkey(handle,display_name,avatar,avatar_url), b:profiles!duels_player_b_fkey(handle,display_name,avatar,avatar_url)`)
      .eq("id", duelId)
      .maybeSingle();
    setDuel(data);
    return data;
  }, [duelId]);

  const loadCurrentRound = useCallback(async (cur?: any) => {
    const d = cur ?? duel;
    if (!d || d.status !== "active") return;
    const { data } = await supabase
      .from("duel_rounds")
      .select("*")
      .eq("duel_id", duelId)
      .eq("round_number", d.current_round)
      .maybeSingle();
    if (data) {
      setRound(data);
      const myAns = isA ? data.answer_a : data.answer_b;
      setPicked(myAns ?? null);
    } else if (d.current_round === 0 && user?.id === d.player_a) {
      await supabase.rpc("seed_duel_round", { _duel_id: duelId, _round_number: 1 });
    }
  }, [duel, duelId, isA, user?.id]);

  // Subscribe
  useEffect(() => {
    loadDuel();
    const ch = supabase
      .channel(`duel-${duelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "duels", filter: `id=eq.${duelId}` }, (p) => {
        setDuel((d: any) => ({ ...(d ?? {}), ...(p.new as any) }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "duel_rounds", filter: `duel_id=eq.${duelId}` }, (p) => {
        const r = p.new as any;
        if (!r) return;
        setRound((cur: any) => (cur && cur.id === r.id ? { ...cur, ...r } : cur ?? r));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [duelId, loadDuel]);

  // When duel.current_round changes, load that round and reset timer
  useEffect(() => {
    if (!duel) return;
    setRound(null);
    setPicked(null);
    setTimeLeft(ROUND_SECONDS);
    if (duel.status === "active") {
      const sequence = duel.current_round >= duel.total_rounds ? ["Final Round", "3", "2", "1", "Fight!!"] : ["3", "2", "1", "Fight!!"];
      sequence.forEach((step, i) => window.setTimeout(() => setIntro(step as typeof intro), i * 520));
      window.setTimeout(() => setIntro(null), sequence.length * 520);
    }
    loadCurrentRound(duel);
  }, [duel?.current_round, duel?.status, loadCurrentRound, duel]);

  // Round timer (server-authoritative resolve when timer ends)
  useEffect(() => {
    if (!round || duel?.status !== "active" || round.winner !== null) return;
    setTimeLeft(ROUND_SECONDS);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          // Server resolves — no waiting on opponent
          (async () => {
            await supabase.rpc("resolve_duel_round", { _round_id: round.id });
            // player_a is the round-master who advances + seeds the next round
            if (user?.id === duel.player_a && !advancingRef.current.has(round.round_number)) {
              advancingRef.current.add(round.round_number);
              setTimeout(async () => {
                const next = round.round_number + 1;
                if (next > duel.total_rounds) {
                  await supabase.rpc("finish_duel", { _duel_id: duelId });
                } else {
                  await supabase.rpc("advance_duel_from_round", { _duel_id: duelId, _round_number: round.round_number });
                }
              }, 1200);
            }
          })();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [round?.id, duel?.status, duel?.player_a, duel?.total_rounds, user?.id, duelId, round?.round_number, round?.winner]);

  // Early-resolve when both have answered
  useEffect(() => {
    if (!round || round.winner !== null) return;
    if (round.answer_a && round.answer_b && !resolvedRef.current.has(round.id)) {
      resolvedRef.current.add(round.id);
      supabase.rpc("resolve_duel_round", { _round_id: round.id });
    }
  }, [round?.answer_a, round?.answer_b, round?.id, round?.winner, round]);

  const submitAnswer = async (opt: string) => {
    if (!round || picked || round.winner !== null) return;
    setPicked(opt);
    const patch = isA
      ? { answer_a: opt, answered_at_a: new Date().toISOString() }
      : { answer_b: opt, answered_at_b: new Date().toISOString() };
    await supabase.from("duel_rounds").update(patch).eq("id", round.id);
  };

  if (!duel) return <div className="p-8 text-center text-muted-foreground">Loading duel…</div>;

  const me = isA ? duel.a : duel.b;
  const opp = isA ? duel.b : duel.a;
  const myScore = isA ? duel.score_a : duel.score_b;
  const oppScore = isA ? duel.score_b : duel.score_a;
  const showResult = round && round.winner !== null;

  return (
    <AppShell
      title={
        <>
          <button onClick={() => nav("/arena")} className="rounded-full glass p-2"><ArrowLeft className="h-4 w-4" /></button>
          <div className="font-display font-bold">Live Duel</div>
          <div className="rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-semibold uppercase text-destructive">Live</div>
        </>
      }
    >
      {intro && <FighterOverlay text={intro} final={intro === "Final Round"} />}

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <PlayerCard p={me} score={myScore} you />
          <Swords className="h-6 w-6 text-neon-purple" />
          <PlayerCard p={opp} score={oppScore} reverse />
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          Round {Math.max(1, duel.current_round)} / {duel.total_rounds}
        </div>
      </div>

      {duel.status === "active" && round && (
        <div className="mt-4 glass-strong rounded-2xl p-5 animate-fade-in">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold uppercase">Round {round.round_number}</span>
            <span className="flex items-center gap-1 text-warning"><Clock className="h-3 w-3" /> {timeLeft}s</span>
          </div>
          <p className="mb-4 text-lg font-semibold">{round.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {round.options.map((opt: string) => {
              const isPicked = picked === opt;
              const isCorrect = showResult && opt === round.answer;
              const isWrongPick = showResult && isPicked && opt !== round.answer;
              return (
                <button
                  key={opt}
                  disabled={!!picked || showResult}
                  onClick={() => submitAnswer(opt)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                    isCorrect ? "border-success bg-success/15 text-success"
                    : isWrongPick ? "border-destructive bg-destructive/15 text-destructive"
                    : isPicked ? "border-neon-purple bg-neon-purple/15"
                    : "border-glass-border bg-secondary/40 hover:border-neon-purple"
                  } disabled:opacity-70`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {picked && !showResult && (
            <div className="mt-3 text-center text-xs text-muted-foreground">Locked in. Waiting on timer or opponent…</div>
          )}
          {showResult && (
            <div className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-xp animate-fade-in">
              <Zap className="h-3 w-3" /> Round winner: {round.winner ? (round.winner === user?.id ? "You" : opp?.display_name ?? "Opponent") : "Tie"}
            </div>
          )}
        </div>
      )}

      {duel.status === "finished" && (
        <div className="mt-4 glass-strong rounded-3xl p-6 text-center animate-fade-in">
          <Trophy className={`mx-auto h-12 w-12 ${duel.winner_id === user?.id ? "text-xp" : "text-muted-foreground"}`} />
          <div className="mt-2 font-display text-2xl font-bold">
            {!duel.winner_id ? "Draw" : duel.winner_id === user?.id ? "Victory!" : "Defeat"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">Final {myScore} - {oppScore}</div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => nav(`/recap/${duelId}`)} className="flex-1 rounded-full gradient-primary px-6 py-2 text-sm font-bold text-primary-foreground">
              View recap
            </button>
            <button onClick={() => nav("/arena")} className="flex-1 rounded-full glass-strong px-6 py-2 text-sm font-bold">
              Arena
            </button>
          </div>
        </div>
      )}

      {duel.status === "waiting" && (
        <div className="mt-4 text-center text-sm text-muted-foreground">Waiting for opponent…</div>
      )}
    </AppShell>
  );
}

function FighterOverlay({ text, final }: { text: string; final?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-background/90">
      <div className="absolute left-[12%] bottom-[22%] h-28 w-20 animate-fighter-left rounded-t-full gradient-primary shadow-glow" />
      <div className="absolute right-[12%] bottom-[22%] h-28 w-20 animate-fighter-right rounded-t-full gradient-hot shadow-glow-purple" />
      {final && <div className="absolute inset-x-0 bottom-[15%] mx-auto h-28 max-w-sm animate-charge rounded-full bg-xp/20 blur-3xl" />}
      <div className={`relative font-display text-6xl font-black uppercase tracking-normal ${final ? "text-xp" : "text-gradient"}`}>
        {text}
      </div>
    </div>
  );
}

function PlayerCard({ p, score, reverse, you }: { p: any; score: number; reverse?: boolean; you?: boolean }) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${reverse ? "flex-row-reverse text-right" : ""}`}>
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full gradient-primary text-2xl">
        {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p?.avatar ?? "👤")}
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{you ? "You" : "Opponent"}</div>
        <div className="truncate text-sm font-semibold">{p?.display_name ?? "Waiting…"}</div>
        <div className="font-display text-lg font-bold text-gradient">{score}</div>
      </div>
    </div>
  );
}

export default DuelPage;
