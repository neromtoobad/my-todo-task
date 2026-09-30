# WAHALA HOUSE - Design Brief (v1: Week One vertical slice)

Build an animated, single-player social strategy game on the Higgsfield game pipeline, then deploy it. Ask before publishing.

## TITLE

**Wahala House**

Pitch: Eleven housemates. One Lagos mansion. Cameras everywhere, and two secret Saboteurs. Walk the house, build ships, squads and beef, win the games, work the Diary Room and survive eviction night, while you find out who is playing everyone.

Naming rule: inspired by the Nigerian house-show format and the hidden-traitor format, but every name is our own. Never mention any real show, network, sponsor, host or housemate anywhere in the game or the marketplace card.

## GENRE

Isometric 2D life-sim plus social deduction. You control one housemate who walks freely around a fully animated house. Ten AI housemates live their own lives on a schedule: they cook, flirt, gossip, argue, form alliances and scheme, and they remember what you do. The show layer (Head of House, Diary Room nominations, wager tasks, the Saturday party, the Sunday live eviction) and a hidden Saboteur layer run on top.

## THE CORE LOOP

1. **Live in the house (free roam).** Walk anywhere. Drama happens in real places at real times: if you are in the kitchen when Ivie tells Tobi a secret, you hear it. If you are not, you only hear the gossip later, maybe twisted.
2. **Play people.** Walk up to anyone and choose how to engage: charm, flirt, bond, joke, gossip, lie, set two people against each other, swear loyalty, bribe, confront, accuse.
3. **Survive the show.** Win games for power, earn saves at nominations, keep the viewers entertained, and do not get evicted.
4. **Find the Saboteurs, or be one.** Two housemates secretly work for The Whisper. They rig tasks, frame people and strike one housemate out every week. You might be one of them.

## ROLES

| Role | Count | Goal |
|---|---|---|
| **Housemate** | 9 | Survive, win games, build the prize pot, expose the Saboteurs |
| **Saboteur** | 2 | Blend in, drain the pot, frame others, strike one housemate out each week, reach the finale |

- The player's role is dealt at random (about 2 in 11 chance of Saboteur). The menu can force it: `YOUR FATE: RANDOM / HOUSEMATE / SABOTEUR`.
- **Mama Eye** is the voice of the house: deep, amused and all-seeing. She calls people to the Diary Room, sets tasks and issues strikes.
- **The Whisper** is a second, colder voice that only Saboteurs hear, at night, in the hidden Red Room.
- **Dapo Kalu** is the show's host: a flamboyant Lagos showman in a new outfit every live show (agbada with sneakers, a velvet tux with an aso-oke sash). He appears on the Entry Night and Live Eviction stage, not inside the house.

## SOCIAL SYSTEMS (the heart of the game)

Every pair of housemates has four hidden values (0 to 100): **Friendship**, **Romance**, **Trust** and **Beef**. Plus each housemate has:

- **Composure** (0-100): their mental state. Nominations, gossip about them, fights, heartbreak and isolation drain it. Low composure causes outbursts, crying, bad votes and rule breaks. Rest, deep talks, prayer or the gym restore it. The player has one too: when yours is low, some calm options are locked and mini-games get harder (screen wobble).
- **Fan Meter** (0-100): how much the viewers love them. Romance, humor and drama raise it. Being boring lowers it. Aggression is polarizing (fans up, likability down).
- **Traits** (2-3 each): Flirty, Loyal, Messy, Strategic, Hot-tempered, Funny, Moral, Jealous, Shady, Nurturing, Hustler, Calm, Clout-chaser. Traits change how they react to every action.
- **Memory**: a log of what they saw, heard and were told, with who told them. They quote it back in arguments and at the Showdown.

### Relationship outcomes

