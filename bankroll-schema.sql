CREATE TABLE IF NOT EXISTS poker_accounts (
 id uuid PRIMARY KEY, google_sub text NOT NULL UNIQUE, display_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS poker_account_sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES poker_accounts(id), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS poker_wallets (
 account_id uuid PRIMARY KEY REFERENCES poker_accounts(id), balance bigint NOT NULL CHECK(balance>=0)
);
CREATE TABLE IF NOT EXISTS poker_cash_tables (
 code text PRIMARY KEY, owner uuid, lease_until timestamptz NOT NULL, hand_id uuid
);
CREATE TABLE IF NOT EXISTS poker_cash_seats (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES poker_accounts(id), room_code text NOT NULL REFERENCES poker_cash_tables(code),
 chips bigint NOT NULL CHECK(chips>=0), state text NOT NULL CHECK(state IN ('open','closed')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS poker_one_cash_seat_per_account ON poker_cash_seats(account_id) WHERE state='open';
CREATE TABLE IF NOT EXISTS poker_cash_hands (
 id uuid PRIMARY KEY, room_code text NOT NULL REFERENCES poker_cash_tables(code), owner uuid NOT NULL,
 participants jsonb NOT NULL, status text NOT NULL CHECK(status IN ('playing','settled','void'))
);
CREATE TABLE IF NOT EXISTS poker_wallet_ledger (
 event_key text NOT NULL, account_id uuid NOT NULL REFERENCES poker_accounts(id), kind text NOT NULL,
 wallet_delta bigint NOT NULL, table_delta bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_key,account_id)
);
