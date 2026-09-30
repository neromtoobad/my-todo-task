// ---------------------------------------------------------------------------
// Dialogue banks. Placeholders: {ex} exclamation, {pet} term of address,
// {you} player name, {x} third person, {me} speaker name.
// ---------------------------------------------------------------------------

/** Housemate replies to the player, by action then outcome (good / meh / bad). */
const REPLY = {
  chat: {
    good: ["{ex} {you}, you get sense sha. I like this gist.", "See, you're easy to talk to. Stay here small.", "Ahn ahn, {pet}, where have you been hiding this personality?", "Honestly? You're one of the real ones in this house."],
    meh: ["Mm. Okay. Nice talk.", "Yeah, yeah. The weather is weather.", "We move, {pet}.", "Cool. I'm just here, vibing."],
    bad: ["I'm not really in the mood, abeg.", "Is this conversation going somewhere?", "{ex} You again?", "Talk to me later. Much later."],
  },
  joke: {
    good: ["{ex} Stop! My stomach! Hahaha!", "You're mad! Who taught you this one?", "Omo, you need your own show. I'm crying!", "Hahaha! Okay okay, you win today."],
    meh: ["Heh. Small laugh. Very small.", "I see what you tried there.", "Keep practising, {pet}.", "That one needed more pepper."],
    bad: ["Was that a joke? I'm asking seriously.", "Not funny. At all.", "You're not a comedian, abeg.", "Please, stick to your day job."],
  },
  compliment: {
    good: ["Awww, {pet}. You just made my whole day.", "{ex} You noticed? Finally, somebody with eyes.", "Stop it! Okay, say it one more time.", "See why I like you? Correct person."],
    meh: ["Thank you. I know.", "Okay... thanks?", "Mm. Noted.", "That's sweet. I guess."],
    bad: ["What do you want from me?", "Flattery won't save you on Wednesday.", "Hmm. Suspicious.", "I don't trust sweet mouth."],
  },
  deep: {
    good: ["Can I tell you something real? {secret}", "Nobody in this house knows this, but... {secret}", "I trust you, so listen. {secret}", "Promise me this stays between us. {secret}"],
    meh: ["It's been a long week already. That's all.", "I miss home. That's the real gist.", "Some days it's too much, you know?", "I'm fine. I'm fine. Really."],
    bad: ["Deep talk? With you? Not today.", "My business is my business.", "You want my secrets so you can use them? No.", "I don't know you like that."],
  },
  hug: {
    good: ["Come here! Big hug!", "{ex} This one is a warm hug. I needed it.", "Aww. Okay, don't let go yet.", "Hug accepted. You're family now."],
    meh: ["Okay, small hug.", "Alright, alright.", "Side hug. That's all.", "Mm. Thanks."],
    bad: ["Abeg, personal space.", "Don't touch me like that.", "Hug ke? We're not there yet.", "Back up small."],
  },
  gift: {
    good: ["For me? {ex} You're the best!", "This is why I rate you. You're thoughtful.", "Jollof? You know my love language!", "I'm keeping this. And I'm keeping you."],
    meh: ["Oh. Thanks.", "Okay, I'll take it.", "Nice. Thank you.", "Appreciated, {pet}."],
    bad: ["You think you can buy me?", "Keep your gift.", "What's the catch?", "I don't collect bribes, abeg."],
  },
  flirt: {
    good: ["{ex} You're dangerous, you know that?", "Keep talking like that and see what happens.", "Is it hot in here or is it just you?", "Hmm, {pet}. I see you."],
    meh: ["Haha. Cute.", "Nice try. Try again later.", "You're sweet. That's all I'll say.", "Mm. Maybe."],
    bad: ["Abeg, it's not that kind of party.", "Let's just be friends, okay?", "Please redirect that energy.", "I'm going to pretend I didn't hear that."],
  },
  askout: {
    good: ["Yes! Oya, it's official. Tell the whole house!", "{ex} I was waiting for you to ask!", "Yes, {pet}. You and me. Let them talk.", "Finally! Yes!"],
    meh: ["Let's take it slow first.", "Ask me again after Sunday.", "I like you, but not yet.", "Hmm. Give me time."],
    bad: ["Ehn? No. Just no.", "We're not on that level.", "I think you misread things.", "Sorry, my heart is elsewhere."],
  },
  kiss: {
    good: ["...Wow.", "{ex} The cameras definitely caught that.", "Do that again. Slowly.", "Okay. Okay. I'm blushing."],
    meh: ["Easy, easy. Not in front of everybody.", "Maybe later. When it's quiet.", "Not here, {pet}.", "Slow down small."],
    bad: ["Whoa! No!", "Don't ever try that again.", "Are you okay?", "Mama Eye, are you seeing this?"],
  },
  breakup: {
    good: ["Fine. Maybe it's better this way.", "I understand. No hard feelings.", "Okay. We stay friends.", "It was fun while it lasted."],
    meh: ["Wow. Okay.", "If that's what you want.", "I didn't see this coming.", "Hmm. Noted."],
    bad: ["You're breaking up with ME? On camera?", "After everything? {ex}", "You'll regret this. Watch.", "Nigeria will judge you!"],
  },
  gist: {
    good: ["{ex} {x}?! I knew something was off!", "Wait wait wait. {x} did that? I'm watching them now.", "Thank you for telling me. I owe you.", "So {x} is like that? Okay. Noted."],
    meh: ["Hmm. I'll think about it.", "Maybe. Maybe not.", "You sure about this?", "Let me find out for myself."],
    bad: ["You're lying. {x} would never.", "Why are you always carrying gist?", "Stop trying to cause wahala.", "I don't believe you. At all."],
  },
  setup: {
    good: ["{x} said WHAT about me?! Where is {x}?", "{ex} So {x} is a snake. Thank you for telling me.", "Okay. {x} and I are going to talk. Loudly.", "I knew it. I knew {x} was fake."],
    meh: ["Hmm. That doesn't sound like {x}.", "I'll ask {x} myself.", "Maybe you heard wrong.", "Let me verify first."],
    bad: ["You're trying to set me against {x}. I see you.", "Nice try. I'm not stupid.", "I'll tell {x} you said this.", "Why do you want us to fight?"],
  },
  asksave: {
    good: ["You're safe with me. My save is yours.", "Don't worry, {pet}. I've got you on Wednesday.", "Consider it done.", "I was already planning to save you."],
    meh: ["I'll see how the week goes.", "Maybe. Show me you're worth it.", "I can't promise anything.", "Let me think about it."],
    bad: ["Save you? You never even greeted me this week.", "My saves are already taken.", "No, sorry.", "Ask somebody else."],
  },
  squad: {
    good: ["Squad! We run this house now!", "Say less. We move together.", "{ex} Finally, an alliance with sense.", "I'm in. Loyalty till the end."],
    meh: ["Let me see how you move first.", "Squad is a big word.", "Maybe after nominations.", "I'll think about it."],
    bad: ["I don't do squads with strangers.", "You want to use me? No.", "Not interested.", "Find another squad."],
  },
  swear: {
    good: ["I swear it back. Loyalty.", "I believe you. Don't disappoint me.", "Handshake? Deal.", "That means a lot, {pet}."],
    meh: ["Words are cheap in this house.", "We'll see.", "Okay. Time will tell.", "Mm hm."],
    bad: ["Everybody swears. Everybody lies.", "I don't believe you.", "Save your oaths.", "Loyalty ke? This house?"],
  },
  bribe: {
    good: ["Money talks. I'm listening.", "{ex} Okay, you're serious. Deal.", "Pleasure doing business.", "This one will stay between us."],
    meh: ["I'll take it, but no promises.", "Hmm. We'll see.", "Thanks. We'll talk.", "Okay. Small small."],
    bad: ["You want to buy my vote? Shame!", "Keep your money.", "I'm reporting this to Mama Eye.", "I'm not for sale."],
  },
  receipt: {
    good: ["{ex} You saw this with your own eyes?", "Receipts don't lie. {x} is finished.", "This is proof. I'm watching {x} now.", "Thank you. Now I know."],
    meh: ["Interesting. But it could mean anything.", "Hmm. I'll keep it in mind.", "That's something.", "Okay."],
    bad: ["That proves nothing.", "You're twisting things.", "Leave {x} alone.", "I don't care."],
  },
  shade: {
    good: ["Hahaha! You're wicked! I'm dead!", "{ex} Savage!", "The shade! The shade!", "Somebody bring water!"],
    meh: ["Was that shade? Weak shade.", "Okay, noted.", "Mm hm.", "Cute."],
    bad: ["Say it with your full chest!", "Who are you throwing shade at?", "Watch your mouth.", "{ex} You don't know me."],
  },
  argue: {
    good: ["Fine! Maybe you have a point!", "Okay, okay! I hear you!", "You win this one.", "Calm down, I understand now."],
    meh: ["Whatever!", "This is going nowhere!", "Talk to my hand!", "I'm done with this conversation."],
    bad: ["Don't raise your voice at me!", "{ex} You want wahala? You'll get it!", "Try me! Try me!", "Who do you think you are?!"],
  },
  accuse: {
    good: ["...How did you know?", "Keep your voice down!", "You don't know what you're talking about.", "Why are you looking at me like that?"],
    meh: ["Me? A Saboteur? Please.", "You're wasting your time.", "Accuse somebody else.", "Everybody is a suspect to you."],
    bad: ["How dare you?! I'm a housemate!", "{ex} You're the Saboteur, accusing others!", "I'll remember this at the Showdown.", "You just made an enemy."],
  },
  apologize: {
    good: ["It's okay. Come here.", "Apology accepted, {pet}.", "Thank you. That took guts.", "We're good. For real."],
    meh: ["Okay. I hear you.", "Hmm. Let's see.", "Words are easy.", "Fine."],
    bad: ["Sorry for what? It's too late.", "Keep your sorry.", "No.", "Don't come near me."],
  },
  peace: {
    good: ["Peace. Let's leave the past.", "Okay, truce. No more wahala.", "Life is too short. We're cool.", "Handshake. Clean slate."],
    meh: ["Truce. For now.", "I'll think about it.", "Maybe.", "Let's see how it goes."],
    bad: ["Peace? After what you did?", "Never.", "Not today, not tomorrow.", "No peace for you."],
  },
  refuse: {
    asleep: ["Zzz... Leave me... sleeping..."],
    tired: ["I'm too drained for this right now."],
  },
};