- **Bestie** (Friendship 70+, both ways). Besties save each other and defend each other.
- **Ship** (Romance 60+, both ways). The viewers name it (a portmanteau like "TobIvie"), it trends, and it boosts both Fan Meters. Ships can go official, get jealous, break up loudly or turn out to be a showmance.
- **Beef** (Beef 60+). Beefs start fights at the worst moments, and a fight can earn a strike.
- **Squad**: an alliance you form and name. Squad members promise saves. Betrayal is remembered forever.

### Player interactions (walk up to a housemate, press E or tap them)

**VIBE:** Chit-chat, Joke, Compliment, Deep Talk (unlocks one of their secrets at high Trust), Hug, Give Gift (Jollof plate, suya, flowers, costs House Coins)

**LOVE:** Flirt, Ask Out (make the ship official), Kiss (only when Romance is mutual and high), Break Up

**SCHEME:** Spread Gist (tell them something about someone: a true receipt or an invented lie), Set Up (tell A that B said something about them), Ask For Your Save, Propose Squad, Swear Loyalty (real or fake), Bribe (House Coins), Share a Receipt

**CONFRONT:** Throw Shade, Argue (costs composure, risks a strike), Accuse of Being a Saboteur, Apologize, Make Peace

Each interaction costs **Social Energy** (10 per day; bigger moves cost more). Results depend on traits, relationships, composure and whether it is believable. **Lies are tracked**: if two housemates compare notes and your stories do not match, you get exposed, and your Trust with both drops hard.

### Gist, receipts and eavesdropping

- AI housemates play out their own scenes on schedule (a whispered deal by the pool, a kiss in the HoH lounge, a skim of task money in the kitchen). You only get the content if you are within earshot, so **where you stand matters**.
- What you witness becomes a **Receipt** (hard evidence) in your Gist Book. What you hear secondhand is **Gist** (may be distorted or planted).
- Receipts raise your credibility when you confront, accuse or call someone out.

### Strikes

House rules: no discussing nominations, no threats or violence, no sleeping during tasks, no mic removal (flavor), no fixing votes. Mama Eye catches breaks with a probability. 3 strikes means automatic nomination. **You can bait others into breaking rules** (goad a hot-tempered housemate into a fight in front of the cameras).

### House economy

- **Prize Pot (Naira):** starts at 0, filled by the wager task, drained by Saboteur skimming. Slice target up to ₦20,000,000.
- **House Coins:** personal currency from HoH, tasks and Mama Eye's secret missions. Spend on gifts, bribes, a Sneak Peek (buy a line from someone's Diary Room session) or the Immunity Token (very expensive).

## THE WEEK (vertical slice: one full week, about 60-90 minutes)

Each day has four time blocks with a live clock: **MORNING 08:00-12:00, AFTERNOON 12:00-17:00, EVENING 17:00-22:00, NIGHT 22:00-02:00.** One in-game hour takes about 30 real seconds of free roam. Scheduled events interrupt the clock. **F** fast-forwards to the next event.

| Day | Main event | What it does |
|---|---|---|
| Sun (Day 0) | **Entry Night** | Dapo welcomes housemates one by one at the gate (animated walk-in), you enter last, Mama Eye's guided house tour (tutorial). Night: The Whisper visits the Saboteurs. |
| Mon | **Head of House game: JOLLOF RUSH** | Winner is HoH: immune this week, gets the private HoH Lounge, picks a Tenant, holds the Veto. |
| Tue | **Wager task revealed** | The HoH splits the house into two market teams. Diary sessions with Mama Eye (your answers move your Fan Meter). |
| Wed | **Nominations** | In the Diary Room each housemate secretly SAVES two others. The 4 with the fewest saves are up. Lobbying all day. |
| Thu | **Veto + wager task: BALOGUN HUSTLE** | HoH may veto one nominee and name a replacement. Teams run market stalls to fill the Prize Pot. Saboteurs skim. |
| Fri | **Wager results + Midnight Strike** | Pot updated (missing money is visible). At midnight the Saboteurs strike one housemate out. |
| Sat | **Saturday Night Party: OWAMBE DANCE-OFF** | Rhythm game, dance battles, kisses, jealousy and fights. |
| Sun | **Live Eviction Show + THE SHOWDOWN** | Viewers' votes put two nominees in the bottom 2, the housemates vote one out in the Diary Room. Then the Showdown: call out a Saboteur. |

