/* =========================================================
   EVERYBODIES GOT SOMETHIN — data.js
   Questionnaire, diagnoses, items, pills, enemies, bosses,
   room templates, and all of Dr. Walrus's bedside manner.
   ========================================================= */
'use strict';

const DATA = {};

/* ============ DR. WALRUS QUESTIONNAIRE ============ */
DATA.WALRUS_INTROS = [
  "Come in, come in. Sit. I'm Dr. Walrus — note the head mirror, it means I'm a doctor. Quick questionnaire, then your diagnosis. Don't worry: everybody's got somethin.",
  "Welcome to the practice. My diploma is from a cruise ship, but my confidence is board-certified. Five questions. Be honest — it won't change anything.",
  "Ah, a walk-in. Perfect. The Walrus Method™: five questions, one label, zero follow-ups. Let's find out what you are."
];

DATA.QUESTIONS = [
  {
    q: "Do you ever lose focus?",
    a: [
      { t: "Sometimes, if it's boring", w: { adhd: 2 }, quip: "'Boring.' Interesting. Writing that in pen." },
      { t: "Never. I focus on everything, at once, always.", w: { anxiety: 2, adhd: 1 }, quip: "That is not the flex you think it is." },
      { t: "Sorry — what was the question?", w: { adhd: 3 }, quip: "Classic. Textbook. I own one textbook." },
      { t: "No.", w: { fine: 2 }, quip: "Denial. Noted." }
    ]
  },
  {
    q: "How's your energy lately?",
    a: [
      { t: "Up and down. Mostly at random.", w: { bipolar: 3 }, quip: "Random, or on a SCHEDULE you can't see? Exactly." },
      { t: "Down. Just... down.", w: { depression: 2 }, quip: "Mm. Gravity of the soul. Very billable." },
      { t: "UP!! Right now?? VERY UP!!", w: { bipolar: 2, adhd: 1 }, quip: "Please stop vibrating my diplomas." },
      { t: "Normal amounts of energy?", w: { fine: 2 }, quip: "'Normal.' Sure. We'll circle back." }
    ]
  },
  {
    q: "Do you ever feel sad?",
    a: [
      { t: "Sundays, around 7 p.m., like clockwork", w: { depression: 2, anxiety: 1 }, quip: "The Sunday Scaries are a load-bearing symptom." },
      { t: "Only when sad things happen", w: { fine: 2 }, quip: "Sadness with a CAUSE? Suspiciously healthy." },
      { t: "Define 'feel'", w: { depression: 3 }, quip: "Oh, that's the good stuff. Chart-wise." },
      { t: "I contain multitudes", w: { bipolar: 2 }, quip: "Multitudes are billed separately." }
    ]
  },
  {
    q: "Do you worry about things?",
    a: [
      { t: "Only things that could conceivably happen", w: { anxiety: 3 }, quip: "So... everything. Wonderful." },
      { t: "I keep a spreadsheet of my worries", w: { anxiety: 3, ocd: 1 }, quip: "Organized dread. I respect it clinically." },
      { t: "Should I be worried? Is this about the worrying?", w: { anxiety: 2 }, quip: "Shh. Shhhh. Yes." },
      { t: "Not really", w: { fine: 2 }, quip: "Fascinating. And troubling. Mostly billable." }
    ]
  },
  {
    q: "Do you ever hear a little voice in your head?",
    a: [
      { t: "Yes — it's called thinking?", w: { fine: 1, schizo: 1 }, quip: "That's what a voice WOULD say." },
      { t: "It narrates me in the third person", w: { schizo: 2 }, quip: "Is it flattering? Never mind. Symptom." },
      { t: "It has opinions about my choices", w: { schizo: 2, depression: 1 }, quip: "A critic! In THIS economy." },
      { t: "Which one?", w: { schizo: 3 }, quip: "...I'm going to need a bigger pad." }
    ]
  },
  {
    q: "How often do you check your phone?",
    a: [
      { t: "Define 'a lot'", w: { adhd: 2, anxiety: 1 }, quip: "The defensiveness is diagnostic." },
      { t: "*checks phone*", w: { adhd: 3 }, quip: "Incredible. Mid-question. A privilege to witness." },
      { t: "Only about 400 times a day", w: { anxiety: 2, adhd: 1 }, quip: "Four hundred. A nice round symptom." },
      { t: "I left it at home to be present", w: { anxiety: 2 }, quip: "Performative wellness. Also a symptom." }
    ]
  },
  {
    q: "Did you have a childhood?",
    a: [
      { t: "Yes?", w: { adhd: 1, bipolar: 1, depression: 1, anxiety: 1, schizo: 1 }, quip: "Hm. Trauma." },
      { t: "A pretty happy one, actually", w: { adhd: 1, bipolar: 1, depression: 1, anxiety: 1, schizo: 1 }, quip: "Repressed trauma. The worst kind." },
      { t: "We don't talk about that", w: { depression: 2, anxiety: 1 }, quip: "WE do. At these rates, we absolutely do." },
      { t: "No", w: { fine: 1, schizo: 1 }, quip: "...I'll put 'yes'." }
    ]
  },
  {
    q: "How do you sleep?",
    a: [
      { t: "4 hours, victoriously", w: { bipolar: 2, adhd: 1 }, quip: "Victory sleep. The manic classic." },
      { t: "12 hours, somehow still tired", w: { depression: 2 }, quip: "Sleep debt with interest. Very modern." },
      { t: "With one eye open", w: { anxiety: 2, schizo: 1, ptsd: 1 }, quip: "Vigilance! The eyelids of the anxious." },
      { t: "At night, like a person", w: { fine: 2 }, quip: "'Like a person.' Rehearsed. Noted." }
    ]
  },
  {
    q: "Describe your desk.",
    a: [
      { t: "Organized chaos. I know where everything is.", w: { adhd: 2 }, quip: "You do not, and that's okay. Clinically." },
      { t: "Sterile. Labeled. Alphabetized.", w: { ocd: 3, anxiety: 1 }, quip: "The label maker is a cry for help I can bill." },
      { t: "What desk?", w: { depression: 1, adhd: 1 }, quip: "The floor is a desk with commitment issues." },
      { t: "I reorganize it at 3 a.m. sometimes", w: { bipolar: 2 }, quip: "Ah, the 3 a.m. Feng Shui Event. Say no more." }
    ]
  },
  {
    q: "Before you can leave the house, you...",
    a: [
      { t: "Check the stove. Then check it again. Then again.", w: { ocd: 3 }, quip: "Third time's the charm. So is the fourth." },
      { t: "Need everything symmetrical or I can't go", w: { ocd: 3 }, quip: "The universe should match. Agreed — but it's a symptom." },
      { t: "Just leave? Like a normal person?", w: { fine: 2 }, quip: "Suspiciously breezy. Noted." },
      { t: "Leave, panic, come back, re-panic", w: { anxiety: 2, ocd: 1 }, quip: "The round trip of the worried." }
    ]
  },
  {
    q: "A door slams behind you. You...",
    a: [
      { t: "Hit the floor before I've decided to", w: { ptsd: 3 }, quip: "The body keeps the score — and the receipts." },
      { t: "Am instantly, fully awake. For hours.", w: { ptsd: 2, anxiety: 1 }, quip: "Hypervigilance: unpaid overtime for the nervous system." },
      { t: "Am briefly somewhere in 2009", w: { ptsd: 3 }, quip: "Dissociation. A frequent flyer here." },
      { t: "Say 'jumpy today, huh' and move on", w: { fine: 2 }, quip: "'Jumpy.' We'll be monitoring that." }
    ]
  },
  {
    q: "Rate your mood right now, 1 to 10.",
    a: [
      { t: "7. No wait — 6.5. Is that bad?", w: { anxiety: 2 }, quip: "The decimal is doing a lot of work here." },
      { t: "It fluctuates as we speak", w: { bipolar: 2 }, quip: "A live mood. Exciting. Dangerous. Billable." },
      { t: "3", w: { depression: 2 }, quip: "A 3 that answered promptly. Brave." },
      { t: "10!!!! Why do you ask!!", w: { bipolar: 2, anxiety: 1 }, quip: "Four exclamation points. I'm calling it." }
    ]
  }
];