/** Secrets unlocked with Deep Talk (kept vague so they work for anyone). */
const SECRETS = {
  tobi: "My club almost closed last year. I'm here for the money, not the clout.",
  ada: "Half my skits are about people in this house. They don't know yet.",
  musa: "I left someone special in Kaduna to come here. I think about her every day.",
  ivie: "My fashion label is in debt. This prize would save it.",
  kunle: "Before church, I was a DJ in Ibadan clubs. Nobody here knows.",
  ebi: "My temper? I got it from my father. I'm trying to be better.",
  nedu: "My startup failed twice. I'm reading everybody because I can't afford to lose again.",
  nkoyo: "I cook for everybody because feeding people is the only way I know to be loved.",
  zee: "I failed the bar exam once. My family doesn't know.",
  mekus: "My shop in Onitsha burnt down last year. Everything I have is in this game.",
};

/** AI to AI scene scripts. Each is a list of [speaker, line] where A and B are the pair. */
const SCENES = {
  flirt: [
    [["A", "You look really good today, you know that?"], ["B", "I know. But say it again."], ["A", "Fine. You look really, really good."], ["B", "Hmm. Keep talking."]],
    [["A", "Why do I keep ending up next to you?"], ["B", "Maybe the universe is trying to tell you something."], ["A", "Or maybe you keep following me."], ["B", "Ehn? Please. You wish."]],
    [["A", "If this house wasn't full of cameras..."], ["B", "What would you do?"], ["A", "Wouldn't you like to know."], ["B", "Omo. Behave!"]],
  ],
  kiss: [
    [["A", "Come here."], ["B", "The cameras..."], ["A", "Let them watch."], ["*", "(They kiss. Somebody gasps across the room.)"]],
    [["B", "Say it."], ["A", "I like you. Too much."], ["*", "(A slow kiss. The whole house will know by breakfast.)"]],
  ],
  argue: [
    [["A", "Don't ever talk about me behind my back again!"], ["B", "Then stop doing things worth talking about!"], ["A", "{ex} You want wahala? You'll see wahala!"], ["B", "I'm not scared of you!"]],
    [["A", "You ate my food! I labelled it!"], ["B", "It's a shared kitchen, abeg!"], ["A", "Shared? Shared ke?"], ["B", "Go and cry to Mama Eye!"]],
    [["A", "I heard what you said in the garden."], ["B", "And? Everything I said is true!"], ["A", "You're fake! Everybody can see it!"], ["B", "Better fake than boring!"]],
  ],
  gossip: [
    [["A", "Have you noticed {x}? Always whispering."], ["B", "Ehen! I thought I was the only one."], ["A", "Something is not adding up."], ["B", "Let's watch {x} closely this week."]],
    [["A", "Between us... {x} is not who they pretend to be."], ["B", "Tell me everything. Now."], ["A", "Not here. Too many ears."], ["B", "Okay, tonight then."]],
    [["A", "{x} was talking about you yesterday."], ["B", "Me? What did they say?"], ["A", "Nothing sweet, let me just say that."], ["B", "Okay. Okay. Noted."]],
  ],
  deal: [
    [["A", "Wednesday is coming. You save me, I save you."], ["B", "Deal. But if you betray me..."], ["A", "I won't. Handshake?"], ["B", "Handshake."]],
    [["A", "We need numbers. You, me, and one more."], ["B", "Who can we trust?"], ["A", "Nobody. That's why we need each other."], ["B", "Fine. We're a team now."]],
  ],
  bond: [
    [["A", "You're the only sane person here, I swear."], ["B", "Hahaha! Birds of a feather."], ["A", "Whatever happens, we stay tight."], ["B", "Till the finale."]],
    [["A", "I miss my mum's egusi soup."], ["B", "Don't start! I'll cry!"], ["A", "Hahaha! Okay, okay. We'll survive."], ["B", "Together."]],
  ],
  scheme: [
    [["A", "The Whisper wants a name."], ["B", "Then we give them one. {x}."], ["A", "{x} has been asking too many questions."], ["B", "Exactly. Let's plant something."]],
    [["A", "Keep your face normal. They're watching."], ["B", "I know. Tomorrow we move."], ["A", "Skim small, not big. Nobody will notice."], ["B", "Trust me."]],
  ],
  cry: [
    [["A", "I can't do this. Everybody hates me."], ["B", "Hey, hey. Breathe. Nobody hates you."], ["A", "Then why do I feel alone?"], ["B", "Come. Let's sit down."]],
  ],
};

