# Poker Night


A new, original play-money Texas Hold'em website for private games with friends. Colourful responsive poker table, dark menus, real multiplayer, cash games and single-table tournaments, three local felt themes, six card backs, avatars, live avatar reactions, chat, hand summaries and table-session statistics.

## Run

Use Node.js 22 or newer. Run `npm ci`, then `npm start`, and open http://localhost:3000. Create a table, copy its invite link, and share it with friends. The host starts the game once at least two players have joined. Use separate browsers or private windows when testing multiple players on one device.

## Deploy on Render

Create a Render Web Service connected to this repository. Runtime: Node. Build command: `npm ci`. Start command: `npm start`. Health path: `/health`. Render sets `PORT` automatically. Alternatively use the included `render.yaml` Blueprint. Use one running instance: game state is held in that server's memory. Do not enable horizontal scaling without adding shared storage and Socket.IO coordination.

Cash defaults: 1,000 chips, 5/10 blinds, rebuy when broke. Tournament defaults: 5,000 chips, 25/50 blinds, blinds double every 10 minutes, no late entry after starting and no rebuys. Eight seats, 30-second turns; timeout checks when possible and folds otherwise. Every seated player can edit blinds, starting bank and turn timer in Settings. Changes during a hand take effect at the next deal. Starting bank sets lobby stacks before the first deal and future join/rebuy amounts afterwards. Each player has three time cards per table session, adding 60 seconds each to their current turn. Spectators can join a running table, watch public cards and chat; they do not receive private cards or edit settings. Cash spectators can take an open seat for a later hand; tournament seating closes after starting. Appearance is selectable in Collection. Emotes broadcast to the table and float above the sender's avatar.

## Limits

Play money only. No accounts, payments, deposits or prizes. Invite codes are access links, not authentication. Player reconnect tokens are stored per browser tab session. Tables, chips and statistics reset on server restart or redeploy. Empty rooms expire after an hour. Free hosting may sleep or restart; use an always-on service for uninterrupted evenings. Tournament blind changes apply between hands. Statistics show measured table-session values, not invented data. Hand history currently contains results, not full replays. Add bot fills an open seat with a basic automated opponent using its own cards and public board only. Bots join cash games on the next hand; add tournament bots before the first deal. No multi-table tournaments in this version.

Card shuffling uses Node's cryptographic random integer generator. Betting and cards are managed server-side; each player receives only their own private cards until showdown. This is a friends-only prototype and has not had a security or independent poker-rules audit.