DATA.CARD_LINES = [
  "Copay collected: your dignity.",
  "Treatment plan: violence, apparently.",
  "Refills: infinite. Questions: none.",
  "Second opinions are out-of-network.",
  "This diagnosis took 45 seconds. You're welcome."
];

/* ============ DIAGNOSES ============ */
DATA.DIAG = {
  adhd: {
    name: "ADHD",
    short: "Attention-Deficit / Hyperactivity",
    tag: "fast & twitchy",
    color: "#f7b32b",
    blurb: "You checked your phone during the questionnaire. Twice. In his professional opinion: zoom zoom.",
    mech: "FAST & TWITCHY: +speed, +fire rate, but your shots wander. Stand still for 1 second to HYPERFOCUS (+50% damage, glowing ring).",
    rx: "fidget"
  },
  bipolar: {
    name: "Bipolar Disorder",
    short: "Type: Whichever Sells",
    tag: "boom & bust",
    color: "#b86bff",
    blurb: "Your mood has a schedule, and it does not consult you.",
    mech: "MOOD CYCLE every 10s — MANIA: +30% speed & damage. THE DIP: slower and weaker, but you take half damage. The ring on the HUD shows what's coming.",
    rx: "moodring"
  },
  depression: {
    name: "Chronic Depression",
    short: "Big Sad (Recurring)",
    tag: "slow, heavy, unstoppable",
    color: "#5d8aa8",
    blurb: "The good news: you were right — everything IS exhausting.",
    mech: "HEAVY: slower, but your huge tears hit 30% harder. +1 heart. THE BLANKET absorbs the first hit you take on every floor.",
    rx: "gratitude"
  },
  anxiety: {
    name: "Generalized Anxiety",
    short: "Generalized. Very Generalized.",
    tag: "fragile & fast",
    color: "#43b8a5",
    blurb: "You had already diagnosed yourself at 3 a.m. He's just doing the paperwork.",
    mech: "WIRED: one less heart, but faster — and when enemies get close, ADRENALINE kicks in (+speed, +fire rate). Enemy shots glint before they hurt.",
    rx: "meditapp"
  },
  schizo: {
    name: "Schizophrenia",
    short: "Diagnosed In Under 4 Questions",
    tag: "trust nothing",
    color: "#ff7a9e",
    blurb: "A new record for the practice. He seemed excited, which was worse.",
    mech: "+20% damage. Some enemies in every room AREN'T REAL — fakes pop in one hit and can't hurt you. You never know which. The Voice occasionally helps.",
    rx: "tinfoil"
  },
  ocd: {
    name: "OCD (Obsessive-Compulsive)",
    short: "Everything In Its Right Place",
    tag: "precise & compulsive",
    color: "#6c7ff0",
    blurb: "You straightened his pens while answering. He noticed. He wrote it down. You wanted to straighten the note.",
    mech: "SYMMETRY: you fire a balanced PAIR of tears. Keep order — fully clear a room and your COMPULSION resets, granting FOCUS (+50% damage). Let it build and the intrusive thoughts start to bite.",
    rx: "webmd"
  },
  ptsd: {
    name: "PTSD (Post-Traumatic Stress)",
    short: "It Followed You Home",
    tag: "vigilant & haunted",
    color: "#c25a52",
    blurb: "You flinched at the door chime. He noted it — then chimed it again, to be sure. You were already somewhere else.",
    mech: "HYPERVIGILANT: enemy shots are always outlined, and a near-miss slows time for a heartbeat. ON EDGE: +25% damage while you stay untouched — but every hit is a FLASHBACK, and rooms you clear don't stay safe.",
    rx: "beta"
  },
  fine: {
    name: "Perfectly Fine",
    short: "DENIAL (severe)",
    tag: "hard mode: nothing is wrong",
    color: "#9e9e9e",
    blurb: "Nothing is wrong with you. Clinically speaking, this is the worst thing Dr. Walrus has ever seen.",
    mech: "No condition, no crutches. Items work 15% harder on you — so does everything trying to kill you (+15% enemy health).",
    rx: null
  }
};

