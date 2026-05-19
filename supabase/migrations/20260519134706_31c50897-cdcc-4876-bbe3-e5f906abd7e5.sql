
-- Drop trigger that prevented re-using questions across days
DROP TRIGGER IF EXISTS prevent_repeated_challenge_question_trg ON public.challenges;

-- Auto-match: find any online profile, create waiting duel + invite notification
CREATE OR REPLACE FUNCTION public.join_duel_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); other uuid; new_duel uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.profiles SET last_seen_at = now(), updated_at = now() WHERE id = uid;

  -- Pick any online user not already in a waiting/active duel
  SELECT p.id INTO other
  FROM public.profiles p
  WHERE p.id <> uid
    AND p.last_seen_at > now() - interval '60 seconds'
    AND NOT EXISTS (
      SELECT 1 FROM public.duels d
      WHERE d.status IN ('waiting','active')
        AND (d.player_a = p.id OR d.player_b = p.id)
    )
  ORDER BY random()
  LIMIT 1;

  IF other IS NULL THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  INSERT INTO public.duels(player_a, player_b, status, current_round, total_rounds)
  VALUES (uid, other, 'waiting', 0, 5)
  RETURNING id INTO new_duel;

  INSERT INTO public.notifications(user_id, actor_id, type, title, body, link)
  VALUES (other, uid, 'duel_invite', 'Duel challenge!', 'Tap to accept', '/duel/' || new_duel);

  RETURN jsonb_build_object('matched', true, 'pending', true, 'duel_id', new_duel);
END;
$$;

-- Accept the invite: activate the duel and seed round 1
CREATE OR REPLACE FUNCTION public.accept_duel(_duel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); d record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO d FROM public.duels WHERE id = _duel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel not found'; END IF;
  IF d.player_b IS DISTINCT FROM uid THEN RAISE EXCEPTION 'not your invite'; END IF;
  IF d.status <> 'waiting' THEN RETURN; END IF;

  UPDATE public.duels SET status='active' WHERE id = _duel_id;
  PERFORM public.seed_duel_round(_duel_id, 1);
END;
$$;

-- Enable cron + net for scheduled refresh
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