End of the slice: **Week One Recap** (your Fan rank, ships, beefs, receipts, pot, the truth about the struck housemate) and `WEEK TWO LOADING...`.

### The Midnight Strike and The Showdown

- **Saboteur nights** in the Red Room: choose tomorrow's sabotage (skim the wager task, plant a receipt on someone, spread a rumor through a puppet) and on Friday the **Strike**: the target is gone by Saturday breakfast ("Mama Eye: Housemates... Kunle has been struck from the house.").
- **The Showdown** (after the Sunday eviction): Dapo opens the floor. Anyone may call out one housemate as a Saboteur. If more than half the house backs the call-out, the accused must reveal. Saboteur: they are ejected on the spot and the callers split 2,000,000 from the pot as coins. Innocent: the accuser takes 2 strikes.

## MINI-GAMES (all three in the slice)

| Game | When | Play | Controls |
|---|---|---|---|
| **JOLLOF RUSH** | HoH game | 90-second kitchen time-management: orders pop up, drag rice, tomato-pepper base, onions, stock, chicken and plantain into pots and fryers, time the heat, plate before it burns. Score vs everyone's (AI scores simulated from traits). | Mouse drag or tap |
| **BALOGUN HUSTLE** | Wager task | Run your team's stall for 3 market rounds: buy stock, set prices, haggle with animated customers by choosing lines (sweet talk, hard sell, discount, walk away). Team profit fills the pot. Ledger shows missing money when a Saboteur skims. | Click or tap choices |
| **OWAMBE DANCE-OFF** | Saturday party | Rhythm game on an original Afro-pop/Amapiano track: arrow prompts scroll to the beat, streaks trigger crowd hype. Win a dance battle vs a chosen rival, or dance with your crush to boost Romance. | Arrow keys or on-screen arrows |

## THE HOUSE (isometric map, built in code on a grid)

A luxury Lekki mansion, all one continuous map. The camera follows you with smooth zoom.

| Room | Landmarks | Purpose |
|---|---|---|
| **Lounge** | L-shaped velvet sofa, giant TV wall with the Eye logo, rugs | Group hangouts, house meetings, fights |
| **Kitchen & Dining** | Island counter, big pots, fridge, long dining table | Cooking drama, Nkoyo's domain, receipts |
| **Garden & Pool** | Pool, loungers, palm trees, gazebo, fairy lights | Romance, whispered deals |
| **Bedroom** | Rows of beds and wardrobes, mirror wall | Night talks, secrets |
| **Gym Corner** | Weights, mat | Restore composure, flex |
| **HoH Lounge** | King bed, mini jacuzzi, private sofa (locked unless you are HoH, Tenant or invited) | Power, privacy, kisses |
| **Diary Room** | Red throne chair, glowing Eye | Diary sessions, nominations, confessions |
| **Arena** | Garden stage | Game events and the party |
| **Red Room** | Hidden behind the wardrobe at night, Saboteurs only | The Whisper's meetings |

Walls fade when you walk behind them. Doors, furniture footprints and the pool block movement.

## THE CAST (10 AI housemates, all original, all Nigerian)

