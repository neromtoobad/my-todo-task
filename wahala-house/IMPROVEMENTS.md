# Wahala House: where it can get better

Notes from playing the Week One build (30 Sep 2026). The live site is private, so
this was the identical build played two ways: locally with stand-in bodies for
the rules, UI and writing, and in the Higgsfield sandbox with the real rigged
cast for the 3D. The sandbox renders at about one frame a second, so motion feel,
audio mix and input feel on a real device were not judged here.

Numbers below come from a scripted season (`seed 7`, player idle unless noted)
and from measuring bone heights on the real models.

## Progress

Done (1 Oct 2026):

- **The first minute.** Entry night auto-plays as a montage; SKIP jumps through
  talk but always stops on beats that matter (your role, votes, results). In-play
  hints teach one control at a time.
- **Make the wahala happen.** Seeded rivalries, fights that boil over, crowds
  that gather, a hot-gist feed with alerts, and housemates who walk up to you to
  confront you, flirt, share gist, pitch a deal or just get to know you.
- **Fill the day.** Chores, cooking, snooping and pranks; daytime incidents
  (missing jollof, palm wine, NEPA blackout, an anonymous letter).
- **Quick wins.** Bodies sit on seats, beds and loungers at the measured height;
  tags declutter; the talk target is sticky; Jollof Rush is harder.
- **Everyone sounds the same.** Every housemate now answers in their own voice
  for the common moves, opens scenes in their own words, and brings up what you
  did (a kiss they saw, a fight, a broken promise, a lie, a gift, a joke).
  More player lines and scene scripts.
- **Stage it.** Conversations cut to a close-up with reaction pops and nearby
  housemates turning to watch; shows cut to housemates reacting; the evicted
  housemate waves goodbye and walks out past the house.

Still open: more voiced show lines (costs credits), the mini-game notes, the
interface notes, and the longer-term items.

## The big five

### 1. The house is too calm. Make the wahala happen, and make it findable.
- In a simulated week, 118 AI scenes started and **none were arguments**; crying
  scenes did not appear either. Arguing needs a grudge of 50+, which AI pairs
  almost never reach, and crying needs composure under 32.
- Only about **1 in 5** scenes happens in the room you are standing in, and
  nothing tells you where the others are. On a first wander it took over two
  minutes to find anything to eavesdrop on.
- Ideas: seed two or three rivalries at entry; let events create beef (HoH's
  tenant pick, a nomination, a Diary Room leak, food going missing); make
  arguments loud and public so people gather round; add a "hot gist" ping on the
  HUD ("Whispers in the kitchen") with a sound cue, and show scene icons across
  the whole house, not just within 11 m.

### 2. Stage it, don't subtitle it.
- Most of the show is text boxes. Entry night is 32 lines; the live eviction is
  23, 21 of them Dapo talking. HoH, wager, results and strike reveal are almost
  entirely Mama Eye reading out text. Only 19 lines have voice.
- A conversation with a housemate is two lines of text and one gesture.
- Ideas: close-up camera and staged blocking for talks (face each other, react
  with the whole body when it goes well or badly); cut-ins of housemates
  reacting during shows; the evicted walking out through a crowd; far more voice
  (Dapo and Mama Eye at minimum on every show line); fewer, punchier lines.

### 3. The first minute.
- It takes **33 clicks** of dialogue before you can move. Ten intros, each with a
  one-liner and a Dapo quip, then four tutorial cards.
- Ideas: an auto-playing entrance montage (walk-ins with music, skippable),
  three or four spotlight intros, meet everyone else in the house; teach
  controls with one on-screen hint at a time while you play.

### 4. Everyone sounds the same.
- Each move has 2 or 3 player lines and 4 replies per outcome, and **all ten
  housemates share the same reply pool**. Mekus and Ivie both answered a joke
  with "Omo, you need your own show." The player tells the same jollof joke
  every time. Scene scripts are 1 to 3 per kind, so they repeat within a week.
- Ideas: per-housemate reply banks for the common moves (chat, joke, flirt,
  shade, argue, deep talk); replies that reference memory ("after what you said
  on Monday?"); more scene scripts, and scenes that name what actually happened
  in the house.

### 5. Fill the day.
- Ten Social Energy, spent in a few minutes, then the best move is to
  fast-forward. A day is 9 real minutes if you don't. There is little to do
  that isn't talking.
- Ideas: things that cost no energy but matter: chores and small tasks that pay
  coins, cooking for people, working out, pranks, snooping in the bedroom; random
  mid-day house events (a delivery, a surprise task, a fight breaking out); make
  the shop worth visiting.

## Quick wins (small, visible)

- **Sunbathers float about 25 to 30 cm above the loungers.** The lounger cushion
  is at 0.41 m but the sunbathing hips sit at 0.73 m; the `sunbathe` height
  offset of 0.38 in `restFor` should be about 0.08.
- **Seated feet dangle 15 to 20 cm off the floor.** Sofa seats are 0.475 m high;
  either lower the seat or drop seated bodies a little.
- **Beds probably have the same float as loungers** (sleep offset 0.62 against a
  0.6 m cover); check with the same bone measurement.
- **Name tags pile up** in lineups and on the sofa. Show tags for the nearest
  few, or only on hover and during scenes.
- **The talk prompt swaps target** when two people are near, so the button can
  change under your finger. Keep the target sticky for a second.
- **Characters read small** in wide shots. The camera is now closer; consider a
  follow-cam that tightens during conversations.

## Mini-games

- **JOLLOF RUSH is too easy to win HoH.** A perfect bot scored 4,537; the best
  AI tops out near 3,200. Faster orders later in the round, a burnt-pot penalty
  that hurts, or AI scores that scale with the player's.
- It is a flat menu of buttons. Staging it in the 3D kitchen with the cast
  cooking alongside would sell it.
- **BALOGUN HUSTLE** works and has good market talk, but customers are emoji;
  using housemate portraits for some customers (and letting teammates actually
  help or sabotage) would tie it to the social game.
- **DANCE-OFF** notes are timed to an assumed 112 BPM; measure the real tempo of
  the party track. The rival's score is only a number at the end; show them
  dancing and their live accuracy.

## Interface

- The HUD shows five stats and five buttons at once; composure and fans are not
  explained in play.
- The move wheel has 22 moves across four tabs. Consider showing the 4 to 6 that
  make sense for this person right now, with the rest behind "more".
- The Tea Board is a grid of pips. Hearts, anger marks and friendship glows over
  heads would show relationships where the action is.

## Longer term

- Performance on real phones is unmeasured: 13 skinned characters, shadows and
  about nine lights. The game lowers quality when it is slow, but it needs a
  pass on a mid-range phone.
- Week One ends at the recap ("WEEK TWO LOADING..."). A second week, or
  replayable weeks with different casts and Saboteurs, would give it legs.
