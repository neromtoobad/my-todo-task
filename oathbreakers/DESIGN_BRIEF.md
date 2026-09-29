# OATHBREAKERS - Design Brief (v1, draft for approval)

Create and deploy a single-player browser game via the Higgsfield pipeline. Read the game creation instructions first, then build and deploy it. Ask before publishing to the marketplace.

## TITLE

**Oathbreakers - Ravenholt Castle**

Pitch: Twelve strangers. One castle. Three liars. Win gold on missions, work the room between them, and vote at the Round Table to exile the Oathbreakers before they murder you in the night.

## GENRE

Single-player social deduction reality game. You are one contestant among 11 AI characters, each with a generated face, voice, personality and memory. Cinematic, candlelit, realistic.

Naming rule: the game is inspired by the reality-TV social deduction format but uses its own names for everything. Never mention any real TV show, network or host anywhere in the game, the code comments shown to players, or the marketplace card.

## ROLES

| Role | Count at start | Goal | Knows |
|---|---|---|---|
| **Sworn** (the loyal) | 9 | Exile every Oathbreaker, then split the pot | Only their own role |
| **Oathbreaker** (the traitors) | 3 | Survive to the end and take the whole pot | Who the other Oathbreakers are |

- The player's role is dealt at random each season (about a 1 in 4 chance of being an Oathbreaker). The menu lets the player force a role.
- **The Steward** is the host. They narrate, run the ceremonies and deal the twists, and they are not a contestant. **Host design is open:** the user is describing a new host (replacing the draft Lady Isolde Vane). "The Steward" is a placeholder title until then.

## CORE LOOP (one in-game day)

1. **BREAKFAST** (from Day 2) - Contestants enter the Great Hall in small groups, and their portraits fade in one by one. Whoever never arrives was murdered, and their portrait turns grey with candle smoke. The group reacts. The player picks one reaction line.
2. **MISSION** - A mini-game or a story scene (alternating). It adds gold to the shared pot and may award a secret Shield or the Dagger. Oathbreakers may secretly sabotage, which leaves clues.
3. **THE GALLERY** (free time) - The player gets 3 private conversations and 1 eavesdrop. They can type freely to any AI contestant or tap a quick prompt. Every character remembers what you said and may repeat it at the table.
4. **THE ROUND TABLE** - Discussion (AI accusations and defenses, and the player gets 2 interjections), then a secret written vote. Votes are revealed one at a time, each with a spoken reason. The player with the most votes is exiled and reveals their role.
5. **NIGHT** - Sworn player: a short night sequence, then dawn. Oathbreaker player: the Tower meeting with the AI Oathbreakers to choose tonight's murder, or to recruit.

## SEASON STRUCTURE (about 35-45 minutes)

12 contestants. Each day usually removes 2 (one exile, one murder).

| Day | Start | Mission | Type | Pot max | Special |
|---|---|---|---|---|---|
| 0 | 12 | Arrival and role dealing | Cutscene | - | Role reveal |
| 1 | 12 | THE SEALED VAULT | Mini-game | 5,000 | 1 Shield |
| 2 | 10 | THE CROSSROADS | Story scene | 6,000 | Shield-for-gold sacrifice |
| 3 | 8 | THE LANTERN RUN | Mini-game | 7,000 | The Dagger |
| 4 | 6 | THE MIRROR HALL | Story scene | 8,000 | 1 Shield |
| Finale | 4 | THE LAST CANDLE | Endgame | - | No-reveal exiles |

Max pot: 26,000 gold. Recruitments and ultimatums can change the count, and the engine adapts: the finale always triggers when 4 or fewer remain after a night.

## RULES AND TWISTS (v1 scope: classic + a few)

- **Murder:** each night the Oathbreakers choose one Sworn to murder. There is no murder on the night of Day 0.
- **Shield:** protects its holder from murder for that night only, not from exile. It is secret: only the holder knows unless they tell. If the Oathbreakers target a shielded player, the murder fails and everyone comes to breakfast (the Oathbreakers learn who was shielded).
- **Recruitment:** on the night after an Oathbreaker is exiled, the surviving Oathbreakers may recruit one Sworn instead of murdering. The Sworn may refuse (they stay Sworn, and there is no murder that night).
- **Ultimatum:** if only one Oathbreaker remains and 5 or more players are alive, they may deliver an ultimatum instead of a normal recruit: join or be murdered on the spot.
- **The Dagger:** won secretly in the Day 3 mission. The holder can make their vote count twice at one of the next 2 Round Tables. Using it is announced to the table.
- **Ties:** revote among only the tied names (the tied players do not vote). If it is still tied, the Steward draws stones at random.
- **The Last Candle (finale):** with 4 or fewer left, each player votes END THE GAME or EXILE AGAIN. Ending requires a unanimous vote. Anyone exiled at the Last Candle leaves without revealing their role. The game also ends automatically when 2 remain.
- **Payout:** only Sworn remain, so they split the pot equally. Any Oathbreaker remains, so the surviving Oathbreakers take it all.