| # | Name | Age | From | Who | Traits | Signature line |
|---|---|---|---|---|---|---|
| 1 | Tobi "Odogwu" Balogun | 27 | Lagos Island | Club promoter and hypeman, flashy, generous, big ego | Flirty, Clout-chaser, Loud | "Odogwu don land! Who dey vex?" |
| 2 | Adaeze "Ada Ada" Nwosu | 25 | Enugu | Skit-maker with 3M followers, knows everyone's business | Funny, Messy | "I no talk anything o... but make I tell you something." |
| 3 | Musa Abdullahi | 29 | Kaduna | Architect, calm gentleman, slow to anger, quietly romantic | Loyal, Calm, Romantic | "Patience. Everything reveals itself." |
| 4 | Ivie Osagie | 24 | Benin City | Fashion designer, bold flirt, knows her power | Flirty, Strategic | "If you can't handle this energy, step aside." |
| 5 | Kunle "Pastor K" Adeyemi | 26 | Ibadan | Pastor's son and gospel singer with a hidden wild side | Moral, Jealous | "God is watching. And so am I." |
| 6 | Ebiere "Ebi" Pepple | 28 | Port Harcourt | Oil and gas engineer, fiercely loyal, zero tolerance | Hot-tempered, Loyal | "Try me. I dare you. Try me." |
| 7 | Chinedu "Nedu Codes" Okoro | 30 | Yaba | Fintech founder, reads everyone like a spreadsheet | Strategic, Calm, Shady | "Everybody has a price. Even you." |
| 8 | Nkoyo Effiong | 31 | Calabar | Chef and caterer, the house mother, notices everything | Nurturing, Observant | "Sit down, eat first. Then talk." |
| 9 | Zainab "Zee" Bello | 23 | Abuja | Law graduate and influencer, polished, sharp tongue | Competitive, Shady | "I'm not rude. I'm just correct." |
| 10 | Emeka "Mekus" Okafor | 32 | Onitsha | Trader, street-smart hustler, speaks in proverbs | Hustler, Funny | "When money speaks, truth keeps quiet." |

Plus **2 player avatars** in the slice (1 woman, 1 man, name and look chosen at the start); more later.

Built-in history for drama: Tobi and Ivie have a past (one messy date in Lagos). Ada and Zee follow each other online and hate each other offline. Nkoyo already mothers Musa. Nedu and Mekus both think they are the smartest businessman in the house.

Dialogue voice: English with Nigerian flavor and light Pidgin ("Omo!", "Abeg", "Na wa o", "Wahala dey!", "E choke!", "Sapa don hold me"). Every character has a distinct voice, plus lie tells (like Nedu adjusts his glasses, Ada laughs too loud, Tobi says "trust me" twice).

## AI HOUSEMATES (how they think)

- **Schedules**: each block the engine decides where every housemate goes (sleep, cook, gym, pool, gossip spot) from traits, mood and goals.
- **Goals**: each has weekly goals (win HoH, secure a ship, survive nominations, protect a bestie, destroy a rival, and for Saboteurs: frame, skim, strike).
- **Scenes**: the engine generates the day's scenes between them (flirt, deal, gossip, argument, reconciliation, sabotage) with real consequences, whether or not you see them.
- **Votes and saves**: based on Friendship, Trust, Beef, squad loyalty, fear and fan pressure.
- **Saboteur AI**: they frame people who suspect them, keep a showmance for cover, skim when unobserved, and strike the most dangerous housemate (the one holding receipts on them).
- **Dialogue**: written, character-voiced line banks filled in by the engine (no paid AI API, free to run, works offline). Live AI chat can be a later upgrade.

## ART DIRECTION (locked style formula)

Chosen from a 4-way style test (3D movie, anime, semi-realistic painted, pixel art): **3D animated movie look**. Every housemate is a detailed rigged 3D model (image to 3D, auto-rig, motion-capture clips), and the house is rendered live in 3D from a fixed isometric camera with real lighting, shadows and a day to night cycle.

"Stylized 3D animated feature-film look in isometric three-quarter view, appealing rounded character designs with slightly oversized heads and big expressive eyes, soft global illumination, subsurface skin shading on rich deep-brown Nigerian skin tones, glossy fabrics and materials with detailed Ankara, aso-oke and lace textures; house and environment in warm cream, terracotta and gold, characters in saturated jewel tones of emerald, magenta, cobalt and sunflower, drama accents in hot red and electric purple; sunny Lagos luxury by day and neon party glow by night; warm cinematic color grade, clean readable silhouettes, like a frame from a premium 3D animated movie"

