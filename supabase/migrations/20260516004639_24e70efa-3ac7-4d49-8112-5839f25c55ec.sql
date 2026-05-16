ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS source_question_id uuid REFERENCES public.duel_questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_daily boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_on date,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'mixed';

CREATE UNIQUE INDEX IF NOT EXISTS challenges_source_question_once_idx
  ON public.challenges(source_question_id)
  WHERE source_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS challenges_daily_active_idx
  ON public.challenges(is_daily, active_on DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS profiles_school_xp_idx
  ON public.profiles(school, xp DESC);

CREATE OR REPLACE FUNCTION public.prevent_repeated_challenge_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE normalized text := lower(btrim(regexp_replace(NEW.question, '\s+', ' ', 'g')));
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id <> COALESCE(NEW.id, gen_random_uuid())
      AND lower(btrim(regexp_replace(c.question, '\s+', ' ', 'g'))) = normalized
  ) THEN
    RAISE EXCEPTION 'This challenge question already exists. Try a new one.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.duel_rounds r
    WHERE lower(btrim(regexp_replace(r.question, '\s+', ' ', 'g'))) = normalized
  ) THEN
    RAISE EXCEPTION 'This question was already used in a duel. Try a new one.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_repeated_challenge_question_trg ON public.challenges;
CREATE TRIGGER prevent_repeated_challenge_question_trg
BEFORE INSERT OR UPDATE OF question ON public.challenges
FOR EACH ROW
EXECUTE FUNCTION public.prevent_repeated_challenge_question();

