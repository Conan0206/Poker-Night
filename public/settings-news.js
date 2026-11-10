window.renderSettingsCommunity=(body,socket,category)=>{
 const section=document.createElement('section');section.className='settingsCommunity';
 const updates=document.createElement('details');
 const title=document.createElement('summary');title.textContent='What’s new · Recent improvements';updates.append(title);
 const date=document.createElement('p');date.className='fine';date.textContent='Latest update · 10 November 2026';updates.append(date);
 const list=document.createElement('ul');list.className='updateList';
 for(const text of [
  'Fixed the all-in theme being muted by another open table tab.',
  'Cash bots remember hands players choose to show publicly.',
  'Bots practise recorded matches; the all-in theme now loops until showdown.',
  'Simpler payout history and reliable tournament spectator all-in audio.',
  'Tidied left-side bets when watching a six-player table.',
  'Refreshed the homepage with larger game features and the original card fan.',
  'Tutorial now points to the home logo and works correctly in Bot training.',
  'Bots now mix run-once and run-twice choices by play style.',
  'Larger leaderboard text and Average BB, with eliminated players kept in grey.',
  'Fixed card-sound timing, added fold audio and tidied tournament blind formatting.',
  'Added dedicated flop and single-card sounds.',
  'Community-card deals no longer trigger an extra chip-collection sound.',
  'Updated winner chip-slide sound, continuous through distribution.',
  'Simpler reveal tutorial, larger table information and English/Chinese language settings.',
  'Restored chart connector lines and matched style highlights to observed play.',
  'Hover over TAG, LAG, FISH or ROCK in Statistics for a play-style explanation.',
  'Corrected chart colours, simplified bot choices, added type-based names and win-rate tooltips.',
  'Added separate chip sounds for bets and raises.',
  'Reveal hand now shows all bot cards directly when no other human is seated.',
  'Tidied six/seven-player bets, enlarged wager chips and amounts, and simplified the emote bank.',
  'Choose TAG, LAG, FISH, ROCK or Mixed bots, and see measured play-style charts in Statistics.',
  'Bots now have distinct styles and blind-aware tournament play, with separate tournament training.',
  'Added optional turn-alert setup before entry and a notification test in Audio settings.',
  'Individual hand reveals now list human players; bots use Reveal all bot hands.',
  'Run-twice history now groups payouts by run with optional pot details.',
  'Bot training now has unlimited private hand reveals.',
  'Reveals are private; added Reveal all bot hands and renamed Bot training.',
  'Simplified table info to the timer, blinds and starting bank.',
  'Redesigned the homepage with live tables and a simpler invite-code join.',
  'Watch the live Bot training and browse public or locked private tables from the homepage.',
  'Added resumable offline bot training with tested, versioned strategy updates.',
  'Join the main cash or tournament table from the homepage or mode switch.',
  'Tournament raises use BB, with half-BB controls and flexible typed values.',
  'Leaderboards show seated players and refresh after each completed hand.',
  'Added elimination rankings and a champion celebration with party blowers.',
  'Improved bet placement and made tournament BB amounts clearer.',
  'Added tournament reset beside Sit down to reopen seating.',
  'Added adjustable time cards beside the action panel.',
  'Hand rankings appear on community-card hover; tutorial highlights are improved.',
  'Homepage fits one screen; Settings opens on Table settings.',
  'Tournament card backs remain customizable while the felt stays fixed.'
 ]){const li=document.createElement('li');li.textContent=text;list.append(li);}updates.append(list);
 updates.open=true;section.append(updates);body.append(section);
};
