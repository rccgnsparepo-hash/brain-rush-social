import { AppShell } from "@/components/app-shell";
import { PostCard } from "@/components/post-card";
import { Flame, Sparkles } from "lucide-react";
import { useAuth, levelProgress } from "@/lib/auth";
import { useEffect, useState } from "react";
import { fetchFeed } from "@/lib/feed";
import type { FeedPost } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/notifications-bell";


function HomePage() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    try {
      const data = await fetchFeed(user.id);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Realtime: any new post or count change triggers a refetch
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
        setPosts((prev) => prev.map((p) => (p.id === (payload.new as any).id ? { ...p, ...(payload.new as any) } : p)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const lvl = profile ? levelProgress(profile.xp, profile.level) : { cur: 0, next: 50, pct: 0 };

  return (
    <AppShell
      title={
        <>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-base">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-base font-bold leading-tight">MindSprint</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Social</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                <Flame className="h-3.5 w-3.5 text-neon-pink" />
                <span className="font-semibold">{profile.streak}</span>
              </div>
            )}
            <NotificationsBell />
          </div>
        </>
      }
    >
      {profile && (
        <div className="glass mb-3 rounded-2xl p-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Level {profile.level}</span>
            <span>
              {profile.xp.toLocaleString()} / {lvl.next.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full gradient-primary transition-all" style={{ width: `${lvl.pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{profile.school}</span>
            <span className="font-display font-bold text-gradient">@{profile.handle}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading && <div className="text-center text-sm text-muted-foreground">Loading feed…</div>}
        {!loading && posts.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
            Feed is empty. Be the first to post a challenge!
          </div>
        )}
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </AppShell>
  );
}

export default HomePage;