CREATE OR REPLACE FUNCTION public.seed_duel_round(_duel_id uuid, _round_number integer DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  d record;
  q record;
  next_round integer;
  new_round_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO d FROM public.duels WHERE id = _duel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'duel not found'; END IF;
  IF d.status <> 'active' THEN RETURN NULL; END IF;
  IF uid <> d.player_a AND uid <> d.player_b THEN RAISE EXCEPTION 'not a participant'; END IF;

  next_round := COALESCE(_round_number, d.current_round + 1);
  IF next_round < 1 OR next_round > d.total_rounds THEN RETURN NULL; END IF;
  IF next_round > d.current_round + 1 THEN RETURN NULL; END IF;

  SELECT id INTO new_round_id
  FROM public.duel_rounds
  WHERE duel_id = _duel_id AND round_number = next_round;

  IF new_round_id IS NOT NULL THEN
    IF d.current_round < next_round THEN
      UPDATE public.duels SET current_round = next_round WHERE id = _duel_id;
    END IF;
    RETURN new_round_id;
  END IF;

  SELECT * INTO q
  FROM public.duel_questions dq
  WHERE NOT EXISTS (SELECT 1 FROM public.duel_question_usage u WHERE u.question_id = dq.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.source_question_id = dq.id
         OR lower(btrim(regexp_replace(c.question, '\s+', ' ', 'g'))) = lower(btrim(regexp_replace(dq.question, '\s+', ' ', 'g')))
    )
  ORDER BY dq.used_count ASC, random()
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'no fresh duel questions available'; END IF;

  INSERT INTO public.duel_rounds (duel_id, round_number, question, options, answer)
  VALUES (_duel_id, next_round, q.question, q.options, q.answer)
  RETURNING id INTO new_round_id;

  INSERT INTO public.duel_question_usage (duel_id, question_id, round_number)
  VALUES (_duel_id, q.id, next_round)
  ON CONFLICT DO NOTHING;

  UPDATE public.duel_questions SET used_count = used_count + 1 WHERE id = q.id;
  UPDATE public.duels SET current_round = next_round WHERE id = _duel_id;

  RETURN new_round_id;
END;
$$;

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

  DELETE FROM public.duel_queue dq
  WHERE dq.user_id = uid
     OR NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = dq.user_id AND p.last_seen_at > now() - interval '30 seconds'
     );

  SELECT dq.user_id INTO other
  FROM public.duel_queue dq
  JOIN public.profiles p ON p.id = dq.user_id
  WHERE dq.user_id <> uid
    AND p.last_seen_at > now() - interval '30 seconds'
  ORDER BY dq.joined_at ASC
  LIMIT 1;

  IF other IS NOT NULL THEN
    DELETE FROM public.duel_queue WHERE user_id IN (uid, other);
    INSERT INTO public.duels(player_a, player_b, status, current_round, total_rounds)
    VALUES (other, uid, 'active', 0, 5)
    RETURNING id INTO new_duel;

    INSERT INTO public.notifications(user_id, actor_id, type, title, link) VALUES
      (other, uid, 'duel_invite', 'Duel started', '/duel/' || new_duel),
      (uid, other, 'duel_invite', 'Duel started', '/duel/' || new_duel);

    RETURN jsonb_build_object('matched', true, 'duel_id', new_duel);
  END IF;

  INSERT INTO public.duel_queue(user_id) VALUES (uid)
  ON CONFLICT (user_id) DO UPDATE SET joined_at = now();

  RETURN jsonb_build_object('matched', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_daily_challenges(_count integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  inserted_count integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.challenges (creator_id, question, answer, options, time_limit, reward_xp, difficulty, source_question_id, is_daily, active_on, category)
  SELECT
    uid,
    dq.question,
    dq.answer,
    dq.options,
    30,
    CASE WHEN dq.difficulty = 'hard' THEN 60 WHEN dq.difficulty = 'medium' THEN 40 ELSE 25 END,
    dq.difficulty,
    dq.id,
    true,
    current_date,
    dq.category
  FROM public.duel_questions dq
  WHERE NOT EXISTS (SELECT 1 FROM public.challenges c WHERE c.source_question_id = dq.id)
    AND NOT EXISTS (SELECT 1 FROM public.duel_question_usage u WHERE u.question_id = dq.id)
  ORDER BY dq.used_count ASC, random()
  LIMIT greatest(0, least(_count, 10))
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

INSERT INTO public.duel_questions (category, difficulty, question, options, answer)
VALUES
('logic','hard','A code lock uses three distinct digits. The sum is 15, the product is 120, and the largest digit is double the smallest. What is the code in ascending order?', ARRAY['358','456','249','168'], '358'),
('science','hard','Which statement best explains why mitochondrial DNA is commonly used to trace maternal ancestry?', ARRAY['It is inherited mostly from the mother','It mutates faster than nuclear DNA in every gene','It exists only in blood cells','It contains all chromosomes'], 'It is inherited mostly from the mother'),
('math','hard','If f(x)=2x^2-3x+1, what is f(a+1)-f(a)?', ARRAY['4a-1','4a+1','2a-3','2a+1'], '4a-1'),
('history','hard','The Berlin Conference of 1884–85 is most directly associated with which historical process?', ARRAY['Partition of Africa by European powers','Formation of the United Nations','End of the Cold War','Start of the Industrial Revolution'], 'Partition of Africa by European powers'),
('logic','hard','A train travels 180 km at one speed and returns at twice that speed. If the total trip takes 9 hours, what was the slower speed?', ARRAY['30 km/h','45 km/h','60 km/h','75 km/h'], '30 km/h'),
('biology','hard','During photosynthesis, which molecule is split to replace electrons lost by chlorophyll?', ARRAY['Water','Carbon dioxide','Glucose','Oxygen'], 'Water'),
('math','hard','What is the remainder when 7^103 is divided by 6?', ARRAY['1','3','5','0'], '1'),
('literature','hard','In narrative analysis, an unreliable narrator primarily forces readers to question what?', ARRAY['The truth of the account','The genre of the text','The author’s biography','The length of the plot'], 'The truth of the account'),
('chemistry','hard','Which bond type is primarily responsible for water’s unusually high boiling point compared with similar-sized molecules?', ARRAY['Hydrogen bonding','Ionic bonding','Metallic bonding','Nonpolar covalent bonding'], 'Hydrogen bonding'),
('geography','hard','The rain shadow effect occurs when mountains cause air to lose moisture mostly on which side?', ARRAY['Windward side','Leeward side','Equator-facing side','Pole-facing side'], 'Windward side'),
('math','hard','If 3x + 2y = 18 and x - y = 1, what is x?', ARRAY['4','5','6','3'], '4'),
('physics','hard','A moving object doubles its speed. If its mass stays the same, its kinetic energy changes by what factor?', ARRAY['4','2','8','1/2'], '4'),
('logic','hard','Five people each shake hands once with every other person. How many handshakes happen?', ARRAY['10','12','15','20'], '10'),
('science','hard','Which cellular structure is the main site of protein synthesis?', ARRAY['Ribosome','Lysosome','Golgi vesicle','Vacuole'], 'Ribosome'),
('math','hard','The average of four numbers is 18. If three are 12, 20, and 25, what is the fourth?', ARRAY['15','16','17','18'], '15')
ON CONFLICT DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.create_daily_challenges(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_daily_challenges(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_duel_round(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_duel_queue() TO authenticated;