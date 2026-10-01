// ---------------------------------------------------------------------------
// Character voice. Each housemate answers in their own way; the shared REPLY
// bank fills any gap. `open` lines start AI to AI scenes. Placeholders as in
// REPLY, plus {x} for the person a scene is about.
// ---------------------------------------------------------------------------

const VOICE = {
  tobi: {
    chat: {
      good: ["{ex} {you}! You get correct vibe. If this was my club, you'd be in VIP.", "This is the energy I like. No dull moment. Talk to me!"],
      meh: ["Yeah, yeah. Cool. Have you seen my chain today though?", "We dey. Just saving energy for the party."],
      bad: ["Abeg, I'm not in VIP mood right now.", "You're blocking my light, {pet}. Small small."],
    },
    joke: { good: ["Odogwu is CRYING! Hahaha! You're booked for my next show!", "Chai! Say it again so the cameras catch it!"], bad: ["Even my DJ tells better jokes. And he doesn't talk.", "That one no reach. Next!"] },
    compliment: { good: ["Finally, somebody said it! Odogwu is the moment.", "You see the drip? You see it! Thank you, {pet}."], bad: ["I know I'm fine. What else do you want?", "Compliment don land, but I still don't trust you."] },
    flirt: {
      good: ["Omo, you're bold! I like that. Come and sit closer.", "Is this how you want to play? Odogwu is ready."],
      meh: ["Haha, cute. Line up behind the others, {pet}.", "You're on the guest list. Not VIP yet."],
      bad: ["I'm flattered, but no. Odogwu has standards.", "Easy! Not everybody can handle this."],
    },
    deep: { good: ["No cameras? Okay. Real talk. {secret}", "Odogwu is not always loud, you know. {secret}"], bad: ["Deep talk ke? I'm here to shine, not to cry.", "Abeg, keep it light. My face is for the cameras."] },
    hug: { good: ["Come here! Odogwu hug, maximum strength!", "Group hug! Oh, it's just us. Still counts!"], bad: ["Mind the chain, mind the chain!", "Small space, {pet}. I just fixed my shirt."] },
    gift: { good: ["For me? Omo! You know how to treat a superstar!", "This is a VIP gift. I'm posting it the day I leave."] },
    shade: { good: ["Hahaha! You're wicked! Somebody bring ice!", "Chai! That one landed! The whole lounge felt it!"], bad: ["You want to shade Odogwu? On my own show?", "Say it louder, let the fans hear you fall."] },
    argue: { good: ["Okay, okay! Odogwu hears you. Calm down.", "Fine! You win. But I'm still the loudest."], bad: ["You're shouting at me? Me? Odogwu?!", "Lower your voice! You don't know who you're talking to!"] },
    apologize: { good: ["It's fine. Odogwu doesn't carry grudges. Too heavy.", "Accepted. Buy me a drink at the party and we're square."], bad: ["Sorry is not enough. You embarrassed me on camera.", "Keep it. I'm still vexed."] },
    open: {
      argue: ["Who touched my chain? Who?!", "You think you can disrespect me in front of everybody?"],
      flirt: ["You know you're the finest person in this house, abi?", "Tonight, you and me. The party. No excuses."],
      bond: ["Odogwu and you, we're the real ones!", "When we leave, I'm taking you to my club. VIP."],
      gossip: ["Have you seen {x}? Trying to steal my spotlight."],
    },
  },
  ada: {
    chat: {
      good: ["Ehen! See, this gist is going in my skit. You're a natural!", "Nne, you're funny without even trying. I'm jealous."],
      meh: ["Mm. I'm writing a skit in my head. Continue.", "Okay. Nice. Let me pretend I'm listening."],
      bad: ["This conversation is a skit, and nobody is laughing.", "Chineke, you again? I'm on break."],
    },
    joke: { good: ["Hahahaha! Nne! I'm stealing that joke. You'll see it online!", "Ehen! Who wrote that? Give that writer a raise!"], bad: ["As a professional comedian, I'm offended.", "Even my mother's jokes land better. And she has none."] },
    compliment: { good: ["Awww, nne! Say it into the camera so my fans hear.", "You noticed my edges? Somebody finally noticed!"], bad: ["Is this for a skit? Because it's not landing.", "Sweet mouth. I've written that character before."] },
    flirt: {
      good: ["Chineke! Is this a love skit? Because I'm playing along.", "Ehen, so you like me? Okay, I'll allow it."],
      meh: ["Haha, cute. That line needs a second draft.", "I'll think about it. Between takes."],
      bad: ["Cut! Cut! That scene is not working.", "Please, I came here for content, not this."],
    },
    deep: { good: ["Okay. No jokes. For once. {secret}", "Comedians cry too, you know. {secret}"], bad: ["If I talk deep, I'll start crying. Next topic.", "Nne, I only do deep talk on my own channel."] },
    hug: { good: ["Group hug! Okay, it's two of us. Still a group!", "Ehen! I needed this. Squeeze!"], bad: ["Ah ah, wait first. Let me finish my bit.", "Not now, my makeup is fresh."] },
    gift: { good: ["For me? Ehen! This is going in a thank-you skit!", "Chineke, you're too sweet. What do you want? I'm joking. Thank you!"] },
    shade: { good: ["HAHAHA! Nne, the shade! I'm screaming!", "That's a whole skit! Let me write it down!"], bad: ["You're throwing shade at the queen of shade? Brave.", "Nne, I'll roast you so well, your village will hear."] },
    argue: { good: ["Okay, fine! You win. I'll still put you in a skit.", "You're right. Don't let it go to your head."], bad: ["Chineke! You're shouting like a Nollywood villain!", "Ehen? You want to fight me? I'll write you out of my life!"] },
    apologize: { good: ["Apology accepted. You're back in my good skits.", "Fine. We move. You owe me one joke."], bad: ["Sorry? Your sorry is giving rehearsal.", "Not yet. Let me be angry in peace."] },
    open: {
      argue: ["So you think I didn't hear what you said? I hear everything!", "You're the villain of my next skit. Congratulations!"],
      flirt: ["If I put you in my skit, you'd be the love interest.", "Stop looking at me like that. I'll start blushing on camera."],
      bond: ["You and me, we should start a channel when we leave.", "Nne, I'm so happy you're here. This house is mad."],
      gossip: ["Nne, have you noticed how {x} talks? I'm writing a skit."],
    },
  },
  musa: {
    chat: {
      good: ["Wallahi, this is the best conversation I've had all week.", "You are easy to be around. That is rare here."],
      meh: ["Hmm. Yes. It is a fine day.", "I am listening. I just don't have much to say."],
      bad: ["Not now, my friend. I am thinking.", "Some silence would be better, I think."],
    },
    joke: { good: ["Hahaha! Ah, you got me. That was clever.", "Wallahi, I don't laugh easily. You made me laugh."], bad: ["Hmm. I will think about that one later.", "I understood it. I just did not find it funny."] },
    compliment: { good: ["Thank you. Kind words build strong foundations.", "You are generous. I will remember this."], bad: ["Hmm. Kind words come cheap in this house.", "Thank you. But what are you building with them?"] },
    flirt: {
      good: ["Ah. You make it hard to stay calm.", "Patience is my strength. You are testing it."],
      meh: ["You are sweet. Let us take it slowly.", "Hmm. I am not a man who rushes."],
      bad: ["I respect you, but no.", "My heart is not a game, my friend."],
    },
    deep: { good: ["I don't say this often. {secret}", "You have earned honesty. {secret}"], bad: ["Some doors stay closed. Forgive me.", "Not today. I am not ready."] },
    hug: { good: ["Come. You are family now.", "Ah. A good hug fixes many things."], bad: ["Let us just shake hands.", "I prefer my space, my friend."] },
    gift: { good: ["You did not have to. Thank you, truly.", "I will not forget this kindness."] },
    shade: { good: ["Hah! Sharp tongue. Remind me not to cross you.", "Ah. Cold, but true."], bad: ["That was unnecessary.", "Hmm. Words like that are hard to take back."] },
    argue: { good: ["Fine. You have a point. Let us stop here.", "I hear you. Let us both breathe."], bad: ["I am calm. Do not mistake that for weak.", "Wallahi, you will regret raising your voice at me."] },
    apologize: { good: ["Already forgiven. Life is too short.", "Thank you for saying it. We are good."], bad: ["I forgive slowly. Give me time.", "Words are easy. Show me."] },
    open: {
      argue: ["You crossed a line. I want you to know that.", "I have been patient with you. No more."],
      flirt: ["Walk with me in the garden tonight?", "You know I don't say things I don't mean."],
      bond: ["Whatever happens on Sunday, you have a brother in me.", "When this is over, come to Kaduna. My mother will feed you."],
      gossip: ["Have you watched {x} closely? Something does not fit."],
    },
  },
  ivie: {
    chat: {
      good: ["Darling, you have taste. I can tell from the way you talk.", "Oya, sit. You're the only interesting person today."],
      meh: ["Mm hm. Darling, have you seen my new braids?", "Cute talk. I'm busy being fabulous."],
      bad: ["Darling, not now. I'm in my creative zone.", "Ehn ehn, you're blocking my mirror."],
    },
    joke: { good: ["Hahaha! Darling, stop! My lashes are falling off!", "Oya, you're funny. And funny is very attractive."], bad: ["Darling, that joke is not in season.", "Ehn ehn. Try again next collection."] },
    compliment: { good: ["Darling! Finally somebody with an eye for design!", "You noticed the stitching? You're a keeper."], bad: ["I know I look good. What's the catch?", "Compliments are free. Votes are not, darling."] },
    flirt: {
      good: ["Oya, keep talking. I like where this is going.", "Darling, you're dangerous. I like dangerous."],
      meh: ["Cute. You're on my mood board. Not the runway yet.", "Maybe, darling. Impress me more."],
      bad: ["Darling, you're not my size.", "Ehn ehn. Wrong fabric, wrong fit."],
    },
    deep: { good: ["Darling, close the door. {secret}", "Behind all the fashion... {secret}"], bad: ["Deep talk wrinkles my face, darling. No.", "My secrets are couture. Not for everybody."] },
    hug: { good: ["Oya, come! Careful with the outfit. Okay, squeeze!", "Darling! Hug accepted. You smell nice."], bad: ["Darling, the dress! Don't crush the dress!", "Air hug. That's my policy."] },
    gift: { good: ["For me? Darling, you understand luxury!", "Oya, this is giving thoughtful. I love it."] },
    shade: { good: ["Darling! That was couture shade!", "Ehn ehn! You're wicked and I'm obsessed!"], bad: ["Darling, your shade is from last season.", "You want to shade a designer? I'll tailor you a reply."] },
    argue: { good: ["Fine, darling. You win this round.", "Oya, okay! Peace. My skin can't take stress."], bad: ["Darling, lower your voice. You're ruining my aura.", "Ehn ehn! Don't you dare come for me!"] },
    apologize: { good: ["Apology accepted, darling. Don't wrinkle it again.", "Oya, we're fine. Hug me."], bad: ["Darling, that sorry doesn't match your outfit.", "Not today. Try tomorrow, in better shoes."] },
    open: {
      argue: ["Who wore my dress without asking? Who?!", "Darling, you've been talking about me. I know everything."],
      flirt: ["Oya, tell me I look good. I know I do. Say it.", "Darling, you're staring. Should I charge for it?"],
      bond: ["When we leave, I'm designing your whole wardrobe.", "Darling, you're the only one here with sense."],
      gossip: ["Darling, have you seen what {x} has been wearing? And doing?"],
    },
  },
  kunle: {
    chat: {
      good: ["God bless you, {you}. You have a good spirit.", "This is fellowship. I've missed it in this house."],
      meh: ["Mm. Okay. God is in control.", "Fine, fine. I'm just here praying for strength."],
      bad: ["Haba. I'm not in the mood for idle talk.", "Let me be. I'm meditating."],
    },
    joke: { good: ["Jesu! Hahaha! God forgive me, that was funny!", "Ah ah! Even the angels are laughing!"], bad: ["Haba. That joke needs deliverance.", "I will pray for that joke."] },
    compliment: { good: ["Thank you. All glory to God.", "Ah ah, you'll make me proud. Pride is a sin. Say more."], bad: ["Flattery is a trap. Proverbs warned me.", "Hmm. The devil also says sweet things."] },
    flirt: {
      good: ["Ah ah! I'm blushing. God help me.", "Jesu! Okay. Okay. I'll allow it."],
      meh: ["Let us take it slow. With prayer.", "I need to pray about this one."],
      bad: ["Haba! Flee from temptation! Flee!", "No. My spirit is not agreeing."],
    },
    deep: { good: ["Okay. Confession time. {secret}", "God knows this, and now you. {secret}"], bad: ["Some things are between me and God.", "Not today. My heart is heavy."] },
    hug: { good: ["Come, let me pray over you. And hug you.", "God bless this hug. Amen."], bad: ["A holy handshake will do.", "Haba, keep a distance. For holiness."] },
    gift: { good: ["God will bless you! Thank you!", "Ah ah! This is a blessing!"] },
    shade: { good: ["Jesu! That was savage. Forgive me, I laughed.", "Haba! You're wicked. Say it again."], bad: ["God is watching you. And so am I.", "Your mouth will put you in trouble."] },
    argue: { good: ["Okay. Peace. Blessed are the peacemakers.", "Fine. Let it go. I'll pray for both of us."], bad: ["Haba! I rebuke that spirit! I rebuke it!", "You're shouting at a man of God? Ah!"] },
    apologize: { good: ["I forgive you. As I am forgiven.", "Amen. We're good, {pet}."], bad: ["I forgive. But I don't forget.", "Pray about it first. Then come back."] },
    open: {
      argue: ["God is watching, and so am I. What you did was wrong.", "Haba! You can't keep doing this to people!"],
      flirt: ["You know, I've been praying for someone like you.", "Sing with me tonight? Just us?"],
      bond: ["Let's pray together before Sunday.", "You're a blessing to this house, truly."],
      gossip: ["I don't like to judge, but {x}... God knows."],
    },
  },
  ebi: {
    chat: {
      good: ["You're real. I like real people. Sit down.", "Abeg, stay. You're the only one not getting on my nerves."],
      meh: ["Yeah. Fine. What else?", "I'm listening. Barely."],
      bad: ["Abeg, I'm not in the mood. Move.", "See me see trouble! You again?"],
    },
    joke: { good: ["Hahaha! Okay, that was funny. I'm not angry today.", "Abeg stop! I'm laughing, I'm laughing!"], bad: ["Is that a joke? Because I'm not laughing.", "Tufiakwa! Don't ever tell that joke again."] },
    compliment: { good: ["Thank you. You're not too bad yourself.", "Abeg, stop, before I start smiling."], bad: ["What do you want? Say it straight.", "I don't do sweet mouth. Say what you came for."] },
    flirt: {
      good: ["Hmm. You're brave. I like brave.", "Okay. You have my attention. Don't waste it."],
      meh: ["Slow down. I bite.", "Maybe. If you survive my temper."],
      bad: ["Tufiakwa! Not today, not ever.", "Abeg, redirect that energy before I redirect you."],
    },
    deep: { good: ["I don't open up. But fine. {secret}", "You've earned it. {secret}"], bad: ["My business is my business. Move.", "I don't do tears on camera."] },
    hug: { good: ["Come here. Quick one. Don't tell anybody.", "Fine. Hug. I needed it, okay?"], bad: ["Don't touch me. I'm warning you.", "Abeg, personal space. Pressure is building."] },
    gift: { good: ["For me? Okay. Thank you. Don't make it weird.", "Abeg, this is nice. I'm keeping it."] },
    shade: { good: ["Hahaha! Savage! That's how to talk!", "Correct! Somebody had to say it!"], bad: ["Say it to my face! Go on! Say it!", "See me see trouble! You want wahala?"] },
    argue: { good: ["Fine! Fine! You're right. I'm going to the gym.", "Okay! I hear you. Don't push it."], bad: ["You want to try me? Try me! I dare you!", "Tufiakwa! I will scatter this whole house!"] },
    apologize: { good: ["Okay. I accept. Don't do it again.", "We're good. My temper is down."], bad: ["Sorry? After everything? Abeg, comot.", "Not now. I'm still boiling."] },
    open: {
      argue: ["Try me. I dare you. Try me!", "You think I didn't see what you did? I saw everything!"],
      flirt: ["You. Me. Gym. Tomorrow morning. Don't be late.", "I don't do soft. But for you, maybe."],
      bond: ["Anybody touches you, they deal with me.", "You're my person in this house. Remember that."],
      gossip: ["{x} is getting on my last nerve. I'm not even joking."],
    },
  },
  nedu: {
    chat: {
      good: ["Interesting. You think before you talk. That's rare.", "I like this. Let's talk more often. Strategically."],
      meh: ["Okay. Noted.", "Mm. I'm running numbers in my head. Continue."],
      bad: ["I don't have bandwidth for this right now.", "This conversation has no return on investment."],
    },
    joke: { good: ["Hah! Okay, that was a good one. I'll allow it.", "Omo! You surprised me. I don't like surprises, but I liked that."], bad: ["I see the setup. I don't see the punchline.", "Interesting attempt. Low yield."] },
    compliment: { good: ["Thank you. I'll put that in my pitch deck.", "Appreciated. You read people well."], bad: ["Everybody has a price. What's yours?", "Flattery is a strategy. I know it well."] },
    flirt: {
      good: ["Interesting. You're a risk I might take.", "See ehn, I don't mix business and pleasure. Usually."],
      meh: ["Let me do my due diligence first.", "Maybe. Send me a proposal."],
      bad: ["That's not a deal I'm interested in.", "Hard pass. Nothing personal. Just numbers."],
    },
    deep: { good: ["Off the record? {secret}", "I've never told anyone here. {secret}"], bad: ["Information is currency. I don't give it out for free.", "No. Not yet."] },
    hug: { good: ["Okay. Quick hug. Strategic alliance confirmed.", "Fine. I'm not a hugger, but fine."], bad: ["Let's keep this professional.", "A handshake is more my style."] },
    gift: { good: ["Interesting. An investment in me? Smart.", "Thank you. I'll remember this when it counts."] },
    shade: { good: ["Omo. That was precise. Surgical.", "Interesting. I didn't know you had that in you."], bad: ["Cute. I'll remember that on Wednesday.", "Careful. I keep records."] },
    argue: { good: ["Fine. Your argument holds. For now.", "Okay. Let's not waste energy."], bad: ["You're emotional. I'm not. That's why I'll win.", "Raise your voice all you want. Numbers don't lie."] },
    apologize: { good: ["Accepted. Let's move forward.", "Noted. Account settled."], bad: ["I don't do refunds on trust.", "Too late. The market has moved."] },
    open: {
      argue: ["I know what you did. I have receipts. Literally.", "You thought I wouldn't notice? I notice everything."],
      flirt: ["You're the only person here I can't predict. I like that.", "Let's go somewhere quiet. I want to understand you."],
      bond: ["We should form a long-term partnership. In here and outside.", "You think clearly. We'll go far."],
      gossip: ["Look at {x}. Every move is calculated. Too calculated."],
    },
  },
  nkoyo: {
    chat: {
      good: ["Eh heh! My pikin, come and sit. Have you eaten?", "You have a good spirit. Come, let me dish you food."],
      meh: ["Mm. Okay, my dear. Go and rest.", "I'm cooking. Talk to me while I stir."],
      bad: ["Not now, my dear. The soup will burn.", "Nawa o. Let me face my pot."],
    },
    joke: { good: ["Eh heh! Hahaha! You'll kill me with laughter!", "My God! Say it again, let me laugh well!"], bad: ["Hmm. That joke needs more salt.", "Nawa o. Even the pepper is sweeter."] },
    compliment: { good: ["Thank you, my dear. It's the edikang ikong.", "Ahn, you're sweet. Come, I'll give you extra meat."], bad: ["Sweet mouth won't get you a second plate.", "Hmm. Who sent you?"] },
    flirt: {
      good: ["My God! You want to make me blush?", "Eh heh! Okay o. I'm listening."],
      meh: ["My dear, I'm too busy cooking for love.", "Hmm. Let me finish this pot first."],
      bad: ["Behave yourself, my pikin.", "Nawa o! Go and sit down."],
    },
    deep: { good: ["Come, sit. Let me tell you something. {secret}", "My dear... {secret}"], bad: ["Some stories need food first. Not today.", "My heart is not for sharing today."] },
    hug: { good: ["Come here, my pikin! Mama's hug!", "Eh heh! You needed this. I can tell."], bad: ["My hands are full of pepper, my dear!", "Not now, I'm cooking."] },
    gift: { good: ["Eh heh! For me? God will bless you!", "My dear, you shouldn't have. Thank you."] },
    shade: { good: ["Nawa o! Hahaha! You're wicked!", "My God! That shade is hotter than my pepper soup!"], bad: ["You're throwing shade in my kitchen? Get out!", "Nawa o. That mouth will get you evicted."] },
    argue: { good: ["Okay, okay. Eat something and calm down.", "Fine, my dear. I hear you."], bad: ["Don't raise your voice in my kitchen!", "My God! Is this how your mother raised you?"] },
    apologize: { good: ["It's okay, my pikin. Come and eat.", "All forgiven. Food heals everything."], bad: ["Hmm. You hurt me. Give me time.", "Not yet. The pot is still hot."] },
    open: {
      argue: ["Who ate the food I kept? Who?!", "In my kitchen? You'll disrespect me in my kitchen?"],
      flirt: ["You always come to the kitchen when I'm cooking. Is it the food, or me?", "Eh heh! Taste this. Then tell me I'm not your favourite."],
      bond: ["Come and eat. You're too thin. Everybody here is too thin.", "When this is over, come to Calabar. I'll feed you for a week."],
      gossip: ["My dear, I've been watching {x}. Something is not right."],
    },
  },
  zee: {
    chat: {
      good: ["For the record, you're one of the smart ones.", "I like you. That's rare. Don't make me regret it."],
      meh: ["Okay. Noted for the record.", "Mm. Fascinating. Truly."],
      bad: ["Objection. This conversation is irrelevant.", "Excuse me? Did I invite you to sit?"],
    },
    joke: { good: ["Kai! Okay, that was actually funny. Sustained.", "Hahaha! I object to how funny that was."], bad: ["Objection. That joke lacks evidence of humour.", "Wow. No."] },
    compliment: { good: ["Correct. And thank you for noticing.", "Finally, an accurate statement."], bad: ["Flattery is inadmissible.", "I'm not rude, I'm just correct. And you're suspicious."] },
    flirt: {
      good: ["Kai! Okay, I'll consider your application.", "Interesting argument. Continue."],
      meh: ["Motion to delay. I'll think about it.", "Maybe. Present more evidence."],
      bad: ["Case dismissed.", "Excuse me? No. Absolutely not."],
    },
    deep: { good: ["This stays privileged. {secret}", "Off the record. {secret}"], bad: ["I'm not answering that.", "That's confidential."] },
    hug: { good: ["Fine. One hug. Don't tell anybody.", "Kai! Okay, I needed that."], bad: ["Excuse me? Personal space is a right.", "Let's not."] },
    gift: { good: ["Wow. For me? Okay, you're winning.", "Thank you. Exhibit A of good taste."] },
    shade: { good: ["Kai! That was a closing argument!", "Wow. Savage. I respect it."], bad: ["Excuse me? I will cross-examine you.", "Careful. I argue for a living."] },
    argue: { good: ["Fine. Your point stands. Barely.", "Okay. I concede this one. Only this one."], bad: ["Objection! You're out of order!", "Excuse me?! I will destroy you with facts!"] },
    apologize: { good: ["Apology entered into the record. Accepted.", "Fine. We're good."], bad: ["Rejected. Insufficient remorse.", "I don't accept apologies without evidence."] },
    open: {
      argue: ["For the record, I heard everything you said about me.", "You want to argue with a lawyer? Interesting choice."],
      flirt: ["I've been building a case for why you should like me.", "Admit it. You've been looking at me all day."],
      bond: ["You're the only person I'd want as co-counsel.", "Stick with me. I always win."],
      gossip: ["I've been building a case against {x}. Want to see the evidence?"],
    },
  },
  mekus: {
    chat: {
      good: ["Nwanne! You talk like money. I like it!", "Hear me! The way you talk, you'll do well in Onitsha market."],
      meh: ["Okay o. Market is slow today.", "Mm. When money speaks, I listen. You're not money."],
      bad: ["Ahn ahn, not now. I'm calculating.", "Nwanne, go and come back. The shop is closed."],
    },
    joke: { good: ["Hahaha! Nwanne! You're my competition now!", "Ahn ahn! That one is for sale! I'm buying it!"], bad: ["That joke is cheap. Even I can't sell it.", "Hear me, leave comedy for me."] },
    compliment: { good: ["Thank you! You know quality when you see it!", "Nwanne! You have eyes. Very good eyes."], bad: ["A sweet tongue sells bad goods. What are you selling?", "Hmm. Even the trader smiles before he cheats."] },
    flirt: {
      good: ["Ahn ahn! You want to buy my heart? It's not cheap o!", "Hear me! I'm interested. Let's negotiate."],
      meh: ["Let me check my stock first.", "Maybe. Come back after market day."],
      bad: ["Nwanne, this market is closed.", "No discount for you. Sorry."],
    },
    deep: { good: ["When a man tells you his story, he's giving you his wealth. {secret}", "Hear me well. {secret}"], bad: ["A wise trader doesn't show his stock to everybody.", "Not today, nwanne. The shop is closed."] },
    hug: { good: ["Nwanne! Come here! Big hug!", "Ahn ahn! This is a fat hug. Thank you!"], bad: ["Ahn ahn, hold on. Mind my pockets.", "Small small, nwanne."] },
    gift: { good: ["Hear me! You understand business! Thank you!", "Nwanne! A gift? I'll pay you back with interest."] },
    shade: { good: ["Hahaha! The shade! Even my customers can't talk like that!", "Ahn ahn! You're wicked! I'm learning!"], bad: ["When a fool throws shade, the wise man smiles. I'm smiling.", "Hear me, don't start what you can't finish."] },
    argue: { good: ["Okay! Okay! When two elephants fight, the grass suffers. Let's stop.", "Fine, nwanne. You win this market day."], bad: ["Ahn ahn! You're shouting at me like I owe you!", "Hear me! The fly that has nobody to advise it follows the corpse into the grave!"] },
    apologize: { good: ["It's okay, nwanne. Business continues.", "Accepted. We move. Profit over pride."], bad: ["Sorry doesn't pay debts.", "Ahn ahn. Not yet. The wound is fresh."] },
    open: {
      argue: ["You owe me! Don't play with my money!", "Hear me! You can't cheat a trader!"],
      flirt: ["If you were goods, I wouldn't even negotiate. Full price.", "Nwanne, come and help me count money. I'll give you commission."],
      bond: ["After this house, come to Onitsha. We'll do business together.", "You're family now. My shop is your shop."],
      gossip: ["Hear me, {x} is pricing everybody like goods in the market."],
    },
  },
};