- **Characters**: full Nigerian fashion range (Ankara prints, agbada, gele, kaftan, bold streetwear, braids, locs, fades, bantu knots, gold jewelry). Looks locked from the approved cast lineup images, which are used as references for every sprite, portrait and animation.
- **Day and night**: the whole house re-tints by time of day (warm morning, bright afternoon, golden evening, purple neon night).
- **UI**: Afro-pop glam: rounded panels, Ankara-pattern borders, gold accents, big expressive portraits for dialogue.

### Assets (Higgsfield)

| Asset | Count | How |
|---|---|---|
| Character base sprites (full body, isometric) | 12 | nano_banana_2, key-color background |
| Character animations (sprite sheets) | about 144 | AutoSprite: walk in 5 directions (mirrored for the other 3), idle in 3 directions, emotes: talk, dance, laugh, argue |
| Dialogue portraits | 72 | 12 characters x 6 moods: neutral, happy, flirty, angry, sad, scheming |
| House tiles and walls | about 14 | marble, wood, grass, pool water, rugs, kitchen tiles, wall pieces, doors |
| Furniture and props | about 35 | sofa, TV wall, beds, kitchen island, pool loungers, palms, DJ booth, diary throne, jacuzzi, gym gear |
| Mini-game art | about 20 | ingredients and pots, market goods and stall, dance stage |
| Host Dapo Kalu | 2 portraits + 2 video clips | Entry Night and Live Eviction looks |
| Logo, UI icons, cover, favicon | about 12 | |

Performance budget: sprite frames downscaled to 128 px and converted to WebP, bundled with the game (no hotlinked CDN on the hot path), walk and idle loaded first, emotes lazily. Target 60 fps on a mid-range phone.

## SOUND

- **Music (original, Afrobeats and Amapiano)**: house day groove, chill night groove, HoH game track, market hustle track, party anthem for the dance-off, live show theme, Saboteur theme (dark log drum).
- **SFX**: footsteps on marble and grass, door, pot sizzle, coins, market crowd, crowd cheer and "ooooh", gasp, kiss, slap-free argument sting, strike buzzer, Diary Room chime, notification ping for the viewer feed.
- **Voices**: Mama Eye (about 25 lines), The Whisper (about 8), Dapo Kalu (about 20), and 4 short barks per housemate (greeting, laugh, "Omo!", angry).

## CONTROLS

| Input | Action |
|---|---|
| WASD / arrow keys, or click/tap on the floor | Walk (pathfinding around furniture) |
| E, or click/tap a housemate | Open the interaction wheel |
| SPACE or click | Advance dialogue |
| Q | Emote wheel (wave, dance, laugh, facepalm) |
| J | Gist Book |
| TAB | Tea Board (relationship web) |
| M | House map |
| F | Fast-forward to the next event (when allowed) |
| ESC | Pause |

## UI COPY (literal, English)

**Main menu**
- Logo: `WAHALA HOUSE` / subtitle: `TRUST NO HOUSEMATE`
- `Your housemate name` (2-16 characters) / `CHOOSE YOUR LOOK` / `YOUR FATE: RANDOM / HOUSEMATE / SABOTEUR`
- Buttons: `ENTER THE HOUSE`, `CONTINUE`, `HOW TO PLAY`, `MEET THE HOUSEMATES`
- Rotating lines: `Every smile in this house is a strategy.` / `Omo, the cameras see everything.` / `Two of them are lying. Maybe three.` / `Ship or strategy? You decide.`
- `Wahala House v1.0 - Week One`

