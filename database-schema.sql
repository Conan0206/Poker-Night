CREATE TABLE IF NOT EXISTS poker_hands (
 id uuid PRIMARY KEY, mode text NOT NULL, small_blind integer NOT NULL,
 big_blind integer NOT NULL, boards jsonb NOT NULL, results jsonb NOT NULL,
 bot_version text NOT NULL, finished_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS poker_hand_actions (
 hand_id uuid NOT NULL REFERENCES poker_hands(id), ordinal integer NOT NULL,
 actor_id text NOT NULL, is_bot boolean NOT NULL, street text NOT NULL,
 context jsonb NOT NULL, action jsonb NOT NULL, PRIMARY KEY(hand_id,ordinal)
);
CREATE INDEX IF NOT EXISTS poker_hands_finished_at ON poker_hands(finished_at);
CREATE TABLE IF NOT EXISTS poker_training_runs (
 id uuid PRIMARY KEY, report jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS poker_bot_policies (
 id text PRIMARY KEY, parent_id text, params jsonb NOT NULL,
 metrics jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS poker_active_policy (
 singleton integer PRIMARY KEY CHECK(singleton=1), policy_id text NOT NULL
);
CREATE TABLE IF NOT EXISTS poker_active_tournament_policy (
 singleton integer PRIMARY KEY CHECK(singleton=1), policy_id text NOT NULL
);
