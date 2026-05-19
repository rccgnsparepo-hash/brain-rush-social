import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteParticipant, createLocalTracks } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";

async function issueToken(payload: { room: string; identity: string }) {
  const { data, error } = await supabase.functions.invoke("livekit-token", { body: payload });
  if (error) throw error;
  return data as { token: string; url: string };
}

function CallPage() {
  const { peerId } = useParams() as { peerId: string };
  const [sp] = useSearchParams();
  const video = sp.get("video") === "1";
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(!!video);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!user) return;
    let r: Room | null = null;
    let cancelled = false;
    (async () => {
      const roomName = [user.id, peerId].sort().join("__");
      const { token, url } = await issueToken({ room: roomName, identity: user.id });
      r = new Room({ adaptiveStream: true, dynacast: true });
      r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, _participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) track.attach(remoteVideoRef.current);
        if (track.kind === Track.Kind.Audio && remoteAudioRef.current) track.attach(remoteAudioRef.current);
      });
      await r.connect(url, token);
      const tracks = await createLocalTracks({ audio: true, video });
      for (const t of tracks) {
        await r.localParticipant.publishTrack(t);
        if (t.kind === Track.Kind.Video && localVideoRef.current) t.attach(localVideoRef.current);
      }
      if (cancelled) { r.disconnect(); return; }
      setRoom(r);
    })().catch((e) => console.error("livekit", e));
    return () => { cancelled = true; r?.disconnect(); };
  }, [user?.id, peerId, video, issueToken]);

  const toggleMute = async () => {
    if (!room) return;
    const next = !muted;
    setMuted(next);
    await room.localParticipant.setMicrophoneEnabled(!next);
  };
  const toggleCam = async () => {
    if (!room) return;
    const next = !camOn;
    setCamOn(next);
    await room.localParticipant.setCameraEnabled(next);
  };
  const hangup = () => { room?.disconnect(); nav(`/chats/${peerId}`); };

  return (
    <AppShell title={
      <>
        <button onClick={hangup} className="rounded-full glass p-2"><ArrowLeft className="h-4 w-4" /></button>
        <div className="font-display font-bold">{video ? "Video call" : "Voice call"}</div>
        <div className="rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-semibold uppercase text-destructive">Live</div>
      </>
    }>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        <audio ref={remoteAudioRef} autoPlay />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 h-32 w-24 rounded-xl border border-glass-border object-cover" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={toggleMute} className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? "bg-destructive/20 text-destructive" : "glass"}`}>
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button onClick={hangup} className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-white">
          <PhoneOff className="h-6 w-6" />
        </button>
        <button onClick={toggleCam} className={`flex h-12 w-12 items-center justify-center rounded-full ${camOn ? "glass" : "bg-secondary/40 text-muted-foreground"}`}>
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
      </div>
    </AppShell>
  );
}

export default CallPage;
