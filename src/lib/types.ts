export type PostType = "text" | "challenge" | "duel" | "achievement";
export type Difficulty = "easy" | "medium" | "hard";

export interface ProfileLite {
  id: string;
  handle: string;
  display_name: string;
  avatar: string;
  school: string;
  level: number;
}

export interface ChallengeRow {
  id: string;
  question: string;
  answer: string;
  options: string[];
  time_limit: number;
  reward_xp: number;
  difficulty: Difficulty;
  solved_count: number;
}

export interface FeedPost {
  id: string;
  user_id: string;
  type: PostType;
  content: string;
  challenge_id: string | null;
  duel_id: string | null;
  achievement_title: string | null;
  achievement_icon: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  profile: ProfileLite;
  challenge: ChallengeRow | null;
  liked_by_me?: boolean;
  reposted_by_me?: boolean;
}

export const timeAgo = (iso: string) => {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
};