/** The reply bank for a housemate: their own voice most of the time, the shared bank otherwise. */
function replyBank(r, id, act, out) {
  const v = VOICE[id] && VOICE[id][act] && VOICE[id][act][out];
  return v && r.chance(0.75) ? v : REPLY[act][out];
}

/**
 * Things housemates bring up from memory before they answer you. tone: -1
 * sours the talk, +1 warms it, 0 is just colour.
 */
const CALLBACK = {
  kiss_jealous: { tone: -1, t: ["I saw you and {y} in the {room}. Don't come here with sweet talk.", "{ex} You and {y}? In the {room}? And now you're talking to me?"] },
  kiss_tease: { tone: 0, t: ["{ex} I saw you and {y} in the {room}. The cameras are eating good.", "So you and {y}, abi? The whole house saw it."] },
  fight_mine: { tone: -1, t: ["After how you shouted at me {when}? You get mind.", "You still owe me an apology for {when}."] },
  fight_saw: { tone: 0, t: ["That wahala with {y} {when}? Abeg, calm down small.", "I saw you and {y} going at it {when}. Who started it?"] },
  told: { tone: 1, t: ["I've been watching {x} since you told me. You might be right.", "About what you said about {x}... I'm keeping my eyes open."] },
  grudge: { tone: 1, t: ["I haven't settled that matter with {x} yet. Thank you for telling me.", "{x} and I will talk. Thanks to you."] },
  broke: { tone: -1, t: ["You promised to save me. Then you didn't. I remember.", "Wednesday, you said you had my back. Where were you?"] },
  saw_skim: { tone: -1, t: ["I saw what you did with the hustle money. I haven't told anybody. Yet.", "Money went missing on that task, and I know where some of it went."] },
  snoop: { tone: -1, t: ["I saw you going through {y}'s things {when}. What were you looking for?", "Next time you snoop, check who is watching."] },
  empty_bed: { tone: -1, t: ["Your bed was empty at night. Where did you go?", "Night walks, abi? Your bed was empty."] },
  planted: { tone: -1, t: ["Somebody told me to watch you. So I'm watching.", "I got a note about you. Strange, no?"] },
  crushtalk: { tone: 0, t: ["Have you said anything to {x}? About what I told you?", "Shh. Does {x} know yet? Don't tell me you told them!"] },
  laughed: { tone: 1, t: ["My comedian! I'm still laughing from {when}.", "Ahn ahn, say something funny again. Like {when}."] },
  gift: { tone: 1, t: ["I still remember the gift. You're thoughtful.", "You looked out for me {when}. I don't forget kindness."] },
  deep: { tone: 1, t: ["Thank you for listening {when}. It helped.", "I feel lighter since our talk."] },
  shaded: { tone: -1, t: ["So you're the one throwing shade {when}. Say it again.", "After that shade {when}? You want to talk now?"] },
  curved: { tone: 0, t: ["About {when}... no hard feelings, okay?", "Things were awkward {when}. Let's reset."] },
  liar: { tone: -1, t: ["You lied to me about {x}. I haven't forgotten.", "Before you talk, remember the lie about {x}."] },
  ship: { tone: 1, t: ["There you are! I was looking for you.", "My person! Where have you been?"] },
};
/** Moves where a memory can colour the reply. */
const CB_ACTS = new Set(["chat", "joke", "compliment", "deep", "hug", "gift", "flirt", "askout", "kiss", "asksave", "squad", "swear", "apologize", "peace"]);

