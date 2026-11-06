# Poker Night


A new, original play-money Texas Hold'em website for private games with friends. Colourful responsive poker table, dark menus, real multiplayer, cash games and single-table tournaments, three local felt themes, six card backs, avatars, live avatar reactions, chat, hand summaries and table-session statistics.

## Run

Use Node.js 22 or newer. Run `npm ci`, then `npm start`, and open http://localhost:3000. Create a table, copy its invite link, and share it with friends. The host starts the game once at least two players have joined. Use separate browsers or private windows when testing multiple players on one device.

## Deploy on Render

Create a Render Web Service connected to this repository. Runtime: Node. Build command: `npm ci`. Start command: `npm start`. Health path: `/health`. Render sets `PORT` automatically. Alternatively use the included `render.yaml` Blueprint. Use one running instance: game state is held in that server's memory. Do not enable horizontal scaling without adding shared storage and Socket.IO coordination.

Cash defaults: 1,000 chips, 5/10 blinds, rebuy when broke. Tournament defaults: 1,000 chips, 5/10 blinds (100 BB), gentle blind increases every 7 minutes (stack and level duration are configurable), no late entry after starting and no rebuys. Eight seats, 30-second turns; timeout checks when possible and folds otherwise. Every seated player can edit blinds, starting bank and turn timer in Settings. Changes during a hand take effect at the next deal. Starting bank sets lobby stacks before the first deal and future join/rebuy amounts afterwards. Each player has three time cards per table session, adding 60 seconds each to their current turn. Spectators can join a running table, watch public cards and chat; they do not receive private cards or edit settings. Cash spectators can take an open seat for a later hand; tournament seating closes after starting. Appearance is selectable in Collection. Emotes broadcast only to the sender's table. Seated players' reactions appear over their avatars. Spectators can send repeatedly with no emote cooldown; their reactions enter from the left and their emote bank stays open. The client retains at most ten simultaneous spectator videos in two columns of five, replacing the oldest visual during larger bursts.

## Limits

Play money only. No accounts, payments, deposits or prizes. Invite codes are access links, not authentication. Player reconnect tokens are stored per browser tab session. Tables, chips and statistics reset on server restart or redeploy. Empty rooms expire after an hour. Free hosting may sleep or restart; use an always-on service for uninterrupted evenings. Tournament blind changes apply between hands. Statistics show measured table-session values, not invented data. Hand history currently contains results, not full replays. Add bot fills an open seat with an automated opponent using the solver and fallback strategy described below. Bots join cash games on the next hand; add tournament bots before the first deal. No multi-table tournaments in this version.

Card shuffling uses Node's cryptographic random integer generator. Betting and cards are managed server-side; each player receives only their own private cards until showdown. This is a friends-only prototype and has not had a security or independent poker-rules audit.


## Bot strategy and solver scope

Bots use only their own hole cards, the public board, public stacks and betting statistics. They cannot read another player's private cards. Human-like think time remains separate from the strategy engine.