/* ============ ITEMS ============ */
/* apply(p, G) mutates the player. Flags are read by game logic. */
DATA.ITEMS = {
  /* --- starters / uniques --- */
  fidget:    { name: "Fidget Spinner", quote: "Clinically proven-ish.", desc: "An orbiting spinner that blocks shots and shreds anyone who gets close.", pools: ["special"], apply(p) { p.familiars.push(new Familiar('spinner')); } },
  moodring:  { name: "Mood Ring", quote: "It knows before you do.", desc: "Shows your mood phase on the HUD. You had this already. It came with the diagnosis.", pools: [], apply(p) { p.flags.moodring = true; } },
  gratitude: { name: "Gratitude Journal", quote: "Today I'm grateful for: violence.", desc: "25% chance to heal half a heart when you clear a room.", pools: ["special"], apply(p) { p.flags.gratitude = true; } },
  meditapp:  { name: "Meditation App (Free Trial)", quote: "Breathe in... dodge out.", desc: "Enemy bullets near you move 30% slower. Trial never expires. Suspicious.", pools: ["special"], apply(p) { p.flags.slowBullets = true; } },
  tinfoil:   { name: "Tin Foil Hat", quote: "They can't read what doesn't parse.", desc: "Enemy marksmen miss 25% more. Stylish. Crinkly.", pools: ["special"], apply(p) { p.flags.tinfoil = true; } },

  /* --- pharma cabinet --- */
  brand:     { name: "Focusium®", quote: "Ask your doctor. He'll say yes.", desc: "Fire rate way up. Name-brand. Your copay funded this tagline.", pools: ["special", "shop"], apply(p) { p.tearDelay *= 0.78; } },
  generic:   { name: "Focusium (Generic)", quote: "Same molecule, worse font.", desc: "Fire rate WAY up, accuracy down. It's fine. It's basically fine.", pools: ["special"], apply(p) { p.tearDelay *= 0.7; p.wobble += 0.13; } },
  ssri:      { name: "SSRIs", quote: "Feelings: buffering...", desc: "+1.5 damage, slower shots. The edges come off everything, including your tears.", pools: ["special"], apply(p) { p.dmg += 1.5; p.shotSpd *= 0.85; } },
  lithium:   { name: "Lithium", quote: "The original mood moderator.", desc: "Bipolar: stabilizes your cycle into permanent mild power. Everyone else: +damage, +half heart.", pools: ["special"], apply(p) { if (p.diag === 'bipolar') { p.flags.stable = true; } else { p.dmg += 0.5; p.maxhp += 1; p.hp += 1; } } },
  beta:      { name: "Beta Blockers", quote: "The hands. They're steady.", desc: "Removes shot wander. Panic becomes focus.", pools: ["special"], apply(p) { p.wobble = 0; p.flags.noWobble = true; } },
  antipsy:   { name: "Antipsychotic (XR)", quote: "Reality: now in HD.", desc: "+1 heart, +0.5 damage. Hallucinated enemies shimmer — you can finally tell.", pools: ["special", "oon"], apply(p) { p.maxhp += 2; p.hp += 2; p.dmg += 0.5; p.flags.seeFakes = true; } },
  amps:      { name: "Amphetamine Salts", quote: "Lunch is for the unmedicated.", desc: "+20% speed, +15% fire rate, -1 heart (appetite is a memory).", pools: ["special", "oon"], apply(p) { p.spd *= 1.2; p.tearDelay *= 0.85; p.maxhp = Math.max(2, p.maxhp - 2); p.hp = Math.min(p.hp, p.maxhp); } },
  melatonin: { name: "Melatonin Gummies", quote: "Bear-shaped unconsciousness.", desc: "+1 luck (better drops). Slightly sleepier shots.", pools: ["special", "shop"], apply(p) { p.luck += 1; p.tearDelay *= 1.04; } },
  sampler:   { name: "Trial Sample Pack", quote: "The first one's free. So are the rest, legally speaking.", desc: "A free pill, and all pills this run come pre-identified.", pools: ["special", "shop"], apply(p, G) { p.flags.pillsKnown = true; if (p.pill == null) p.pill = U.randi(0, 9); } },
  sideeffects: { name: "Side Effects May Include", quote: "*reads fast* +2 damage and— everything else.", desc: "+2 damage. Every new floor: one random minor side effect. Worth it?", pools: ["special", "oon"], apply(p) { p.dmg += 2; p.flags.sideEffects = true; } },

  /* --- coping section --- */
  dog:       { name: "Therapy Dog", quote: "He's certified. Self-certified. Like the doctor.", desc: "A good boy who bites your problems.", pools: ["special"], apply(p) { p.familiars.push(new Familiar('dog')); } },
  plush:     { name: "Emotional Support Walrus", quote: "Squeak.", desc: "A plush walrus follows you and blocks enemy shots. Ironic. Comforting.", pools: ["special", "shop"], apply(p) { p.familiars.push(new Familiar('plush')); } },
  journal:   { name: "Journaling", quote: "Dear diary: the floor plan.", desc: "Reveals the full map of every floor.", pools: ["special"], apply(p, G) { p.flags.mapReveal = true; if (G && G.floorRooms) G.floorRooms.forEach(r => r.discovered = true); } },
  gym:       { name: "Gym Membership", quote: "You WILL be asked if you even lift.", desc: "+0.15 damage per room cleared this floor (resets each floor, caps at +1.5).", pools: ["special"], apply(p) { p.flags.gym = true; } },
  coldshower:{ name: "Cold Shower", quote: "AAAAAAAH (dopamine).", desc: "Longer invincibility after taking a hit. You're used to discomfort now.", pools: ["special"], apply(p) { p.iframeTime = Math.max(p.iframeTime, 1.9); } },
  grounding: { name: "Grounding Technique", quote: "5 things you can see, 4 you can shoot...", desc: "Taking a hit releases a nova of 8 tears. Panic, weaponized.", pools: ["special"], apply(p) { p.flags.hurtNova = true; } },
  webmd:     { name: "WebMD Search History", quote: "It's always cancer, or a spider bite.", desc: "See enemy health bars. +15% damage to full-health enemies (early detection).", pools: ["special", "shop"], apply(p) { p.flags.hpBars = true; } },
  oils:      { name: "Essential Oils", quote: "+0 to all stats. You feel AMAZING.", desc: "Does nothing. (Secretly +1 luck, but if you tell anyone it stops working.)", pools: ["special", "shop"], apply(p) { p.luck += 1; } },
  crystals:  { name: "Healing Crystals", quote: "The vibes are load-bearing.", desc: "A random small stat up every floor. The crystals decide. Do not question the crystals.", pools: ["special", "shop"], apply(p) { p.flags.crystals = true; } },
  bluelight: { name: "Blue Light Glasses", quote: "Now you can doomscroll FOREVER.", desc: "+30% range. See further into the abyss.", pools: ["special", "shop"], apply(p) { p.range *= 1.3; } },
  detox:     { name: "Dopamine Detox", quote: "No fun allowed. Massive gains.", desc: "Fire rate down 25%, damage up 80%. Boredom is a weapon now.", pools: ["special", "oon"], apply(p) { p.tearDelay *= 1.33; p.dmg *= 1.8; } },
  juice:     { name: "FOCUS JUICE™", quote: "Legally distinct from every energy drink.", desc: "+speed, +fire rate, -half heart. Your heart says stop. Ignore it. That's the juice talking.", pools: ["special", "shop"], apply(p) { p.spd *= 1.12; p.tearDelay *= 0.88; p.hp = Math.max(1, p.hp - 1); } },
  inscard:   { name: "Gold-Tier Insurance Card", quote: "Congratulations on your premiums.", desc: "Everything at the Pharmacy is 50% off. The card is heavier than it should be.", pools: ["special", "shop"], apply(p) { p.flags.discount = true; } },
  refchain:  { name: "Referral Chain", quote: "See a guy who knows a guy.", desc: "+2 Referrals, and Specialist offices offer a CHOICE of two items.", pools: ["special"], apply(p) { p.keys += 2; p.flags.twoChoice = true; } },
  hyperfix:  { name: "Hyperfixation", quote: "It's all you can think about. Perfect.", desc: "The first enemy type you kill in each room takes +50% damage from you in that room.", pools: ["special"], apply(p) { p.flags.hyperfix = true; } },
  pillow:    { name: "The Good Pillow", quote: "The cold side. Always.", desc: "Heal a full heart at the start of every floor. Sleep is medicine, who knew. (Everyone. Everyone knew.)", pools: ["special", "shop"], apply(p) { p.flags.pillowHeal = true; } },
  papertrail:{ name: "Paper Trail", quote: "Document EVERYTHING.", desc: "Paperwork piles always drop something when destroyed.", pools: ["special"], apply(p) { p.flags.paperTrail = true; } },
  grouptherapy:{ name: "Group Therapy", quote: "Have you considered… joining us?", desc: "Your tears sometimes RECRUIT an enemy to the group — they fight for you until they burn out.", pools: ["special", "boss"], apply(p) { p.flags.charm = true; } },
  blanket:   { name: "Weighted Blanket", quote: "14 pounds of 'no thanks'.", desc: "+2 hearts, -10% speed. You are safe. You are also slow.", pools: ["special", "shop"], apply(p) { p.maxhp += 4; p.hp += 4; p.spd *= 0.9; } },

  /* --- boss drops (Dosage line) --- */
  dosage:    { name: "Dosage Increase", quote: "Let's try doubling it.", desc: "+0.8 damage.", pools: ["boss"], apply(p) { p.dmg += 0.8; } },
  refill:    { name: "The Refill", quote: "No questions asked. None. Zero.", desc: "+1 heart container, fully healed.", pools: ["boss"], apply(p) { p.maxhp += 2; p.hp = p.maxhp; } },
  delivery:  { name: "Express Delivery", quote: "Your relief ships FAST.", desc: "+20% shot speed.", pools: ["boss"], apply(p) { p.shotSpd *= 1.2; } },
  extended:  { name: "Extended Release", quote: "It just keeps going.", desc: "+25% range.", pools: ["boss"], apply(p) { p.range *= 1.25; } },
  twice:     { name: "Take Twice Daily", quote: "Or hourly. Live your life.", desc: "+18% fire rate.", pools: ["boss"], apply(p) { p.tearDelay *= 0.82; } },

  /* --- out-of-network exclusive --- */
  offlabel:  { name: "Off-Label Use", quote: "It's not approved for this. It's not approved for anything.", desc: "+1.5 damage, +10% speed. We're in uncharted waters, baby.", pools: ["oon"], apply(p) { p.dmg += 1.5; p.spd *= 1.1; } },

  /* --- unlockable rewards (only enter the pools once their achievement is earned) --- */
  placebonus:   { name: "Placebo Effect", quote: "It works because you believe. Don't tell anyone.", desc: "Pills can NEVER overprescribe you, and each gives +5% luck.", pools: ["special"], unlock: "ward6", apply(p) { p.flags.noOverRx = true; } },
  secondopinion:{ name: "Second Opinion", quote: "A DIFFERENT doctor. Groundbreaking.", desc: "+1.5 damage and +1 heart. Clarity, at last.", pools: ["special", "shop"], unlock: "ward10", apply(p) { p.dmg += 1.5; p.maxhp += 2; p.hp += 2; } },
  malpractice:  { name: "Malpractice Settlement", quote: "You win. Here is a bag of money and raw power.", desc: "+35% damage, +1 heart, +1 luck. Richly deserved.", pools: ["special"], unlock: "walrus3", apply(p) { p.dmg *= 1.35; p.maxhp += 2; p.hp += 2; p.luck += 1; } }
};

