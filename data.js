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
      { t: "I keep a spreadsheet of my worries", w: { anxiety: 3 }, quip: "Organized dread. I respect it clinically." },
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
      { t: "With one eye open", w: { anxiety: 2, schizo: 1 }, quip: "Vigilance! The eyelids of the anxious." },
      { t: "At night, like a person", w: { fine: 2 }, quip: "'Like a person.' Rehearsed. Noted." }
    ]
  },
  {
    q: "Describe your desk.",
    a: [
      { t: "Organized chaos. I know where everything is.", w: { adhd: 2 }, quip: "You do not, and that's okay. Clinically." },
      { t: "Sterile. Labeled. Alphabetized.", w: { anxiety: 2 }, quip: "The label maker is a cry for help I can bill." },
      { t: "What desk?", w: { depression: 1, adhd: 1 }, quip: "The floor is a desk with commitment issues." },
      { t: "I reorganize it at 3 a.m. sometimes", w: { bipolar: 2 }, quip: "Ah, the 3 a.m. Feng Shui Event. Say no more." }
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
  blanket:   { name: "Weighted Blanket", quote: "14 pounds of 'no thanks'.", desc: "+2 hearts, -10% speed. You are safe. You are also slow.", pools: ["special", "shop"], apply(p) { p.maxhp += 4; p.hp += 4; p.spd *= 0.9; } },

  /* --- boss drops (Dosage line) --- */
  dosage:    { name: "Dosage Increase", quote: "Let's try doubling it.", desc: "+0.8 damage.", pools: ["boss"], apply(p) { p.dmg += 0.8; } },
  refill:    { name: "The Refill", quote: "No questions asked. None. Zero.", desc: "+1 heart container, fully healed.", pools: ["boss"], apply(p) { p.maxhp += 2; p.hp = p.maxhp; } },
  delivery:  { name: "Express Delivery", quote: "Your relief ships FAST.", desc: "+20% shot speed.", pools: ["boss"], apply(p) { p.shotSpd *= 1.2; } },
  extended:  { name: "Extended Release", quote: "It just keeps going.", desc: "+25% range.", pools: ["boss"], apply(p) { p.range *= 1.25; } },
  twice:     { name: "Take Twice Daily", quote: "Or hourly. Live your life.", desc: "+18% fire rate.", pools: ["boss"], apply(p) { p.tearDelay *= 0.82; } },

  /* --- out-of-network exclusive --- */
  offlabel:  { name: "Off-Label Use", quote: "It's not approved for this. It's not approved for anything.", desc: "+1.5 damage, +10% speed. We're in uncharted waters, baby.", pools: ["oon"], apply(p) { p.dmg += 1.5; p.spd *= 1.1; } }
};

DATA.POOLS = { special: [], boss: [], shop: [], oon: [] };
for (const id in DATA.ITEMS) for (const pl of DATA.ITEMS[id].pools) DATA.POOLS[pl].push(id);

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
  enabler:   { name: "The Enabler", hp: 16, spd: 62, r: 16, dmg: 1, beh: 'buffer', clr: '#e0c95a' }
};
DATA.enemyPoolFor = function (depth) {
  const P = [
    { id: 'scroller', d: 1, w: 3 }, { id: 'notif', d: 1, w: 3 }, { id: 'larper', d: 1, w: 2.4 },
    { id: 'ad', d: 2, w: 2.4 }, { id: 'doubt', d: 2, w: 2 },
    { id: 'deadline', d: 3, w: 2 }, { id: 'intrusive', d: 3, w: 2 },
    { id: 'redflag', d: 4, w: 1.8 }, { id: 'fog', d: 4, w: 1.4 },
    { id: 'enabler', d: 5, w: 1.4 }
  ].filter(e => depth >= e.d);
  return P;
};
DATA.pickEnemy = function (depth) {
  const P = DATA.enemyPoolFor(depth);
  let tot = 0; for (const e of P) tot += e.w;
  let x = Math.random() * tot;
  for (const e of P) { x -= e.w; if (x <= 0) return e.id; }
  return P[P.length - 1].id;
};

/* ============ BOSSES ============ */
DATA.BOSSES = {
  gatekeeper: { name: "THE GATEKEEPER", sub: "“You don't even LOOK sick.”", hp: 190 },
  adjuster:   { name: "THE ADJUSTER", sub: "“Claim denied.”", hp: 180 },
  larperking: { name: "THE LARPER KING", sub: "“He read one (1) article.”", hp: 205 },
  withdrawal: { name: "WITHDRAWAL", sub: "“Refill unavailable. Please scream.”", hp: 225 },
  stigma:     { name: "THE STIGMA", sub: "“What will people think?”", hp: 195 },
  burnout:    { name: "BURNOUT", sub: "“Just push through it.”", hp: 240 },
  walrus:     { name: "DR. WALRUS, M.D.*", sub: "*mail-order", hp: 300 }
};
DATA.bossFor = function (depth, lastBoss) {
  if (depth % 5 === 0) return 'walrus';
  let pool = ['gatekeeper', 'larperking'];
  if (depth >= 2) pool.push('adjuster');
  if (depth >= 3) pool.push('stigma');
  if (depth >= 4) pool.push('withdrawal', 'burnout');
  const filtered = pool.filter(b => b !== lastBoss);
  return U.choice(filtered.length ? filtered : pool);
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
