import { Link } ;
import { Home, Compass, Swords, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Tab = { to: string; icon: typeof Home; label: string; highlight?: boolean; key?: string };
const tabs: Tab[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/arena", icon: Swords, label: "Arena", highlight: true },
  { to: "/chats", icon: MessageCircle, label: "Chats", key: "chats" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = useLocation().pathname;
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { head: true, count: "exact" })
        .eq("recipient_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    refresh();
    const ch = supabase
      .channel(`nav-msgs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-xl">
      <div className="glass-strong border-t border-glass-border px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        <ul className="flex items-center justify-around">
          {tabs.map(({ to, icon: Icon, label, highlight, key }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            const badge = key === "chats" && unread > 0 ? unread : 0;
            if (highlight) {
              return (
                <li key={to}>
                  <Link
                    to={to}
                    className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary glow text-primary-foreground transition-transform active:scale-95"
                    aria-label={label}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.5} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[11px] transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "text-neon-blue" : ""}`} strokeWidth={active ? 2.5 : 2} />
                  <span>{label}</span>
                  {badge > 0 && (
                    <span className="absolute right-1 top-0 min-w-[18px] rounded-full bg-neon-pink px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