DATA.POOLS = { special: [], boss: [], shop: [], oon: [] };
for (const id in DATA.ITEMS) for (const pl of DATA.ITEMS[id].pools) DATA.POOLS[pl].push(id);

/* an item is locked until its unlock-achievement is earned */
DATA.itemLocked = function (id) {
  const it = DATA.ITEMS[id];
  if (!it || !it.unlock) return false;
  return !(Meta.data.unlocks && Meta.data.unlocks[it.unlock]);
};
/* pool ids that are unlocked and (optionally) not already owned */
DATA.pickPool = function (name, owned) {
  return DATA.POOLS[name].filter(id => !DATA.itemLocked(id) && !(owned && owned.indexOf(id) >= 0));
};

/* ============ ACHIEVEMENTS / UNLOCKS ============ */
DATA.ACHIEVEMENTS = [
  { id: 'intake',   name: "Intake Complete",       desc: "Finish your first checkup and run.",           hint: "Play a run.",                              check: m => m.runs >= 1 },
  { id: 'ward3',    name: "Referred Out",          desc: "Reach Ward 3.",                                 hint: "Descend to Ward 3.",                       check: m => m.bestFloor >= 3 },
  { id: 'ward6',    name: "Non-Compliant",         desc: "Reach Ward 6. Unlocks the Placebo Effect.",     hint: "Descend to Ward 6.",                       check: m => m.bestFloor >= 6, reward: "Placebo Effect" },
  { id: 'ward10',   name: "The Meds Aren't Working", desc: "Reach Ward 10. Unlocks the Second Opinion.",  hint: "Descend to Ward 10.",                      check: m => m.bestFloor >= 10, reward: "Second Opinion" },
  { id: 'ward15',   name: "Treatment-Resistant",   desc: "Reach Ward 15.",                                hint: "Descend to Ward 15.",                      check: m => m.bestFloor >= 15 },
  { id: 'ward22',   name: "No Known Cure",         desc: "Reach Ward 22.",                                hint: "Descend to Ward 22.",                      check: m => m.bestFloor >= 22 },
  { id: 'walrus1',  name: "Second Opinion, Denied", desc: "Defeat Dr. Walrus. Unlocks Perfectly Fine.",   hint: "Survive to Ward 5 and win.",               check: m => (m.walrusKills || 0) >= 1 },
  { id: 'walrus3',  name: "Malpractice Suit",      desc: "Defeat Dr. Walrus 3 times. Unlocks the Settlement.", hint: "Beat Dr. Walrus, repeatedly.",        check: m => (m.walrusKills || 0) >= 3, reward: "Malpractice Settlement" },
  { id: 'allDiag',  name: "Hypochondriac",         desc: "Play all eight diagnoses.",                     hint: "Get diagnosed with everything.",           check: m => Object.keys(m.diagsPlayed || {}).length >= 8 },
  { id: 'kills500', name: "Symptom Management",     desc: "Defeat 500 enemies (all runs).",                hint: "Keep managing symptoms.",                  check: m => (m.kills || 0) >= 500 },
  { id: 'overRx',   name: "Overprescribed",        desc: "Get overprescribed — 4 pills on one floor.",    hint: "Take a LOT of pills at once.",             check: m => !!m.everOverRx },
  { id: 'nohit',    name: "Clean Bill of Health",  desc: "Clear a whole floor without taking a hit.",     hint: "Survive a floor untouched.",               check: m => !!m.everNoHitFloor },
  { id: 'denial',   name: "Peak Denial",           desc: "Reach Ward 5 as Perfectly Fine.",               hint: "Insist nothing is wrong. Deeply.",         check: m => ((m.diagBest || {}).fine || 0) >= 5 },
  { id: 'cured',    name: "The Cure (Allegedly)",  desc: "Defeat THE CURE at Ward 25. Unlocks Chronic Mode.", hint: "Descend all the way to Ward 25 and win.", check: m => !!m.cured, reward: "Chronic Mode (New Game+)" }
];
DATA.checkAchievements = function (m) {
  if (!m.unlocks) m.unlocks = {};
  const fresh = [];
  for (const a of DATA.ACHIEVEMENTS) if (!m.unlocks[a.id] && a.check(m)) { m.unlocks[a.id] = 1; fresh.push(a); }
  return fresh;
};

/* ============ PILLS ============ */
DATA.PILL_COLORS = ['#e05a5a', '#5a9de0', '#8fd05a', '#e0c95a', '#b06be0', '#e08f5a', '#5ad0c8', '#e06bb0', '#a0a0a0', '#f0f0e8'];
DATA.PILLS = [
  { id: 'feelbetter', name: "Feel Better", msg: "You feel better!", bad: false, apply(p) { p.hp = Math.min(p.maxhp, p.hp + 4); SFX.play('heal'); } },
  { id: 'newscript', name: "New Prescription", msg: "+1 heart container!", bad: false, apply(p) { p.maxhp += 2; p.hp += 2; SFX.play('heal'); } },
  { id: 'gogo', name: "Go-Go Juice", msg: "Speed up!", bad: false, apply(p) { p.spd *= 1.12; } },
  { id: 'drowsy', name: "May Cause Drowsiness", msg: "So... sleepy...", bad: true, apply(p) { p.tempSlow = 12; } },
  { id: 'fastact', name: "Fast Acting", msg: "Fire rate up!", bad: false, apply(p) { p.tearDelay *= 0.9; } },
  { id: 'buffer', name: "Extended Buffering", msg: "Fire rate down...", bad: true, apply(p) { p.tearDelay *= 1.12; } },
  { id: 'maxstr', name: "Maximum Strength", msg: "Damage up!", bad: false, apply(p) { p.dmg += 0.6; } },
  { id: 'watered', name: "Watered Down", msg: "Damage down...", bad: true, apply(p) { p.dmg = Math.max(1, p.dmg - 0.5); } },
  { id: 'clarity', name: "Sudden Clarity", msg: "The floor plan... you can SEE it.", bad: false, apply(p, G) { if (G && G.floorRooms) G.floorRooms.forEach(r => r.discovered = true); } },
  { id: 'rebate', name: "Mail-In Rebate", msg: "+7 copays!", bad: false, apply(p) { p.coins += 7; SFX.play('coin'); } },
  { id: 'placebo', name: "Placebo", msg: "You feel a profound sense of having taken a pill.", bad: false, apply() { } },
  { id: 'euphoria', name: "Euphoria", msg: "NOTHING can hurt you (for 8 seconds).", bad: false, apply(p) { p.iframes = Math.max(p.iframes, 8); } },
  { id: 'sedative', name: "Horse Sedative", msg: "Everything else slows down. You have questions.", bad: false, apply(p, G) { if (G) G.enemySlow = 10; } },
  { id: 'goodone', name: "The Good One", msg: "Oh, that's the GOOD one.", bad: false, apply(p) { p.dmg += 0.4; p.spd *= 1.05; p.tearDelay *= 0.95; } }
];