function whenOf(s, m) { return m.d === s.day ? "earlier" : m.d === s.day - 1 ? "yesterday" : "the other day"; }

/** The freshest thing housemate t remembers about you that they haven't raised yet. */
function callbackFor(s, r, t, act) {
  if (!CB_ACTS.has(act)) return null;
  const h = hmOf(s, t), now = s.day * 1440 + s.min;
  if (h.cbAt !== undefined && now - h.cbAt < 180) return null;
  const mem = s.mem[t] || [];
  const v = rel(s, t, ME);
  let pick = null;
  const lie = s.lies.find((l) => l.to === t && l.exposed && !l.cb);
  if (lie) pick = { key: "liar", x: lie.about, ref: lie, d: lie.d };
  for (let i = mem.length - 1; i >= 0 && !pick; i--) {
    const m = mem[i];
    if (m.cb || m.d < s.day - 2) continue;
    const mine = m.x === ME || m.y === ME || m.src === ME;
    const other = m.x === ME ? m.y : m.x;
    let key = null;
    switch (m.k) {
      case "kiss": if (mine && other !== t) key = v[RO] >= 30 ? "kiss_jealous" : "kiss_tease"; break;
      case "fight": if (mine) key = other === t ? "fight_mine" : "fight_saw"; break;
      case "told": case "grudge": if (m.src === ME && hmOf(s, m.x) && !hmOf(s, m.x).out) key = m.k; break;
      case "crushtalk": if (hmOf(s, m.x) && !hmOf(s, m.x).out) key = m.k; break;
      case "broke": case "saw_skim": case "empty_bed": case "planted": case "laughed": case "gift": case "deep": case "shaded": case "curved": case "snoop":
        if (m.x === ME) key = m.k; break;
    }
    if (key) pick = { key, x: m.x, y: m.k === "snoop" ? m.y : other, room: m.room, ref: m, d: m.d };
  }
  if (!pick) { const sh = findShip(s, t, ME); if (sh && sh.official && r.chance(0.3)) pick = { key: "ship", d: s.day }; }
  if (!pick || !r.chance(pick.key === "liar" ? 0.7 : 0.5)) return null;
  if (pick.ref) pick.ref.cb = true;
  h.cbAt = now;
  const cb = CALLBACK[pick.key];
  const text = fill(s, r, r.pick(cb.t), t, { x: pick.x })
    .replace(/\{y\}/g, pick.y ? nameOf(s, pick.y) : "them")
    .replace(/\{room\}/g, pick.room || "house")
    .replace(/\{when\}/g, whenOf(s, pick));
  return { t: text, tone: cb.tone, key: pick.key, ref: pick.ref };
}

