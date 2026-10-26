# Poker Night


A new, original play-money Texas Hold'em website for private games with friends. Colourful responsive poker table, dark menus, real multiplayer, cash games and single-table tournaments, three local felt themes, six card backs, avatars, live avatar reactions, chat, hand summaries and table-session statistics.

## Run

Use Node.js 22 or newer. Run `npm ci`, then `npm start`, and open http://localhost:3000. Create a table, copy its invite link, and share it with friends. The host starts the game once at least two players have joined. Use separate browsers or private windows when testing multiple players on one device.

## Deploy on Render

Create a Render Web Service connected to this repository. Runtime: Node. Build command: `npm ci`. Start command: `npm start`. Health path: `/health`. Render sets `PORT` automatically. Alternatively use the included `render.yaml` Blueprint. Use one running instance: game state is held in that server's memory. Do not enable horizontal scaling without adding shared storage and Socket.IO coordination.

Cash defaults: 1,000 chips, 5/10 blinds, rebuy when broke. Tournament defaults: 1,000 chips, 25/50 blinds, blinds double every 7 minutes (stack and level duration are configurable), no late entry after starting and no rebuys. Eight seats, 30-second turns; timeout checks when possible and folds otherwise. Every seated player can edit blinds, starting bank and turn timer in Settings. Changes during a hand take effect at the next deal. Starting bank sets lobby stacks before the first deal and future join/rebuy amounts afterwards. Each player has three time cards per table session, adding 60 seconds each to their current turn. Spectators can join a running table, watch public cards and chat; they do not receive private cards or edit settings. Cash spectators can take an open seat for a later hand; tournament seating closes after starting. Appearance is selectable in Collection. Emotes broadcast only to the sender's table. Seated players' reactions appear over their avatars. Spectators can send repeatedly with no emote cooldown; their reactions enter from the left and their emote bank stays open. The client retains at most ten simultaneous spectator videos in two columns of five, replacing the oldest visual during larger bursts.

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

The standalone Tournament button beside the whole information panel requires confirmation. Tournament tables use purple felt and gold rails; the equity panel is hidden and a blind-level schedule shows all 13 levels (level 13 is capped). It queues a fresh tournament after the current hand, resets seated stacks to the configured tournament bank (default 1,000) and blinds to 25/50, and closes seating after play begins.

All-in theme: the user-supplied Hungry Shark Evolution Frontend Theme from https://downloads.khinsider.com/game-soundtracks/album/hungry-shark-evolution-android-ios-gamerip-2012/01.%2520Frontend%2520Theme.mp3 is trimmed to its opening 32 seconds in `public/audio/all-in-theme-32s.mp3`. It loops while the latest action is an all-in, stops at the next valid poker action or showdown, and follows main/effects volume, mute, and table pause.

Tournament Blind Levels is above Turn Timer, uses the configured 1–120 minute duration (default 7), and freezes during pause. Hand reveals (both voluntary and forced) are unavailable in tournament mode; required showdown exposure remains unchanged. Tournament settings use opening blind values to avoid multiplying an already-increased blind a second time.