/* ============ ENEMIES ============ */
DATA.ENEMIES = {
  scroller:  { name: "Doomscroller", hp: 10, spd: 68, r: 17, dmg: 1, beh: 'chase', clr: '#7a86b8' },
  notif:     { name: "Notification", hp: 5, spd: 150, r: 11, dmg: 1, beh: 'bounce', clr: '#e05a5a' },
  larper:    { name: "Larper", hp: 7, spd: 82, r: 14, dmg: 1, beh: 'larper', clr: '#b9b3ab', shotCd: 2.6, bulSpd: 150 },
  ad:        { name: "Pharma Ad", hp: 12, spd: 52, r: 16, dmg: 1, beh: 'shooter', clr: '#e0a03a', shotCd: 2.3, bulSpd: 185 },
  doubt:     { name: "Doubt", hp: 9, spd: 0, r: 14, dmg: 1, beh: 'mirror', clr: '#8a6be0', bulSpd: 210 },
  deadline:  { name: "Deadline", hp: 14, spd: 40, r: 17, dmg: 1, beh: 'charger', clr: '#d05a8a' },
  intrusive: { name: "Intrusive Thought", hp: 8, spd: 0, r: 13, dmg: 1, beh: 'teleport', clr: '#5ad0b8' },
  redflag:   { name: "Red Flag", hp: 7, spd: 88, r: 14, dmg: 1, beh: 'bomber', clr: '#d04040' },
  fog:       { name: "Brain Fog", hp: 30, spd: 26, r: 28, dmg: 1, beh: 'fog', clr: '#9aa8a0' },
  enabler:   { name: "The Enabler", hp: 16, spd: 62, r: 16, dmg: 1, beh: 'buffer', clr: '#e0c95a' },
  sideeffect:{ name: "Side Effect", hp: 16, spd: 54, r: 18, dmg: 1, beh: 'splitter', clr: '#d06ba0' },
  form:      { name: "Prior Auth Form", hp: 4, spd: 0, r: 16, dmg: 0, beh: 'idle', clr: '#f4eee0' }
};
DATA.enemyPoolFor = function (depth) {
  // deeper enemies get relatively more common the further past their unlock you go,
  // so late wards lean on the nastier roster instead of the same early mix
  const P = [
    { id: 'scroller', d: 1, w: 3 }, { id: 'notif', d: 1, w: 3 }, { id: 'larper', d: 1, w: 2.4 },
    { id: 'ad', d: 2, w: 2.4 }, { id: 'doubt', d: 2, w: 2 },
    { id: 'deadline', d: 3, w: 2 }, { id: 'intrusive', d: 3, w: 2 },
    { id: 'redflag', d: 4, w: 1.8 }, { id: 'fog', d: 4, w: 1.4 }, { id: 'sideeffect', d: 4, w: 1.8 },
    { id: 'enabler', d: 5, w: 1.4 }
  ].filter(e => depth >= e.d);
  for (const e of P) e.w *= 1 + 0.12 * Math.max(0, depth - e.d);
  return P;
};
DATA.pickEnemy = function (depth) {
  const P = DATA.enemyPoolFor(depth);
  let tot = 0; for (const e of P) tot += e.w;
  let x = RAND() * tot;   // RAND so seeded room population picks the same enemies
  for (const e of P) { x -= e.w; if (x <= 0) return e.id; }
  return P[P.length - 1].id;
};

/* ============ BOSSES ============ */
DATA.BOSSES = {
  gatekeeper: { name: "THE GATEKEEPER", sub: "“You don't even LOOK sick.”", hp: 165 },
  adjuster:   { name: "THE ADJUSTER", sub: "“Claim denied.”", hp: 180 },
  larperking: { name: "THE LARPER KING", sub: "“He read one (1) article.”", hp: 205 },
  withdrawal: { name: "WITHDRAWAL", sub: "“Refill unavailable. Please scream.”", hp: 210 },
  stigma:     { name: "THE STIGMA", sub: "“What will people think?”", hp: 195 },
  burnout:    { name: "BURNOUT", sub: "“Just push through it.”", hp: 215 },
  dsm:        { name: "THE MANUAL", sub: "“Everybody's in here somewhere.”", hp: 215 },
  priorauth:  { name: "PRIOR AUTHORIZATION", sub: "“Please hold.”", hp: 205 },
  algorithm:  { name: "THE ALGORITHM", sub: "“You might also like: THIS.”", hp: 215 },
  thecure:    { name: "THE CURE", sub: "“It was inside you all along. (It wasn't.)”", hp: 300 },
  founder:    { name: "THE FOUNDER", sub: "“I didn't invent the disease. I monetized the cure.”", hp: 400 },
  walrus:     { name: "DR. WALRUS, M.D.*", sub: "*mail-order", hp: 300 }
};
DATA.bossFor = function (depth, lastBoss) {
  if (depth === 25) return 'thecure';   // the (non-)finale
  if (depth === 50) return 'founder';   // the (real) superboss, for those who keep climbing
  if (depth % 5 === 0) return 'walrus';
  let pool = ['gatekeeper', 'larperking'];
  if (depth >= 2) pool.push('adjuster', 'priorauth');
  if (depth >= 3) pool.push('stigma', 'dsm', 'algorithm');
  if (depth >= 4) pool.push('withdrawal', 'burnout');
  const filtered = pool.filter(b => b !== lastBoss);
  return U.choice(filtered.length ? filtered : pool);
};

/* ============ PATIENT CHART (codex) flavor ============
   Satirical clinical notes — aimed at the over-labeling machine, not people. */
DATA.CODEX_CHART = {
  enemies: {
    scroller: "Chronically online. Prognosis: one more scroll.",
    notif: "Demands your attention. Refuses to be marked as read.",
    larper: "Read one (1) article. Now an expert. Sincerity: guarded.",
    ad: "Ask your doctor if being a walking commercial is right for you.",
    doubt: "Are you SURE it's real? It isn't sure either.",
    deadline: "Was due yesterday. Charges without warning.",
    intrusive: "Arrives uninvited. Means nothing by it, allegedly.",
    redflag: "Everyone saw it coming except you. Detonates on contact.",
    fog: "Where were we? Slows everything, thoughts included.",
    enabler: "Insists everyone is SO valid. Heals its friends to prove it.",
    sideeffect: "May cause: more of itself. Multiplies when disturbed.",
    form: "Please complete all fields. Then, if approved, complete them again."
  },
  bosses: {
    gatekeeper: "Guards the diagnosis you already have. You don't LOOK sick enough.",
    adjuster: "Reviews your suffering for billing errors. Finds them.",
    larperking: "Wears every diagnosis at once. Owns the group chat.",
    withdrawal: "The refill that never comes. Shakes the whole room.",
    stigma: "The look you get. Fights best in the dark, where no one sees.",
    burnout: "A candle lit at both ends and handed a third end.",
    dsm: "The book that has a name for you. All of them, actually.",
    priorauth: "Your treatment is denied pending paperwork. Fill the forms to be seen.",
    algorithm: "Learns how you move and serves you more of it. Engagement is the only cure it knows.",
    thecure: "What everyone's chasing. Turns out it was the friends we diagnosed along the way.",
    founder: "The man who turned every feeling into a market. Waits at the very top of the ladder — Ward 50.",
    walrus: "Board-certified in Confidence. The doctor will see you now. Forever."
  }
};