Heads-up postflop decisions now use an online chance-sampled counterfactual regret minimization (CFR) solver. It samples 40 range combinations per player (merging duplicates and retaining the bot's actual combination), constructs a legal betting tree with approximately one-third, three-quarter and 1.25-pot sizes plus eligible short-stack shoves, and allows at most one re-raise. Each action is drawn from the learned average strategy rather than a hard-coded bluff percentage. Search runs for up to 24,000 iterations within an 850 ms compute budget in a worker thread; at most two workers run concurrently. Late, failed, overloaded or insufficiently visited solves fall back to the existing range-based rules. Responses from an obsolete hand/street/turn are discarded.

This is a solver-derived **sampled one-street abstraction**, not a complete Hold'em equilibrium solution. River showdown values use exact hand ranks for the sampled ranges. Flop/turn terminal values estimate equity with 12/16 future-board rollouts and assume no betting on later streets. Range weights still use heuristic public-statistics assumptions. Preflop and three-or-more-player pots retain the positional/range-aware heuristic engine. No licensed commercial solver data or trained full-game blueprint is bundled, and professional-level or unexploitable play is not claimed. Increasing aggression or simulation count alone does not establish GTO strength.

Validation includes legal actions/stack caps, range card blockers, unbeatable-hand behavior, hidden-card independence, deadline fallback and worker event-loop responsiveness. The CFR core is tested against Kuhn poker's known -1/18 equilibrium value and exhaustive best responses in that small game. That benchmark validates the core algorithm; it does not measure exploitability or playing strength in full Hold'em.

Algorithm background: Zinkevich et al., [Regret Minimization in Games with Incomplete Information](https://papers.nips.cc/paper/3306-regret-minimization-in-games-with-incomplete-information); Brown and Sandholm, [Superhuman AI for multiplayer poker](https://doi.org/10.1126/science.aay2400). This implementation uses standard signed-regret CFR with regret matching, not CFR+.


### Feedback email
Player feedback is forwarded server-side through FormSubmit to conantai2006@gmail.com. The owner must activate the form using FormSubmit's confirmation email once. Feedback is also logged as `player-feedback`; forwarding results are logged as `feedback-email`. Delivery is acknowledged only when the provider accepts the request; failed submissions keep the browser draft. FormSubmit acceptance does not prove inbox delivery. Set `FEEDBACK_EMAIL_ENABLED=false` to use logs only (used by automated integration tests). No Gmail password is stored.


### Shared table controls
Pause below Settings freezes turn timeouts, bot thinking, all-in board runouts, the next-hand timer, and tournament blind-level time. Any seated human can toggle it; a spectator may manage it when no human is seated. Poker actions and time cards are rejected while paused.

The standalone Tournament button beside the whole information panel requires confirmation. Tournament tables use purple felt and gold rails; the equity panel is hidden and a blind-level schedule shows all 13 levels (level 13 is capped). It queues a fresh tournament after the current hand, resets seated stacks to the configured tournament bank (default 1,000) and blinds to 5/10, and closes seating after play begins.

All-in theme: the user-supplied Hungry Shark Evolution Frontend Theme from https://downloads.khinsider.com/game-soundtracks/album/hungry-shark-evolution-android-ios-gamerip-2012/01.%2520Frontend%2520Theme.mp3 is trimmed to its opening 32 seconds in `public/audio/all-in-theme-32s.mp3`. It loops while the latest action is an all-in, stops at the next valid poker action or showdown, and follows main/effects volume, mute, and table pause.

Tournament Blind Levels is above Turn Timer, uses the configured 1–120 minute duration (default 7), and freezes during pause. Hand reveals (both voluntary and forced) are unavailable in tournament mode; required showdown exposure remains unchanged. Tournament settings use opening blind values to avoid multiplying an already-increased blind a second time.

The mode switch is anchored outside the information panel and reads Cash in tournaments. Switching back waits for settlement, preserves stacks, restores the previous cash blinds and starting-bank setting, and reopens seating/reveals. The star toolbar menu ranks current stacks in chips and current big blinds; tied chip leaders share a star. Blind multipliers are defined once in `public/tournament-structure.js` and the complete schedule is published by the server.


## PostgreSQL and learning data foundation

Use Neon Free PostgreSQL (no fixed trial expiry; storage/compute quotas still apply). Create a project near the Render service (US East/Virginia). Copy the pooled connection string into the existing Render service's `DATABASE_URL` environment variable. Keep TLS certificate verification enabled; the server upgrades `sslmode=require` to `sslmode=verify-full`. Do not paste credentials into GitHub, public files or chat. Locally, copy `.env.example` to `.env`, fill it privately, and run `npm run db:check`.

On connection the server creates `poker_hands` and `poker_hand_actions` from `database-schema.sql`. Completed hands are written atomically with validated actions. Records include public boards, numeric results and each bot's own cards at its decisions; human hole cards, names, tokens and connection secrets are not archived. A unique UUID per deal prevents collisions across server restarts; writes are idempotent. The game continues if storage is temporarily unavailable; `/health` reports only `database.configured` and `database.connected`, never credentials. Failed writes are logged by error code only and are not guaranteed to be replayed.

Hands provide an append-only record; persistent human-identity tracking is not enabled. Offline parameter training is described below. The separate bot strategy update adds context-sensitive check-raises, occasional trapping checks, selective donk leads and blocker/draw-based bluffs using observed public behavior. Heads-up CFR still handles ordinary solver decisions. These are heuristics, not a measured guarantee of stronger or GTO play.


## Live bot training and table directory

The homepage lifts the artwork/intro above a live directory. `/api/tables` returns the main cash/tournament tables, Bot training and occupied private rooms. Private listings are anonymous and omit their invite codes, names and session IDs; the host must still share the invite code. Counts distinguish seated players from watchers. Empty private rooms are omitted.

The reserved `BOTS` room automatically deals to four bots while the server is awake, even without human players. It uses the normal game engine, histories, payouts and database logging. Spectators cannot sit, add/kick bots, pause or change its settings. Busted bots receive a fresh practice stack between hands; excessively deep stacks also reset. Set `BOT_ARENA=off` to disable autoplay. This does not prevent Render Free from sleeping and is not a 24/7 hosting guarantee.

## Bounded automatic training

`npm run train:nightly` runs locally for at most 15 minutes (plus the current hand and database shutdown). `npm run train:check` runs a short non-promoting pipeline check. Requires Node 22 and the ignored local `.env` containing the existing Neon `DATABASE_URL`. No API/model-training fees or extra paid services are introduced. Only one training process runs at a time. Training does not run on the live Render event loop.

This is parameter search over six bounded multiway check-raise, trapping, donk and bluff frequencies, not neural-network training or a claim of GTO strength. The trainer plays independent cash hands with shuffled decks, proper blinds, legal raises, short all-ins and side pots. Candidates are screened with separate seeds, then tested on held-out duplicate deals, rotating all seats, at 30/60/100/150 BB, against the incumbent plus calling-station, tight and aggressive opponents at 3- and 6-player tables. Opponents and policies only see their own hole cards and public history. Human hole cards are never used. The HU continuation in this offline benchmark uses the heuristic rather than the live bounded CFR search, so results are a limited benchmark, not a guarantee of live performance. Tournament play and heads-up tactic frequencies remain at the default policy.

Checkpointed validation accumulates across nights under `.training/`, invalidating on policy-parent or simulation/strategy-code changes. Promotion requires 2,000 complete independent validation blocks, full 700-sample equity estimates, a positive 99% normal-approximation lower confidence bound on paired BB/100 improvement, and no negative mean in any of eight opponent/table-size groups. Incomplete, noisy or regressing candidates never replace the live policy. A run can finish without any improvement. Each cycle ends after one held-out test; the next cycle gets fresh seeds.

Neon stores `poker_training_runs`, immutable `poker_bot_policies`, and one `poker_active_policy` pointer. Reports also remain locally in `.training/<run-id>.json`. Promotion checks the expected parent version in a transaction; a stale run cannot overwrite a newer policy. The server checks the pointer at most every 30 minutes, freezes the selected version for each new hand, and applies approved frequency changes only to multiway cash decisions. Completed hand records include the policy version. No policy changes mid-hand. Keep prior policy rows to support rollback by updating the active pointer to an existing policy ID.

The nightly Codex schedule runs this command in the existing checkout at 03:00 Asia/Kuala_Lumpur. The computer must be on with the desktop app running and the checkout available. Reports and checkpoints are ignored by Git; the automation does not edit source, push commits, change hosting plans or print credentials. Watching the live arena produces recorded matches, but the separate offline evaluation is what decides whether a strategy update qualifies.


## Private hand reveals

Cash-game Reveal hand exposes a chosen hidden hand only in the requesting viewer's state, after settlement and before the next deal. The server keeps a per-hand viewer/target map outside serialized player objects; it does not change public `shown` flags. Reveal all bot hands is available in cash games and Bot training, and costs one reveal in cash games for all currently hidden bot hands. Bot training has unlimited private single-hand and all-bot reveals; it never consumes an allowance. Repeated requests with no new hidden targets do not consume uses. Cash-game per-viewer allowances default to three per table session. Public showdown/all-in cards and voluntary self-reveals remain public. Optional private reveals are rejected during betting and in tournaments; new deals clear the private map.


Run-twice hand history stores a public snapshot of both boards and aggregates each player's winnings per run. Main/side-pot breakdowns are collapsed by default; uncalled chips are listed separately from winnings. No private hole cards or reveal maps are added to history. Older repeated Run 1/Run 2 messages are grouped when their full format can be recognized. Tournament BB formatting and blind-level dividers remain in place.


## Notification permission and diagnostics

A first-time player choosing Join/Create/Watch sees an optional turn-alert setup before the socket enters the table. Enable alerts requests browser permission from that explicit click; Not now continues without alerts. Granted, enabled permissions and saved choices avoid repeat prompts. Table entry remains available when notifications are unsupported or denied. Reconnects do not prompt. Each person's preference stays in local storage; the bell toggles it.

Turn/all-in notifications are sent while the table is hidden or unfocused, and are suppressed while actively focused or paused. Settings → Audio → Browser notifications includes a Send test notification button that bypasses the away-only filter, plus Chrome/Windows troubleshooting instructions. A successful constructor/test-send does not prove Windows displayed a banner; Chrome permission, Windows app banners and Do not disturb can independently affect presentation. No website can override a browser-denied permission or Windows notification policy.

The individual reveal list contains human players only. Bots are exposed through Reveal all bot hands; privacy, post-hand timing and cash/Training allowances remain unchanged.