Out of scope for v1 (planned for later): Secret Oathbreaker, murder in plain sight, blocked murder, public armoury.

## CONTROLS

Mouse or touch for everything. The game is fully playable on mobile.

| Input | Action |
|---|---|
| Click / tap | Select portraits, choices and buttons |
| SPACE or click | Advance dialogue and cutscenes |
| ENTER | Send a chat message in the Gallery |
| J | Open or close the Journal |
| R | Peek at your role card (hold) |
| ESC | Pause menu |
| 1-6 | Tap runes in THE SEALED VAULT |
| SPACE or tap | Light a lantern in THE LANTERN RUN |

## MISSIONS

| # | Name | Type | How it plays | Clues / rewards |
|---|---|---|---|---|
| 1 | **THE SEALED VAULT** | Memory mini-game | A relay of 6 contestants each repeats a growing rune sequence (like a lock combination). The player plays their leg live; AI legs are simulated from each character's skill. Each correct leg adds 800 gold (plus a 200 perfect-run bonus). | Oathbreakers have a 35% chance to "slip" on purpose. The log shows who slipped and on which rune. The highest scorer finds the Shield. |
| 2 | **THE CROSSROADS** | Story scene | Three teams carry gold chests through a forest by different paths. The player chooses a path and makes 3 choices along the way (help a stuck cart, trust a stranger's shortcut, split up or stay together). | One chest arrives lighter. It came from a team that has at least one Oathbreaker (true 80% of the time). The Steward offers a Shield to one volunteer at the cost of 1,500 gold from the pot. The volunteer stays secret, but everyone sees the pot drop. |
| 3 | **THE LANTERN RUN** | Timing mini-game | Lanterns swing across the moat bridge, and the player lights each one when its ring aligns (SPACE or tap). 20 lanterns, with the speed rising each set of 5. Team total sets the gold. | The top scorer wins the Dagger (secret). The per-player lantern counts are posted, and a lowball score from a strong player is a tell. |
| 4 | **THE MIRROR HALL** | Story scene | The player walks a hall of mirrors with 3 riddle doors. Right answers add gold. At the end the Steward offers a Glimpse: spend 2,000 gold of the pot to learn a list of 3 names, at least one of which is an Oathbreaker (if any remain). | The Glimpse is public if bought. The Shield goes to whoever solves the final riddle fastest. |

## AI CAST (11 contestants)

Rule: the engine decides, and Claude speaks. Votes, murders, recruitments and sabotage are decided by a deterministic game engine using each character's suspicion scores and strategy. Claude writes what the characters say, so their words always match what they actually do.

Each character has: name, age, job, 4 trait sliders (Perception, Deception, Loudness, Loyalty), a speech style, a backstory, a secret role, a memory log (what they saw, heard and were told) and a suspicion score toward every other player.

Cast: a global mix of invented celebrities (locked). Full cards with traits, Sworn and Oathbreaker play styles, tells, voice, look and signature lines are in `CAST.md`. Every character is fictional and not based on any real person.

| # | Name | Age | From | Famous for | Tell (when lying) |
|---|---|---|---|---|---|
| 1 | Adaeze "Ada" Okonkwo | 36 | Nigeria | TV detective in *Inspector Ada* | Closes her notebook |
| 2 | Rafael "Rafa" Duarte | 28 | Brazil | Superstar striker | Swears "on my mother" more |
| 3 | Han Min-seo | 24 | South Korea | K-pop group center | Shorter, extra-polite answers |
| 4 | Dame Celia Hartwell | 68 | UK | Legendary Shakespearean actress | Quotes Shakespeare when cornered |
| 5 | Marcus Vale | 45 | USA | Late-night talk show host | Answers a question with a question |
| 6 | Marisol Ibarra | 49 | Mexico | Beloved TV chef | Cooks a special dish for her next victim |
| 7 | Kenji Moriyama | 41 | Japan | Las Vegas illusionist | Rolls a coin across his knuckles |
| 8 | Tomas Lindqvist | 52 | Sweden | Chess grandmaster turned poker champion | His percentages leave himself out |
| 9 | Zara Haddad | 30 | Lebanon / Paris | Supermodel turned designer | Never shades fellow Oathbreakers |
| 10 | Kwame Mensah | 38 | Ghana / London | Arena-tour stand-up comedian | The jokes stop |
| 11 | Tayla Brooks | 26 | Australia | Olympic swimming champion | Her mission scores drop |

Relationship web: Rafa and Zara (tabloid exes), Celia and Marcus (on-air feud), Kenji and Tomas (rival people-readers), Min-seo and Tayla (fast friends), Kwame and Marcus (former writer and boss).

**Player identity:** the player picks a face (6 avatars: 3 women, 3 men, varied ages and ethnicities, styled as celebrities) and what they are famous for. That choice sets first impressions: cast members in the same field start as mild rivals, and one or two random cast members start as fans (small trust bonus). It changes dialogue and starting suspicion only, with no gameplay perks.

### AI behavior

- **Suspicion model:** each AI updates suspicion from evidence events: mission sabotage clues, vote history (who voted for an exiled Sworn or protected an exiled Oathbreaker), who survives the nights, Shield or Dagger claims, and what the player says to them in private.
- **Sworn AI:** vote for their most suspected player, with some herd behavior weighted by Loudness and Loyalty.
- **Oathbreaker AI:** murder the Sworn who suspects them most or is most influential, avoid murdering people who are loudly accusing them (that looks guilty), sometimes vote against a fellow Oathbreaker who is doomed anyway ("bussing"), and fake suspicion of a Sworn scapegoat.
- **Tells:** Oathbreakers sabotage missions, vote late to join the majority, over-defend each other and claim Shields they don't have. The tells are probabilistic, so an attentive player can learn to spot them, but they are never certain.
- **Guardrails:** a character's prompt only includes what that character could know. Oathbreaker chat is checked so it never states its own role. If a reply leaks a role or breaks character, it is regenerated once, then replaced with a template line.
- **Output format:** every Claude reply is JSON `{ "line": string, "emotion": "neutral" | "suspicious" | "shocked" | "smug" }`, and the emotion swaps the portrait expression.

## ART DIRECTION (locked style)

Locked style prompt for all images: "Cinematic photoreal, moody candlelit Scottish castle, deep shadows, warm amber candlelight against cold blue-grey stone, film grain, shallow depth of field, rich textures of wool, velvet, oak and iron, prestige TV drama color grade."

- **Palette:** candle amber `#E8A33D`, blood crimson `#8E1B1B`, castle stone `#2B2F36`, midnight `#0E1117`, parchment `#EFE3C8`.
- **Typography:** Cinzel (titles), Cormorant Garamond (body), both from Google Fonts.
- **Characters:** photoreal waist-up portraits in 3:4, each in their signature celebrity look from `CAST.md`, lit by candlelight inside the castle. Each has 4 expressions (neutral, suspicious, shocked, smug) made from one hero portrait with character consistency.
- **Murdered state:** the portrait desaturates in code, with a candle-smoke overlay and a red wax X.
- **UI:** parchment cards with wax seals, iron-framed panels, and a soft vignette. Votes are written on parchment and slapped face-down onto the oak table.

### Higgsfield asset list

| Asset | Count | Spec |
|---|---|---|
| Cast hero portraits | 11 | 3:4 photoreal |
| Cast expression variants | 33 | 3 extra per character, same identity |
| Player avatars | 6 | 3:4, same style |
| The Steward | 1 portrait + 3 video clips | Intro, Round Table open, Last Candle |
| Exile reveal clips | 11 | 5s each: the character stands and turns to the table (no speech; the role reveal is an audio line plus an overlay) |
| Backgrounds (16:9) | 10 | Castle exterior at dusk (menu), Great Hall breakfast, Gallery, Round Table chamber, Tower, Vault, Forest crossroads, Moat bridge, Mirror hall, Last Candle fire pit |
| Ambient video loops | 2 | Round Table candle flicker, castle exterior with drifting clouds |
| Marketplace thumbnail | 1 | 16:9 |
| Favicon | 1 | 1:1 |

## SOUND

- **Music:** main theme (brooding strings with a low choir), Round Table tension loop (ticking pulse and cello), night theme (sparse piano, wind), mission theme (driving percussion, adventurous), Last Candle theme (building strings), plus two stings: SWORN VICTORY and BETRAYAL.
- **SFX:** wax seal stamp, vote card slap on oak, candle snuff (exile), door creak and footsteps (breakfast), gold coin cascade (pot increase), shield shimmer, dagger unsheathe, crow caw (night), heartbeat under vote reveals, rune chime and fail buzz, lantern whoosh.
- **Voices:** one generated voice per character (11) with two reveal lines each ("I am Sworn." / "I am an Oathbreaker."), and the Steward's narration for key moments (about 25 lines).
- A sound toggle is in the pause menu. Music ducks under voice lines.

## UI COPY (all literal, English)

**Main menu**
- Logo: `OATHBREAKERS`
- Subtitle: `TRUST NO ONE AT RAVENHOLT`
- Name input placeholder: `Your name, contestant` (2-16 characters)
- Avatar picker label: `CHOOSE YOUR FACE`
- Fame picker: `FAMOUS FOR:` with `ACTOR` / `MUSICIAN` / `ATHLETE` / `INFLUENCER` / `CHEF` / `COMEDIAN`
- Role selector: `YOUR FATE:` with `RANDOM` (default) / `SWORN` / `OATHBREAKER`
- Buttons: `ENTER THE CASTLE`, `CONTINUE SEASON` (only if a save exists), `HOW TO PLAY`, `MEET THE CAST`
- Rotating flavor line: `Someone at this table is lying.` / `The candles never lie. People do.` / `Gold for the loyal. Everything for the traitor.` / `Smile at breakfast. Vote at dinner.`
- Version line: `Oathbreakers v1.0`

**Role reveal**
- Steward: `Tonight, three among you will be chosen. The rest of you... will have to find them.`
- Card prompt: `TAP TO BREAK THE SEAL`
- Sworn: `YOU ARE SWORN` / `Find the Oathbreakers. Exile them. Share the gold.`
- Oathbreaker: `YOU ARE AN OATHBREAKER` / `Blend in. Murder by night. Take it all.` / `YOUR FELLOW OATHBREAKERS: <name>, <name>`

**HUD (top bar)**
- Phase label: `DAY <n> - BREAKFAST` / `MISSION` / `THE GALLERY` / `THE ROUND TABLE` / `NIGHT`
- `POT: <amount> GOLD`
- `<n> REMAIN`
- Role peek chip: `HOLD R TO PEEK`, showing `SWORN` or `OATHBREAKER`
- `SHIELDED TONIGHT` (when held)
- `DAGGER: <n> ROUND TABLES LEFT` (when held)
- `JOURNAL (J)`

**Journal** tabs: `EVIDENCE`, `VOTES`, `FALLEN`, `MY NOTES`. On `MY NOTES`, each character gets a tag: `TRUST` / `UNSURE` / `SUSPECT`.

**Breakfast**
- `BREAKFAST - DAY <n>` / `The doors open...`
- `<name> did not come to breakfast.` then `<NAME> HAS BEEN MURDERED`
- Failed murder: `Everyone came down to breakfast. Someone survived the night.`

**Gallery**
- `THE GALLERY - You have <n> conversations before the Round Table.`
- Chat placeholder: `Say something... (Enter to send)`
- Quick prompts: `Who do you suspect?` / `Can I trust you?` / `What happened on the mission?` / `I think it's <name>.` / `I have a shield.`
- Buttons: `EAVESDROP (<n> LEFT)`, `END CONVERSATION`, `GO TO THE ROUND TABLE`

**Round Table**
- Steward: `Welcome to the Round Table. Somebody here is not who they say they are.`
- `SPEAK UP (<n> LEFT)` with options `ACCUSE...`, `DEFEND...`, `DEFEND MYSELF`, `STAY SILENT`
- `WRITE A NAME` / `CONFIRM VOTE` / `USE THE DAGGER` (when held)
- Reveal: `<name> votes for <name>.` then a spoken reason
- Dagger used: `<name> draws the Dagger. Their vote counts twice.`
- Tie: `IT'S A TIE. The tied players will plead their case. Vote again.`
- Second tie: `Still tied. The Steward draws the stones.`
- Exile: `<name>, you have been exiled. Please tell the table who you are.` then `I AM SWORN` or `I AM AN OATHBREAKER`

**Night (Sworn)**
- `NIGHT FALLS OVER RAVENHOLT` / `Lock your door. Pray you see breakfast.`

**Night (Oathbreaker)**
- `THE TOWER` / `Choose who will not wake.`
- `MARK FOR MURDER` / `CONFIRM MURDER`
- After an Oathbreaker falls: `One of us has fallen. RECRUIT A SWORN?` with `RECRUIT` / `MURDER INSTEAD`
- Alone: `You stand alone. DELIVER AN ULTIMATUM?` with `ULTIMATUM` / `MURDER INSTEAD`
- Murder failed: `The door would not open. <name> was shielded.`

**Recruitment (player is Sworn)**
- Recruit: `A sealed letter slides under your door: "Join us. Tell no one."` with `TAKE THE OATH` / `BURN THE LETTER`
- Ultimatum: `A hooded figure blocks your path. "Join us, or never leave this room."` with `TAKE THE OATH` / `REFUSE`

**Mission rewards**
- `You found a SHIELD. No one can murder you tonight. Tell no one... or tell everyone.`
- `You won the DAGGER. Your vote counts twice at one of the next two Round Tables.`

**The Last Candle**
- `THE LAST CANDLE` / `<n> remain. Do you END THE GAME, or EXILE AGAIN?`
- `END THE GAME` / `EXILE AGAIN` / `The vote must be unanimous to end.`
- `Someone chose to exile again.`
- `<name> leaves the castle without revealing who they are.`

**Endings**
- Sworn win: `THE SWORN PREVAIL` / `You split <pot> gold. Your share: <share> gold.`
- Oathbreaker win: `BETRAYED` / `The Oathbreakers take all <pot> gold.` (If the player is a winning Oathbreaker: `IT WAS YOU ALL ALONG` / `You take <share> gold.`)
- Roster screen: `THE TRUTH`, with every contestant's role unmasked
- Stats: `Correct votes: <x>/<y>` / `Days survived: <n>`
- Buttons: `NEW SEASON`, `MAIN MENU`

**Player eliminated**
- `YOU WERE MURDERED IN THE NIGHT` or `YOU HAVE BEEN EXILED`
- `WATCH TO THE END` (spectator mode: all roles visible, fast-forward) / `NEW SEASON`

**Pause (ESC)**: `PAUSED` / `RESUME` / `HOW TO PLAY` / `SOUND: ON` / `SOUND: OFF` / `QUIT TO MENU`, plus a small `Season seed: <seed>` line.

## TECH

- **Client:** plain JavaScript, no build step. DOM + CSS for the UI, and `<canvas>` for the two mini-games. Generated videos play in `<video>` elements from Higgsfield CDN URLs.
- **Engine:** a deterministic phase state machine (`DAY_START -> BREAKFAST -> MISSION -> GALLERY -> ROUND_TABLE -> NIGHT -> ...`) with a seeded RNG per season. The engine owns all game state and every decision.
- **Dialogue:** Claude via a small server endpoint (`server.js`) that holds the API key as a deploy secret. The key never ships to the browser. Fast model (`claude-haiku-4-5-20251001`) for Gallery chat and reactions, and a stronger model (`claude-sonnet-5-5`) for Round Table speeches. Rate limit: about 250 calls per season per session.
- **Offline fallback:** a template dialogue bank per character archetype, so the game is fully playable if the dialogue endpoint is unavailable.
- **Save:** autosave to `localStorage` at every phase change, so `CONTINUE SEASON` resumes.
- **Hosting:** follow the Higgsfield game instructions' tier for a game with a server endpoint. `index.html` (and `server.js`) at the zip root, everything else under `assets/`.

## DEPLOY AND MARKETPLACE

- **Thumbnail (16:9):** a candlelit round oak table seen from above at a low angle, twelve contestants half in shadow, one hand hiding a dagger under the table's edge, and bold `OATHBREAKERS` title text in carved gold serif.
- **Favicon (1:1):** a cracked crimson wax seal stamped with a small dagger.
- **Marketplace title:** `Oathbreakers - Ravenholt Castle`
- **Description:** "Twelve strangers. One castle. Three liars. Build the prize pot on missions, work the room in private, and vote at the Round Table to exile the Oathbreakers before they murder you in the night. Every season the roles are reshuffled, and the cast remembers everything you say."