/* ============ COMORBIDITIES (between-floor modifier cards) ============
   A satirical 'second symptom' you pick up descending. Mild risk/reward. */
DATA.COMORBIDITIES = [
  { id: 'racing',   name: "Racing Thoughts",       desc: "+18% fire rate, but your aim gets jittery.",           apply(p) { p.tearDelay *= 0.82; p.wobble += 0.06; } },
  { id: 'hyperfix', name: "Hyperfixation Spiral",  desc: "+30% damage, −12% range. Tunnel vision, weaponized.",  apply(p) { p.dmg *= 1.3; p.range *= 0.88; } },
  { id: 'rumination', name: "Rumination",          desc: "Tears gently home in, −12% damage. You can't let go.", apply(p) { p.dmg *= 0.88; p.flags.homingTears = true; } },
  { id: 'paralysis', name: "Analysis Paralysis",   desc: "Enemies −12% speed, you −8% speed. Everyone overthinks.", apply(p) { p.spd *= 0.92; p.flags.slowField = true; } },
  { id: 'sensory',  name: "Sensory Overload",      desc: "+1 heart, but enemy bullets fly 10% faster.",         apply(p) { p.maxhp += 2; p.hp += 2; p.flags.fastBullets = true; } },
  { id: 'executive', name: "Executive Dysfunction", desc: "Start each floor with a free pill, −6% speed.",       apply(p) { p.spd *= 0.94; p.flags.floorPill = true; } },
  { id: 'catastro', name: "Catastrophizing",       desc: "See enemy health; +15% damage to full-health foes.",   apply(p) { p.flags.hpBars = true; } },
  { id: 'rsd',      name: "Rejection Sensitivity", desc: "+22% damage while at full health. Prove them wrong.",  apply(p) { p.flags.rsd = true; } },
  { id: 'insomnia', name: "Insomnia",              desc: "+15% speed & fire rate. You will pay for this later.", apply(p) { p.spd *= 1.15; p.tearDelay *= 0.85; } },
  { id: 'oversharing', name: "Oversharing",        desc: "Taking a hit drops copays everywhere. Trauma dumping.", apply(p) { p.flags.hurtCoins = true; } }
];
/* Comorbidity synergies: hold both halves and the chart fuses them into a named
   condition with a bonus. Checked whenever a new comorbidity is acquired. */
DATA.COMORBID_SYNERGY = [
  { need: ['racing', 'insomnia'], name: "Manic Episode", note: "+ speed & a burst of fire rate", apply(p) { p.spd *= 1.12; p.tearDelay *= 0.85; } },
  { need: ['hyperfix', 'catastro'], name: "Obsessive Focus", note: "+ big damage vs full-health foes", apply(p) { p.dmg *= 1.2; } },
  { need: ['rumination', 'rsd'], name: "Spiral", note: "+ homing damage restored and then some", apply(p) { p.dmg *= 1.25; } },
  { need: ['paralysis', 'executive'], name: "Shutdown", note: "+ 1 heart for slowing to cope", apply(p) { p.maxhp += 2; p.hp += 2; } },
  { need: ['sensory', 'oversharing'], name: "Meltdown", note: "+ a grounding nova when hit", apply(p) { p.flags.hurtNova = true; } }
];

/* ============ SIGNATURE ('PRN') ABILITIES ============
   One chargeable active per diagnosis. cd = cooldown seconds; the effect itself
   lives in Player.useAbility(). Names/blurbs also show on the diagnosis card. */
DATA.ABILITIES = {
  adhd:       { name: "Blink", cd: 5, blurb: "Dash a short burst — briefly untouchable." },
  bipolar:    { name: "Mood Swing", cd: 12, blurb: "Force a fresh MANIA high on demand." },
  depression: { name: "Under The Covers", cd: 10, blurb: "Cocoon up: invincible but slowed, a moment's rest." },
  anxiety:    { name: "Panic", cd: 9, blurb: "A nova that wipes nearby bullets and shoves enemies back." },
  schizo:     { name: "Reality Check", cd: 10, blurb: "Pop every hallucination in the room and see through the rest." },
  ocd:        { name: "Recheck", cd: 9, blurb: "Check once more: wipe nearby bullets, reset the compulsion, lock in FOCUS." },
  ptsd:       { name: "5-4-3-2-1", cd: 10, blurb: "Ground yourself: wipe nearby danger, slow the room to a crawl, and come back to now." },
  fine:       { name: "Denial", cd: 11, blurb: "\"I'm FINE.\" Briefly refuse to take damage." }
};

/* ============ PRESCRIPTION TRANSFORMATIONS ============
   Collect 3 items sharing a theme → transform, Isaac-style. */
DATA.ITEM_THEMES = {
  coping: ['dog', 'plush', 'journal', 'gym', 'coldshower', 'grounding', 'pillow', 'crystals', 'oils', 'blanket'],
  stimulant: ['brand', 'generic', 'amps', 'juice', 'detox'],
  pharma: ['ssri', 'lithium', 'beta', 'antipsy', 'melatonin', 'sideeffects', 'offlabel']
};
DATA.TRANSFORMS = [
  { theme: 'coping', need: 3, name: "In Therapy", tint: '#8fd05a', apply(p) { p.maxhp += 4; p.hp += 4; p.dmg += 0.5; } },
  { theme: 'stimulant', need: 3, name: "Tweaking", tint: '#f7b32b', apply(p) { p.spd *= 1.12; p.tearDelay *= 0.85; } },
  { theme: 'pharma', need: 3, name: "Fully Medicated", tint: '#b86bff', apply(p) { p.dmg += 1.5; p.maxhp += 2; p.hp += 2; } }
];

/* ============ BRANCHING WARDS (treatment plans) ============
   Each descent offers a choice of ward; the path tunes the next floor. */
DATA.WARD_PATHS = {
  inpatient: { name: "🏥 Inpatient", desc: "Tougher ward — but the loot's worth it.", hpMul: 1.28, countAdd: 1, bonusLoot: true },
  outpatient: { name: "🏃 Outpatient", desc: "Lighter ward — cheaper meds, calmer halls.", hpMul: 0.8, countAdd: -1, shopDiscount: true },
  day: { name: "☀️ Day Program", desc: "A normal ward. No surprises. Allegedly.", hpMul: 1, countAdd: 0 }
};

/* ============ THE DAY ROOM (sanctuary) — other patients, a water cooler, a breather ============
   Each NPC gives a one-time boon + a satirical line when you walk up to them. */
DATA.DAYROOM = [
  { name: "The Veteran",    line: "Been here since Ward 1. You get used to the hum.", note: "+1 heart",        apply(p) { p.maxhp += 2; p.hp += 2; } },
  { name: "The Optimist",   line: "Rock bottom's got great acoustics, hun.",           note: "+0.5 damage",     apply(p) { p.dmg += 0.5; } },
  { name: "The Oversharer", line: "So my THIRD therapist said— anyway, take these.",   note: "+6 copays",       apply(p) { p.coins += 6; } },
  { name: "The Sponsor",    line: "One day at a time. Keep your hands busy.",           note: "a Fidget Spinner",apply(p) { p.familiars.push(new Familiar('spinner')); } },
  { name: "The Regular",    line: "They rotate the pills but never the posters.",       note: "+1 luck",         apply(p) { p.luck += 1; } },
  { name: "The Quiet One",  line: "…",                                                  note: "a free pill",     apply(p) { if (p.pill == null) p.pill = U.randi(0, 9); } },
  { name: "The Newcomer",   line: "First time? Don't let Dr. Walrus rush you.",         note: "heal a full heart",apply(p) { p.heal(2); } }
];