/** First line of an AI to AI scene in the speaker's own voice, or null. */
function sceneOpener(r, id, kind) {
  const o = VOICE[id] && VOICE[id].open && VOICE[id].open[kind];
  return o && r.chance(0.55) ? r.pick(o) : null;
}

// More scene scripts, merged into SCENES so every kind has more variety.
const SCENES_MORE = {
  argue: [
    [["A", "Why is my cream finishing so fast? Somebody is using it!"], ["B", "Is your name written on it?"], ["A", "It's MY cream! In MY bag!"], ["B", "Then lock your bag, abeg!"]],
    [["A", "You nominated me. Don't lie, I know you did."], ["B", "Prove it."], ["A", "{ex} I don't need proof, I have eyes!"], ["B", "Then use them to find the door."]],
    [["A", "Every time I talk, you roll your eyes."], ["B", "Because every time you talk, it's nonsense."], ["A", "Say that again!"], ["B", "Nonsense! There, I said it!"]],
    [["A", "You've been smiling in my face and stabbing my back."], ["B", "Who told you that? Point the person out."], ["A", "Everybody knows!"], ["B", "Then everybody is lying!"]],
  ],
  flirt: [
    [["A", "Dance with me at the party?"], ["B", "Only if you don't step on my feet."], ["A", "I'll step on your heart instead."], ["B", "Omo. That was smooth. Too smooth."]],
    [["A", "Why are you blushing?"], ["B", "I'm not blushing. It's hot."], ["A", "The AC is on full."], ["B", "...Leave me alone!"]],
    [["A", "If we both make the finale, dinner is on me."], ["B", "And if only one of us makes it?"], ["A", "Then you'll come and find me."], ["B", "Hmm. Deal."]],
  ],
  kiss: [
    [["A", "We shouldn't."], ["B", "But we want to."], ["*", "(They lean in. Somewhere, a housemate drops a spoon.)"]],
  ],
  gossip: [
    [["A", "Did you see {x} at the Jollof Clash? Pure drama."], ["B", "They wanted to win too badly."], ["A", "Desperate people do desperate things."], ["B", "Exactly. Let's watch them."]],
    [["A", "{x} said they're here for love."], ["B", "Love? In this house? Please."], ["A", "They're here for the money like everybody."], ["B", "At least we're honest about it."]],
  ],
  deal: [
    [["A", "If I win Head of House, you're my tenant."], ["B", "And what do I give you?"], ["A", "Your save. Every Wednesday."], ["B", "Fine. But I keep receipts."]],
  ],
  bond: [
    [["A", "Do you remember your first day in this house?"], ["B", "I was so scared! I almost went back!"], ["A", "And now look at you, running things."], ["B", "Hahaha! We run things!"]],
    [["A", "When this is over, we're still friends. Promise?"], ["B", "Promise. Even if you win and forget me."], ["A", "Never! I'll share the money... small."], ["B", "Hahaha! Small ke?"]],
    [["A", "Teach me your dance. The one from the party."], ["B", "You're not ready."], ["A", "Try me."], ["B", "Okay. Left foot first. No! Your other left!"]],
  ],
  scheme: [
    [["A", "They're starting to suspect. We need a distraction."], ["B", "Then let's start a fight. {x} and somebody loud."], ["A", "Perfect. Nobody looks for a Saboteur in the middle of wahala."], ["B", "Say less."]],
  ],
  cry: [
    [["A", "I miss my family. Everything is too loud here."], ["B", "Hey. Look at me. You're stronger than this house."], ["A", "You think so?"], ["B", "I know so. Come, let's get some air."]],
    [["A", "I think the fans hate me."], ["B", "The fans don't hate you. The fans love drama. That's all."], ["A", "Then why do I feel so small?"], ["B", "Because you're tired. Rest. Tomorrow is new."]],
  ],
};
for (const k of Object.keys(SCENES_MORE)) SCENES[k] = SCENES[k].concat(SCENES_MORE[k]);