**HUD**: `DAY 3 - WEDNESDAY - 14:20`, `PRIZE POT: ₦12,500,000`, `COINS: 340`, `ENERGY 6/10`, `COMPOSURE`, `FANS 72 ▲`, strike icons `STRIKES 1/3`, badges `HEAD OF HOUSE`, `NOMINATED`, `IMMUNE`, `TENANT`.

**Interaction wheel**: `VIBE`, `LOVE`, `SCHEME`, `CONFRONT` with the actions listed above. Costs shown as `-2 ENERGY`.

**Mama Eye lines** (examples): `Housemates, this is Mama Eye.` / `Tobi, please come to the Diary Room.` / `Housemates, it is time for the Head of House game.` / `Ebiere, you have received a strike for threatening another housemate.` / `Housemates... Kunle has been struck from the house.`

**Diary Room**: `MAMA EYE IS LISTENING` / `Who do you want to SAVE this week? Pick two.` / `Tell Mama Eye: who is the biggest snake in this house?`

**The Whisper**: `Welcome to the Red Room.` / `Choose who will not see Saturday.` / `STRIKE` / `SKIM THE TASK` / `PLANT A RECEIPT`

**Viewer feed examples**: `"Tobi and Ivie in the pool?? #TobIvie is REAL" ` / `"Ebi about to catch a strike, I can feel it" ` / `"Who else thinks Nedu is a Saboteur?"`

**Live show**: `LIVE EVICTION SHOW` / Dapo: `Good evening, Nigeria!` / `THE BOTTOM TWO` / `Housemates, please cast your eviction vote in the Diary Room.` / `[Name], you have been evicted from Wahala House.` / `THE SHOWDOWN` / `CALL OUT A SABOTEUR` / `PASS` / reveal: `I AM A SABOTEUR` or `I AM A HOUSEMATE`

**Endings / out**: `YOU HAVE BEEN EVICTED` / `YOU HAVE BEEN STRUCK` / `WATCH THE REST OF THE WEEK` / `WEEK ONE RECAP` / `WEEK TWO LOADING...`

## TECH

- **Platform**: Higgsfield game template (Cloudflare Worker + Durable Object room), single-player, each browser its own private season, saved server-side.
- **Engine** (`src/logic.js`, pure and seeded): the whole social simulation: relationships, traits, memory, schedules, scenes, rumors, lies, strikes, fans, votes, nominations, Saboteur AI and every show event. Hidden roles and unwitnessed scenes never leave the server.
- **Eavesdropping protocol**: the client reports when the player is within earshot of a scene; only then does the server send that scene's dialogue.
- **Client**: plain JavaScript Canvas 2D isometric renderer (no build step): sprite sheet playback, A* pathfinding on the house grid, depth sorting, wall fade, day/night tint, speech bubbles, camera follow and zoom, touch controls. Mini-games in Canvas. All UI in DOM.
- **Quality bar**: season simulator (thousands of AI-only weeks for crashes, balance and leaks), room tests, and headless browser play-throughs on desktop and phone sizes before every deploy.

## ROADMAP AFTER THE SLICE

- **Phase 2**: Weeks 2-10, more HoH games (Danfo Dash, Naija Trivia, Tug of War), twists (fake eviction, secret housemate, wildcards, pairs week), the finale with the viewers' vote (a Saboteur in the final steals the pot), more player looks.
- **Phase 3**: optional live AI conversation, online multiplayer house with friends.

## DEPLOY AND MARKETPLACE

- **Cover (3:2)**: the glowing isometric mansion at night, housemates mid-drama around the pool (a kiss, a finger-point, someone skimming money), the Eye in the sky, title `WAHALA HOUSE`.
- **Favicon (1:1)**: a stylized glowing eye in green and gold.
- **Title**: `Wahala House`
- **Description**: "Eleven housemates, one Lagos mansion, two secret Saboteurs. Walk the house, build ships and squads, spread gist, win the games and survive eviction night. Everyone remembers everything, and someone is playing all of you."