/* ============ MINI-EVENTS (non-combat choice rooms) ============ */
DATA.EVENTS = [
  {
    name: "Support Group", prompt: "A circle of folding chairs. They actually want to listen.",
    choices: [
      { label: "Share honestly", note: "heal 1 heart + a little luck", apply(p) { p.heal(2); p.luck += 1; } },
      { label: "Just listen", note: "+0.4 damage (you learned something)", apply(p) { p.dmg += 0.4; } },
      { label: "Slip out early", note: "nothing ventured", apply() { } }
    ]
  },
  {
    name: "3 A.M. Self-Diagnosis", prompt: "The search bar glows. \"my symptoms\" it waits. It's never good news.",
    choices: [
      { label: "Trust the internet", note: "gamble: a boon… or a new symptom", apply(p) { if (U.chance(0.5)) { p.dmg += 1.2; } else { p.spd *= 0.9; p.tearDelay *= 1.08; } } },
      { label: "Close the laptop", note: "sleep, actually (heal 1)", apply(p) { p.heal(1); } }
    ]
  },
  {
    name: "Wellness MLM Pitch", prompt: "\"Hey hun! This oil cures literally everything. Buy in?\"",
    choices: [
      { label: "Buy the starter kit (5¢)", note: "gamble on +luck & +damage", apply(p, G) { if (p.coins >= 5) { p.coins -= 5; if (U.chance(0.6)) { p.luck += 1; p.dmg += 0.5; } } } },
      { label: "\"I'm good, thanks\"", note: "keep your copays", apply() { } },
      { label: "Report the pyramid", note: "+3 copays (civic duty)", apply(p) { p.coins += 3; } }
    ]
  },
  {
    name: "Wellness Retreat", prompt: "Incense. A gong. A suspiciously expensive silence.",
    choices: [
      { label: "Meditate", note: "bullets near you slow this run", apply(p) { p.flags.slowBullets = true; } },
      { label: "Do the cleanse", note: "-half heart now, +0.8 damage", apply(p) { p.hp = Math.max(1, p.hp - 1); p.dmg += 0.8; } },
      { label: "Leave (it's a scam)", note: "nothing", apply() { } }
    ]
  }
];

/* ============ ROOM THEMES ============
   Each generated combat room gets a theme so it reads as a real place in the
   ward — records office, pharmacy storage, therapy room, break room, group
   circle, exam room, waiting area. Rendered as background dressing in getBG. */
DATA.ROOM_THEMES = ['records', 'pharmacy', 'therapy', 'breakroom', 'group', 'exam', 'waiting'];

/* ============ PROGNOSIS (challenge-run modifiers) ============
   Isaac-style rule-benders you pick at the title. G.prognosis holds the id;
   effects are applied at run start + gated in the loop. Tracked per-id in Meta. */
DATA.PROGNOSES = [
  { id: 'pacifist',   name: "Pacifist",      icon: "🕊", desc: "You can't shoot. Win with familiars and Claim Forms — you start with a whole support crew." },
  { id: 'glass',      name: "Glass Cannon",  icon: "💥", desc: "One heart. Triple damage. One mistake and it's over." },
  { id: 'coldturkey', name: "Cold Turkey",   icon: "🥶", desc: "No pills, ever. No pharmacy. Just you and the withdrawal." },
  { id: 'untreated',  name: "Untreated",     icon: "🚫", desc: "No items — you keep your starting Rx and nothing else. Pills only from here." },
  { id: 'rapid',      name: "Rapid Cycling", icon: "🎢", desc: "Every room re-prescribes you: a random up and a random down. Never the same twice." }
];
/* rapid-cycling: each room applies one of these (a buff paired with a cost) via G.rapidMods */
DATA.RAPID_SWINGS = [
  { name: "Manic High",    mods: { dmg: 1.4, spd: 1.2, tears: 1.15, def: 1 },   note: "+damage, +speed" },
  { name: "The Dip",       mods: { dmg: 0.8, spd: 0.85, tears: 1, def: 0.5 },   note: "slower, but half damage taken" },
  { name: "Wired",         mods: { dmg: 1, spd: 1.3, tears: 0.75, def: 1 },     note: "faster & faster-firing" },
  { name: "Sedated",       mods: { dmg: 1.6, spd: 0.7, tears: 1.3, def: 1 },    note: "heavy hits, heavy feet" },
  { name: "Dissociating",  mods: { dmg: 1.1, spd: 1.1, tears: 1, def: 0.6 },    note: "harder to pin down" },
  { name: "Overprescribed",mods: { dmg: 1.5, spd: 1.15, tears: 0.85, def: 1.4 },note: "everything at once" }
];

/* ============ WARD SIDE-EFFECTS (floor-wide "curses") ============
   A satirical whole-floor modifier rolled at some descents. Read by game logic
   via G.sideEffect (the id); shown as a banner at the start of the ward. */
DATA.SIDE_EFFECTS = [
  { id: 'brainfog',       name: "Brain Fog",      icon: "🌫", desc: "The minimap's gone. Where were we, again?" },
  { id: 'restless',       name: "Restlessness",   icon: "⚡", desc: "Akathisia — everything on this ward moves faster." },
  { id: 'hypervigilance', name: "Hypervigilance", icon: "👁", desc: "You can't relax. Enemy shots fly sharper here." },
  { id: 'rumination',     name: "Rumination",     icon: "🔁", desc: "You keep coming back to it — each room's threat returns once." }
];

/* ============ ENDLESS DIFFICULTY CURVE ============
   One place that scales every threat axis with depth. Early wards (1-5)
   match the tuned baseline; growth is mostly linear with a gentle
   quadratic so it keeps pace with an item-stacked player forever. */
DATA.difficulty = function (depth) {
  const d = depth - 1;
  return {
    enemyHp: 1 + 0.30 * d + 0.005 * d * d,             // spongier, uncapped
    enemySpd: 1 + Math.min(0.55, 0.02 * d),            // soft cap ~+55%
    enemyDmg: 1 + Math.floor(depth / 13),              // hits get heavier past ward 13, 25...
    shotRate: Math.max(0.5, 1 - 0.018 * d),            // shooters fire faster deep (x on cooldown)
    count: U.clamp(3 + Math.floor(0.8 * depth), 3, 12),// more bodies per room, cap 12
    champChance: U.clamp(0.05 * (depth - 5), 0, 0.55), // elites from ward 6, up to 55%
    bossHp: 1 + 0.20 * d + 0.004 * d * d,
    bossDmg: 1 + Math.floor(depth / 9),                // boss hits heavier past ward 9, 18...
    bossAggr: 1 + Math.min(0.6, 0.022 * d)             // bosses move & attack faster deep
  };
};

/* Elite / "Champion" enemy variants — tougher, tinted, better loot. */
DATA.ELITES = [
  { id: 'chief',  name: "Chief Complaint", tint: '#e0b040', hp: 2.4, dmg: 1, spd: 1.05, sz: 1.18 },
  { id: 'acute',  name: "Acute Case",      tint: '#e05a5a', hp: 1.8, dmg: 2, spd: 1.15, sz: 1.1 },
  { id: 'chronic',name: "Chronic Case",    tint: '#8a6be0', hp: 3.2, dmg: 1, spd: 0.9,  sz: 1.25 }
];