/** Reason lines AI use when they explain a vote or save. */
const MOTIVE = {
  save: ["Loyalty. Simple.", "They've been real with me.", "My heart chose.", "Strategy. That's all I'll say.", "They fed me when I was hungry."],
  evict: ["They're playing a game, not living.", "I don't trust them.", "Something about them is fake.", "The house is calmer without them.", "It's strategy. Nothing personal."],
};

/** Viewer feed templates. */
const TWEET = {
  ship: ["{a} and {b}?? #{s} is REAL", "The way {a} looks at {b}... #{s} forever", "Not me shipping {a} and {b} at 2am #{s}"],
  fight: ["{a} vs {b} is the content I pay data for", "{a} about to catch a strike, I can feel it", "{b} did NOT deserve that from {a}", "Somebody hold {a} back biko"],
  kiss: ["THEY KISSED. {a} and {b}. I'm screaming #{s}", "{a} and {b} kissing in the garden, the producers are eating good"],
  sus: ["Who else thinks {a} is a Saboteur?", "{a} is too quiet. That's a Saboteur move.", "Watch {a}. Just watch."],
  you: ["{a} is the main character this season", "{a} came to PLAY", "Not {a} running the whole house", "{a} is giving mastermind"],
  youbad: ["{a} is so fake it hurts", "{a} lying on camera like we can't see", "{a} needs to go on Sunday"],
  funny: ["{a} is the funniest person in that house", "{a} has me crying laughing every episode"],
  hoh: ["{a} as Head of House? The house is shaking", "{a} won HoH and chose violence"],
  noms: ["{a} on the nomination list?! I'm voting", "Save {a}! Vote vote vote!"],
  strike: ["{a} STRUCK?! The Saboteurs are not playing", "RIP {a}. The Saboteurs chose violence"],
  boring: ["Is {a} even in the house?", "{a} is wallpaper at this point"],
};
