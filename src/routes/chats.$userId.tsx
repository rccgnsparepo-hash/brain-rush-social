import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Phone, Video, Paperclip, Mic, Eye, Image as ImgIcon, Square, X } from "lucide-react";
import { toast } from "sonner";
import { uploadChatMedia, uploadChatBg } from "@/lib/upload";

,
});

function ChatPage() {
  const { userId } = useParams() as any;
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [other, setOther] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [viewOnceMode, setViewOnceMode] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<{ rec: MediaRecorder; chunks: Blob[]; start: number } | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: prof }, { data: msgs }] = await Promise.all([
      supabase.from("profiles").select("id, handle, display_name, avatar, avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true }).limit(200),
    ]);
    setOther(prof);
    setMessages(msgs ?? []);
    await supabase.from("messages").update({ read: true }).eq("recipient_id", user.id).eq("sender_id", userId).eq("read", false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`chat-${[user.id, userId].sort().join("-")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as any;
        if ((m.sender_id === user.id && m.recipient_id === userId) || (m.sender_id === userId && m.recipient_id === user.id)) {
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.recipient_id === user.id) supabase.from("messages").update({ read: true }).eq("id", m.id).then(() => {});
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as any;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendText = async () => {
    if (!user || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: userId, content: text, kind: "text" });
    if (error) toast.error(error.message);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    try {
      toast("Uploading…");
      const { url, mime, size } = await uploadChatMedia(user.id, userId, file);
      const kind = viewOnceMode ? "view_once" : mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : "file";
      await supabase.from("messages").insert({
        sender_id: user.id, recipient_id: userId, content: file.name, kind,
        media_url: url, media_mime: mime, media_size: size,
      });
      setViewOnceMode(false);
    } catch (err: any) { toast.error(err.message ?? "Upload failed"); }
  };

  const startRec = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const dur = Date.now() - (recRef.current?.start ?? Date.now());
        const { url, mime, size } = await uploadChatMedia(user.id, userId, blob, `voice-${Date.now()}.webm`);
        await supabase.from("messages").insert({
          sender_id: user.id, recipient_id: userId, content: "Voice note", kind: "voice",
          media_url: url, media_mime: mime, media_size: size, duration_ms: dur,
        });
      };
      rec.start();
      recRef.current = { rec, chunks, start: Date.now() };
      setRecording(true);
    } catch { toast.error("Mic blocked"); }
  };
  const stopRec = () => { recRef.current?.rec.stop(); setRecording(false); };

  const openViewOnce = async (m: any) => {
    setViewing(m);
    if (m.recipient_id === user?.id && !m.viewed_at) {
      await supabase.from("messages").update({ viewed_at: new Date().toISOString() }).eq("id", m.id);
    }
  };

  const setBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !user) return;
    try {
      const url = await uploadChatBg(user.id, f);
      await supabase.from("profiles").update({ chat_bg_url: url }).eq("id", user.id);
      toast.success("Chat background updated");
    } catch (err: any) { toast.error(err.message); }
  };

  const bg = profile?.chat_bg_url;

  return (
    <AppShell
      fullScreen
      title={
        <>
          <button onClick={() => nav("/chats")} className="rounded-full glass p-2"><ArrowLeft className="h-4 w-4" /></button>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full gradient-primary text-base">
              {other?.avatar_url ? <img src={other.avatar_url} alt="" className="h-full w-full object-cover" /> : (other?.avatar ?? "👤")}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{other?.display_name ?? "…"}</div>
              <div className="truncate text-[11px] text-muted-foreground">@{other?.handle ?? ""}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => nav(`/call/${userId}?video=0`)} className="rounded-full glass p-2" aria-label="Voice"><Phone className="h-4 w-4" /></button>
            <button onClick={() => nav(`/call/${userId}?video=1`)} className="rounded-full glass p-2" aria-label="Video"><Video className="h-4 w-4" /></button>
            <button onClick={() => bgRef.current?.click()} className="rounded-full glass p-2" aria-label="Background"><ImgIcon className="h-4 w-4" /></button>
            <input ref={bgRef} type="file" accept="image/*" hidden onChange={setBg} />
          </div>
        </>
      }
    >
      <div
        className="relative flex min-h-[calc(100dvh-132px)] flex-col px-3 pb-24"
        style={bg ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pt-3">
          {messages.length === 0 && <div className="text-center text-xs text-muted-foreground">Say hi 👋</div>}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "gradient-primary text-primary-foreground" : "glass"}`}>
                  <MessageBody m={m} mine={mine} onOpenViewOnce={openViewOnce} />
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-xl items-center gap-1 rounded-t-2xl glass-strong p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <button onClick={() => { setViewOnceMode(false); fileRef.current?.click(); }} className="flex h-9 w-9 items-center justify-center rounded-full glass" aria-label="Attach"><Paperclip className="h-4 w-4" /></button>
        <button onClick={() => { setViewOnceMode(true); fileRef.current?.click(); }} className={`flex h-9 w-9 items-center justify-center rounded-full ${viewOnceMode ? "bg-neon-pink text-white" : "glass"}`} aria-label="View once"><Eye className="h-4 w-4" /></button>
        <input ref={fileRef} type="file" hidden onChange={onPickFile} accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.zip,.xlsx,.xls,.ppt,.pptx" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder={recording ? "Recording…" : "Message…"}
          disabled={recording}
          className="flex-1 bg-transparent px-3 text-sm outline-none"
        />
        {draft.trim() ? (
          <button onClick={sendText} className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
        ) : recording ? (
          <button onClick={stopRec} className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-white"><Square className="h-4 w-4" /></button>
        ) : (
          <button onClick={startRec} className="flex h-9 w-9 items-center justify-center rounded-full glass"><Mic className="h-4 w-4" /></button>
        )}
      </div>

      {viewing && (
        <div onClick={() => setViewing(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <button className="absolute right-3 top-3 rounded-full glass p-2"><X className="h-4 w-4" /></button>
          {viewing.media_mime?.startsWith("video/") ? (
            <video src={viewing.media_url} controls autoPlay className="max-h-full max-w-full" />
          ) : (
            <img src={viewing.media_url} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>
      )}
    </AppShell>
  );
}

function MessageBody({ m, mine, onOpenViewOnce }: { m: any; mine: boolean; onOpenViewOnce: (m: any) => void }) {
  if (m.kind === "image") return <img src={m.media_url} alt="" className="max-h-72 rounded-lg" />;
  if (m.kind === "video") return <video src={m.media_url} controls className="max-h-72 rounded-lg" />;
  if (m.kind === "voice") return (
    <div className="flex items-center gap-2">
      <Mic className="h-4 w-4" />
      <audio src={m.media_url} controls className="h-8" />
      {m.duration_ms ? <span className="text-[11px] opacity-80">{Math.round(m.duration_ms / 1000)}s</span> : null}
    </div>
  );
  if (m.kind === "file") return (
    <a href={m.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
      <Paperclip className="h-4 w-4" />{m.content}
    </a>
  );
  if (m.kind === "view_once") {
    const consumed = !!m.viewed_at;
    if (consumed && !mine) return <span className="italic opacity-70">View-once opened</span>;
    if (consumed && mine) return <span className="italic opacity-70">Opened</span>;
    return (
      <button onClick={() => onOpenViewOnce(m)} className="flex items-center gap-2 font-semibold">
        <Eye className="h-4 w-4" /> View once · tap to open
      </button>
    );
  }
  return <span className="whitespace-pre-wrap">{m.content}</span>;
}

export default ChatPage;