/* Randomized ward "Complications" (Isaac-style curses) rolled on deeper floors. */
DATA.COMPLICATIONS = [
  { id: 'overcrowded', name: "Overcrowded Ward", desc: "+50% patients per room.", mods: { countMul: 1.5 } },
  { id: 'manic',       name: "Manic Ward",       desc: "Everything moves faster.", mods: { spdMul: 1.28 } },
  { id: 'triggerhappy',name: "Trigger-Happy Ward", desc: "Enemies fire far more often.", mods: { shotMul: 0.55 } },
  { id: 'elite',       name: "VIP Ward",         desc: "Champions everywhere.", mods: { champAdd: 0.45 } },
  { id: 'dim',         name: "Lights-Out Ward",  desc: "Someone cut the power.", mods: { dark: 0.62 } },
  { id: 'swarm',       name: "Swarm Ward",       desc: "More enemies, but frailer.", mods: { countMul: 1.6, hpMul: 0.65 } },
  { id: 'juiced',      name: "Juiced Ward",      desc: "Tougher, angrier patients.", mods: { hpMul: 1.35, dmgAdd: 1 } },
  { id: 'sudden',      name: "Sudden-Onset Ward", desc: "No spawn warning.", mods: { fastSpawn: true, spdMul: 1.12 } }
];
DATA.rollComplications = function (depth) {
  if (depth < 4) return [];
  const n = depth < 8 ? (U.chance(0.55) ? 1 : 0) : depth < 14 ? U.randi(1, 2) : U.randi(1, 3);
  return U.shuffle(DATA.COMPLICATIONS).slice(0, n);
};

/* Flavor tier shown as you go deeper — the "meds" narrative of escalation. */
DATA.TIERS = [
  { d: 1, name: "Intake" },
  { d: 4, name: "Under Observation" },
  { d: 8, name: "The Meds Aren't Working" },
  { d: 12, name: "Treatment-Resistant" },
  { d: 16, name: "Off The Charts" },
  { d: 22, name: "No Known Cure" },
  { d: 30, name: "Medically Inadvisable" },
  { d: 40, name: "Purely Theoretical" }
];
DATA.tierName = function (depth) {
  let t = DATA.TIERS[0];
  for (const x of DATA.TIERS) if (depth >= x.d) t = x;
  return t.name;
};

/* ============ ROOM TEMPLATES (13 x 7) ============ */
/* '.' empty  '#' rock  'P' paperwork  '^' spikes */
DATA.TEMPLATES = [
  [
    ".............",
    ".............",
    ".............",
    ".............",
    ".............",
    ".............",
    "............."
  ],
  [
    ".............",
    "..#.......#..",
    ".............",
    ".............",
    ".............",
    "..#.......#..",
    "............."
  ],
  [
    ".............",
    ".............",
    "....#...#....",
    ".....P.P.....",
    "....#...#....",
    ".............",
    "............."
  ],
  [
    ".............",
    ".....#.#.....",
    "..#.......#..",
    ".............",
    "..#.......#..",
    ".....#.#.....",
    "............."
  ],
  [
    ".............",
    "..P.......P..",
    "....#####....",
    ".............",
    "....#####....",
    "..P.......P..",
    "............."
  ],
  [
    ".............",
    ".............",
    "..###....##..",
    ".............",
    "..##....###..",
    ".............",
    "............."
  ],
  [
    ".............",
    "..^.......^..",
    ".............",
    "....P###P....",
    ".............",
    "..^.......^..",
    "............."
  ],
  [
    ".............",
    ".#..#...#..#.",
    ".............",
    ".#....P....#.",
    ".............",
    ".#..#...#..#.",
    "............."
  ],
  [
    ".............",
    ".............",
    "..#########..",
    ".............",
    "..#########..",
    ".............",
    "............."
  ],
  [
    ".............",
    "......#......",
    "....#...#....",
    "..#...^...#..",
    "....#...#....",
    "......#......",
    "............."
  ],
  [
    ".............",
    "..PP.....PP..",
    "..P.......P..",
    ".............",
    "..P.......P..",
    "..PP.....PP..",
    "............."
  ],
  [
    ".............",
    ".............",
    "..#..P.P..#..",
    "......^......",
    "..#..P.P..#..",
    ".............",
    "............."
  ],
  [
    ".............",
    ".....#..#....",
    "..P........#.",
    ".#....##.....",
    "....#......P.",
    "..#....#.....",
    "............."
  ],
  [
    ".............",
    "..#.#...#.#..",
    "..P.......P..",
    ".............",
    "..P.......P..",
    "..#.#...#.#..",
    "............."
  ]
];

/* ============ FLOOR NAMES ============ */
DATA.FLOOR_BASE = ["The Waiting Room", "The General Ward", "The Pharmacy Wing", "The Psych Ward", "Administration"];
DATA.floorName = function (depth) {
  const idx = (depth - 1) % 5, cyc = Math.floor((depth - 1) / 5) + 1;
  return DATA.FLOOR_BASE[idx] + (cyc > 1 ? " " + U.roman(cyc) : "");
};
DATA.FLOOR_PALETTES = [
  { floor: '#414a3c', line: '#333c2f', wall: '#4a5340', trim: '#20271a' },   // waiting room — grimy olive linoleum
  { floor: '#4a3f31', line: '#3a3024', wall: '#544733', trim: '#251d12' },   // ward — dark stained tan
  { floor: '#38434c', line: '#2c363f', wall: '#40505e', trim: '#182027' },   // pharmacy — clinical blue-grey
  { floor: '#433a4a', line: '#342d3c', wall: '#4d4258', trim: '#1f1826' },   // psych — murky padded purple
  { floor: '#48412e', line: '#393322', wall: '#544a30', trim: '#221d10' }    // admin — dark sepia manila
];

/* ============ FLAVOR TEXT ============ */
DATA.DEATH_LINES = [
  "Cause of death: pre-existing condition.",
  "Your insurance has denied this death. Please die in-network.",
  "Have you tried yoga?",
  "I'm prescribing another run. Take twice daily.",
  "The good news: your symptoms are gone.",
  "I'm upgrading you to two conditions.",
  "Death is extremely common. Everybody's got somethin.",
  "We'll bill this as an out-of-network experience.",
  "This is why we don't skip our meds. Or was it why we do? One of those.",
  "Your chart says you'll bounce back. Your chart is a napkin."
];
DATA.VOICE_LINES = [
  "the voice says: not all of them are real.",
  "the voice says: the twitchy one is lying.",
  "the voice thinks you should stand still more.",
  "the voice likes the walrus. suspicious.",
  "the voice says: shoot the paperwork. trust.",
  "the voice is proud of you. no reason.",
  "the voice says: the fake ones pop like bubbles."
];
DATA.WALRUS_BOSS_LINES = [
  "Ah, my favorite patient. Time for your co-pay.",
  "I'm afraid your condition is... terminal-ish.",
  "This hurts me more than— no, wait. It hurts you more."
];
DATA.WALRUS_DEFEAT_LINES = [
  "Fascinating. Let's DOUBLE the dose.",
  "Interesting resistance. I'm noting 'non-compliant'.",
  "You've unlocked... a deeper ward. That's not good news."
];
DATA.TOASTS = {
  larper: "The Larper dropped nothing. It was never real.",
  overrx: "OVERPRESCRIBED! Random side effect!",
  referral: "You need a REFERRAL for the Specialist. (Find a key.)",
  oon: "The Out-of-Network Specialist accepts one payment: a piece of you.",
  secret: "A hidden room! It smells like unfiled complaints.",
  blanket: "The Blanket absorbed the hit.",
  oonPoor: "Not enough hearts to pay out-of-pocket."
};
