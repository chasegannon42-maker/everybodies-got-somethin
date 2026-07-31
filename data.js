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
    q: "How many browser tabs are open right now?",
    a: [
      { t: "Four. A reasonable four.", w: { fine: 2 }, quip: "Nobody has four. I'll put down denial for now." },
      { t: "Ninety. They're all important.", w: { adhd: 3 }, quip: "Important to WHOM." },
      { t: "One. I finish things.", w: { ocd: 2 }, quip: "Interesting. I'm circling the word 'finish.'" },
      { t: "I don't know and it's stressing me out.", w: { anxiety: 2 }, quip: "The tabs know. The tabs always know." }
    ]
  },
  {
    q: "A stranger says 'how are you?' What happens?",
    a: [
      { t: "'Good!' (a lie, delivered instantly)", w: { depression: 2, fine: 1 }, quip: "That was impressively fast. Concerningly fast." },
      { t: "I tell them. Everything. For nine minutes.", w: { bipolar: 2, adhd: 1 }, quip: "And how did the stranger take it." },
      { t: "I rehearse the answer for the rest of the day.", w: { anxiety: 2, ocd: 1 }, quip: "A full rehearsal for a two-word play." },
      { t: "Was that a stranger? Are we sure?", w: { schizo: 2, ptsd: 1 }, quip: "…I'll check the cameras. That's a joke. Mostly." }
    ]
  },
  {
    q: "What's your relationship with your alarm clock?",
    a: [
      { t: "Nine alarms. All named. All ignored.", w: { depression: 2, adhd: 1 }, quip: "Named after WHAT is my question." },
      { t: "I wake before it. To beat it.", w: { anxiety: 2, ocd: 1 }, quip: "You can't beat a clock. And yet here you are." },
      { t: "Alarm? I was already up. Since Tuesday.", w: { insomnia: 3 }, quip: "Which Tuesday. Don't answer." },
      { t: "One alarm. A normal, healthy amount.", w: { fine: 2 }, quip: "One alarm. Sure. And I'm a cardiologist." }
    ]
  },
  {
    q: "You hear a noise at 3 a.m. It is:",
    a: [
      { t: "The house settling. Houses settle.", w: { fine: 2 }, quip: "Into WHAT, though." },
      { t: "Consequences.", w: { ptsd: 2, depression: 1 }, quip: "…let's circle back to that one." },
      { t: "I know exactly what it is, I'm awake anyway.", w: { insomnia: 2 }, quip: "Of course you are." },
      { t: "Something that requires me to check all the locks. Twice.", w: { ocd: 2, anxiety: 1 }, quip: "Twice is the minimum, really." }
    ]
  },
  {
    q: "Describe your energy levels this week.",
    a: [
      { t: "Monday I'm a god. The rest of the week, gravel.", w: { bipolar: 3 }, quip: "Tell me more about the Monday god thing. Actually, don't." },
      { t: "A flat, dependable low.", w: { depression: 2 }, quip: "'Dependable.' You're making it sound like a truck." },
      { t: "Fully charged at all times. What's a 'rest'?", w: { adhd: 2, insomnia: 1 }, quip: "A rest is a thing batteries do. You'd hate it." },
      { t: "Fine. Normal. Why is everyone asking?", w: { fine: 2 }, quip: "One person asked. Me. Just now." }
    ]
  },
  {
    q: "Someone rearranges your desk. You:",
    a: [
      { t: "Notice within seconds. Fix it. Say nothing. Forever.", w: { ocd: 3 }, quip: "The 'forever' is doing a lot of work." },
      { t: "Wouldn't notice. It was already chaos.", w: { adhd: 2 }, quip: "You'd call it a system. Everyone does." },
      { t: "Assume it means something. What does it mean?", w: { schizo: 2, anxiety: 1 }, quip: "It means someone touched your desk. Probably." },
      { t: "People shouldn't touch my things.", w: { ptsd: 2 }, quip: "Agreed, for the record." }
    ]
  },
  {
    q: "Pick a beverage.",
    a: [
      { t: "Coffee. Then coffee. Then a treat: coffee.", w: { insomnia: 2, adhd: 1 }, quip: "The treat one is the problem." },
      { t: "Water. Eight glasses. Logged.", w: { ocd: 2, fine: 1 }, quip: "'Logged.' I'm both impressed and alarmed." },
      { t: "Whatever's closest. Time is fake.", w: { depression: 2 }, quip: "Time is, in fact, billing in six-minute increments." },
      { t: "Something with electrolytes, in case.", w: { anxiety: 2 }, quip: "In case of WHAT is always my favorite part." }
    ]
  },
  {
    q: "Your phone battery is at 4%. How do you feel?",
    a: [
      { t: "Free.", w: { depression: 2, fine: 1 }, quip: "That's the most honest thing anyone's said in here." },
      { t: "This is an emergency. A real one.", w: { anxiety: 3 }, quip: "Mathematically, it's 4% of an emergency." },
      { t: "It's been at 4% for three days. Thrilling.", w: { adhd: 2, bipolar: 1 }, quip: "Living on the edge of a lightning bolt icon." },
      { t: "I have a charger on my person at all times.", w: { ocd: 2 }, quip: "'On my person.' You sound like a marshal." }
    ]
  },
  {
    q: "Do you ever lose focus?",
    a: [
      { t: "Sometimes, if it's boring", w: { adhd: 2 }, quip: "Interesting. I'm writing 'boring' down in pen." },
      { t: "Never. I focus on everything, at once, always.", w: { anxiety: 2, adhd: 1 }, quip: "That's not the flex you think it is." },
      { t: "Sorry — what was the question?", w: { adhd: 3 }, quip: "Textbook case. I own exactly one textbook." },
      { t: "No.", w: { fine: 2 }, quip: "Denial. Noted." }
    ]
  },
  {
    q: "How's your energy lately?",
    a: [
      { t: "Up and down. Mostly at random.", w: { bipolar: 3 }, quip: "Random, or on a SCHEDULE you can't see? Exactly." },
      { t: "Down. Just... down.", w: { depression: 2 }, quip: "Mm. Gravity of the soul. I can bill for that." },
      { t: "UP!! Right now?? VERY UP!!", w: { bipolar: 2, adhd: 1 }, quip: "Please stop vibrating my diplomas." },
      { t: "Normal amounts of energy?", w: { fine: 2 }, quip: "'Normal.' Sure. We'll circle back." }
    ]
  },
  {
    q: "Do you ever feel sad?",
    a: [
      { t: "Sundays, around 7 p.m., like clockwork", w: { depression: 2, anxiety: 1 }, quip: "The Sunday Scaries are a load-bearing symptom." },
      { t: "Only when sad things happen", w: { fine: 2 }, quip: "Sadness with a CAUSE? Suspiciously healthy." },
      { t: "Define 'feel'", w: { depression: 3 }, quip: "Oh, that's the good stuff. For the chart, I mean." },
      { t: "I contain multitudes", w: { bipolar: 2 }, quip: "Multitudes are billed separately." }
    ]
  },
  {
    q: "Do you worry about things?",
    a: [
      { t: "Only things that could conceivably happen", w: { anxiety: 3 }, quip: "So... everything. Wonderful." },
      { t: "I keep a spreadsheet of my worries", w: { anxiety: 3, ocd: 1 }, quip: "Organized dread. I respect that, clinically." },
      { t: "Should I be worried? Is this about the worrying?", w: { anxiety: 2 }, quip: "Shh. Shhhh. Yes." },
      { t: "Not really", w: { fine: 2 }, quip: "Fascinating. Troubling, too. But mostly billable." }
    ]
  },
  {
    q: "Do you ever hear a little voice in your head?",
    a: [
      { t: "Yes — it's called thinking?", w: { fine: 1, schizo: 1 }, quip: "That's what a voice WOULD say." },
      { t: "It narrates me in the third person", w: { schizo: 2 }, quip: "Is it flattering? Never mind — it's a symptom." },
      { t: "It has opinions about my choices", w: { schizo: 2, depression: 1 }, quip: "A critic! In THIS economy." },
      { t: "Which one?", w: { schizo: 3 }, quip: "...I'm going to need a bigger pad." }
    ]
  },
  {
    q: "How often do you check your phone?",
    a: [
      { t: "Define 'often'", w: { adhd: 2, anxiety: 1 }, quip: "The defensiveness is diagnostic." },
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
      { t: "4 hours, victoriously", w: { bipolar: 2, adhd: 1, insomnia: 1 }, quip: "Victory sleep. The manic classic." },
      { t: "12 hours, somehow still tired", w: { depression: 2 }, quip: "Sleep debt with interest. Very modern." },
      { t: "With one eye open", w: { anxiety: 2, schizo: 1, ptsd: 1 }, quip: "Vigilance. Bad for the eyes, great for the chart." },
      { t: "At night, like a person", w: { fine: 2 }, quip: "'Like a person.' That sounded rehearsed. Noted." }
    ]
  },
  {
    q: "Describe your desk.",
    a: [
      { t: "Organized chaos. I know where everything is.", w: { adhd: 2 }, quip: "You don't, and that's okay. Clinically." },
      { t: "Sterile. Labeled. Alphabetized.", w: { ocd: 3, anxiety: 1 }, quip: "The label maker is a cry for help I can bill." },
      { t: "What desk?", w: { depression: 1, adhd: 1 }, quip: "The floor is a desk with commitment issues." },
      { t: "I reorganize it at 3 a.m. sometimes", w: { bipolar: 2 }, quip: "Ah, the 3 a.m. Feng Shui Event. Say no more." }
    ]
  },
  {
    q: "Before you can leave the house, you...",
    a: [
      { t: "Check the stove. Then check it again. Then again.", w: { ocd: 3 }, quip: "Third time's the charm. So is the fourth." },
      { t: "Need everything symmetrical or I can't go", w: { ocd: 3 }, quip: "You're right, it SHOULD all match. Still a symptom." },
      { t: "Just leave? Like a normal person?", w: { fine: 2 }, quip: "Suspiciously breezy. Noted." },
      { t: "Leave, panic, come back, re-panic", w: { anxiety: 2, ocd: 1 }, quip: "Ah yes, the round trip. I know it well." }
    ]
  },
  {
    q: "A door slams behind you. You...",
    a: [
      { t: "Hit the floor before I've decided to", w: { ptsd: 3 }, quip: "The body keeps the score — and the receipts." },
      { t: "Am instantly, fully awake. For hours.", w: { ptsd: 2, anxiety: 1 }, quip: "Hypervigilance: unpaid overtime for the nervous system." },
      { t: "Am briefly somewhere in 2009", w: { ptsd: 3 }, quip: "Dissociation. We get a lot of frequent flyers." },
      { t: "Say 'jumpy today, huh' and move on", w: { fine: 2 }, quip: "'Jumpy.' We'll be monitoring that." }
    ]
  },
  {
    q: "It's 3 a.m. You are...",
    a: [
      { t: "Awake, doing math on how much sleep I can still get", w: { insomnia: 3 }, quip: "'If I fall asleep RIGHT now…' I hear that one a lot." },
      { t: "Just now drifting off. Alarm's in 90 minutes.", w: { insomnia: 3 }, quip: "We'll bill that as a nap." },
      { t: "Asleep. Obviously. It's 3 a.m.", w: { fine: 2 }, quip: "Must be nice. Suspiciously nice, actually." },
      { t: "Wide awake — but that's when the ideas come!", w: { insomnia: 2, bipolar: 1 }, quip: "The muse and the mania share a shift." }
    ]
  },
  {
    q: "Rate your mood right now, 1 to 10.",
    a: [
      { t: "7. No wait — 6.5. Is that bad?", w: { anxiety: 2 }, quip: "You're the first patient to answer in decimals." },
      { t: "It fluctuates as we speak", w: { bipolar: 2 }, quip: "A live mood. Exciting, dangerous, and billable." },
      { t: "3", w: { depression: 2 }, quip: "You answered promptly, though. Brave." },
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
  insomnia: {
    name: "Chronic Insomnia",
    short: "Tired & Wired",
    tag: "running on empty",
    color: "#7fd4c8",
    blurb: "You told him you hadn't slept since Tuesday. He asked which Tuesday. You couldn't say. He wrote that down, underlined, twice.",
    mech: "SLEEP DEBT: your Sleep drains as you go. Run it low and you go WIRED — +40% damage & fire rate — but the ward dims and things that aren't there start shooting at you. POWER NAP restores sleep and heals — if you can afford to stand perfectly still.",
    rx: "melatonin"
  },
  burnout: {
    name: "Burnout (Occupational)",
    short: "Running On Fumes",
    tag: "the tank is not half full",
    color: "#d09a3a",
    blurb: "You didn't come in for you. You came in because HR made it mandatory. Dr. Walrus took one look at your calendar and gasped — clinically.",
    mech: "THE BATTERY: everything you do drains it — every shot, every step. Stand still and it recharges. Above 75% you're in OVERDRIVE (+30% damage). Under 25% you fire fumes. CLOCK OUT refills it instantly, because boundaries.",
    rx: "coffee13"
  },
  seasonal: {
    name: "Seasonal Affective",
    short: "The Weather, Internalized",
    tag: "four kits, rotating",
    color: "#7ab86a",
    blurb: "You told him it comes and goes with the light. He nodded, opened the blinds, closed them, opened them again, and billed for four consultations.",
    mech: "THE SEASONS: every ward, your season turns — 🌱 SPRING regenerates you slowly, ☀️ SUMMER sets your tears burning, 🍂 FALL gives them gale-force knockback, ❄️ WINTER chills everything you hit (you idle 5% slower). You check in on whatever season it really is outside. TURN THE PAGE advances it on demand.",
    rx: "gratitude"
  },
  graduate: {
    name: "The Graduate",
    short: "M.D. Candidate (Survived You)",
    tag: "something to prove",
    color: "#5a9a8a",
    blurb: "Your old intern. Three floors, alive, because of you. Now they have scrubs, a laminated badge, and opinions about YOUR chart.",
    mech: "THE CLIPBOARD: your shots are thrown charts that BOOMERANG — they hit on the way out and again on the way back, passing through everyone. PANIC SPRINT: taking a hit triggers a burst of terrified speed. They still count the floors.",
    rx: null
  },
  janitor: {
    name: "The Janitor",
    short: "Occupational Exposure (40 yrs)",
    tag: "the mop knows",
    color: "#8a7460",
    blurb: "You took the mop. The intake form has no box for this, so Dr. Walrus wrote 'STAFF?' and billed facilities.",
    mech: "THE MOP: no tears — hold fire to SWING. Arcs hit hard, wipe enemy shots out of the air, and leave WET FLOOR that slows anyone who walks it. Forty years on shift: +1 heart, +1 Referral, and walls that hide something look… off to you. You walk like a man who has never once run.",
    rx: null
  },
  undiag: {
    name: "Undifferentiated",
    short: "Diagnosis Pending (Forever)",
    tag: "he simply cannot pin you down",
    color: "#c8c8c8",
    blurb: "Nine specialists, nine referrals, nine opinions. Dr. Walrus has started a betting pool. Every floor, he takes another swing.",
    mech: "REDIAGNOSED: every ward, Dr. Walrus changes his mind — your entire condition (mechanics, ability, everything) becomes a random diagnosis at each descent. Your meds and hearts carry over. Good luck keeping up with the chart.",
    rx: null
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

/* ============ SECOND OPINIONS (unlockable alt characters) ============
   A twisted variant of each diagnosis — one strong rule-flip each.
   Unlocked per-diagnosis by beating the Ward-5 Walrus with the base
   version (diagBest >= 6). Selected via the ⇄ flip on Patient Files. */
DATA.DIAG2 = {
  adhd:       { name: "ADHD (Unmedicated)",          tag: "no brakes",                    mech: "NO BRAKES: you can't fully stop — momentum carries you. +30% damage while moving, but HYPERFOCUS is impossible. The meds wore off. Everything is very fast." },
  bipolar:    { name: "Bipolar (Ultradian)",         tag: "every room, new weather",      mech: "ULTRADIAN CYCLING: your mood flips EVERY ROOM. MANIA hits harder (+50% damage, +40% speed). THE DIP is deeper — but you mend a heart when you clear a room in it." },
  depression: { name: "Depression (High-Functioning)", tag: "smiling through it",         mech: "THE MASK: full speed, normal tears, everyone says you're doing great. Every hit you take adds +0.35 damage, permanently. It's fine. Everything is fine." },
  anxiety:    { name: "Anxiety (Panic Disorder)",    tag: "always on",                    mech: "ALWAYS ON: adrenaline never turns off (+speed, +fire rate, +damage at all times) — but CROWDS hurt: stand near 3+ patients and the panic itself starts taking hearts." },
  schizo:     { name: "Schizophrenia (Unmedicated)", tag: "can't trust the distance",     mech: "TUNNEL: +35% damage, and nothing is fake anymore — but you can't see patients at a distance. They're there. You just can't see them yet. Their shots, you can." },
  ocd:        { name: "OCD (Ritualist)",             tag: "all four corners",             mech: "THE RITUAL: every trigger fires a perfect CROSS — four tears in four directions, always, regardless of where you're aiming. The pattern must complete." },
  ptsd:       { name: "PTSD (Weathered)",            tag: "what doesn't kill you",        mech: "SCAR TISSUE: no more On Edge, no flashback zones. Instead every hit you take this floor hardens you: +12% damage per hit (up to +60%). It resets when you descend." },
  insomnia:   { name: "Insomnia (All-Nighter)",      tag: "sleep is for the discharged",  mech: "ALL-NIGHTER: permanently WIRED (+40% damage, +fire rate), the ward is always dim, and sleep never comes — no microsleeps, no naps. Descending burns half a heart. ☕ ESPRESSO replaces the nap." },
  fine:       { name: "Fine (In Recovery)",          tag: "doing the work",               mech: "THE WORK: you heal a half-heart every 2 rooms you clear — actual recovery. But staying well is work: everything trying to stop you has +25% health." },
  seasonal:   { name: "Seasonal (Climate Controlled)", tag: "one season, sealed in",      mech: "CLIMATE CONTROL: the season never turns — you keep your real-world starting season all run, at 150% strength. The thermostat is yours. The thermostat is EVERYTHING." }
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
  /* --- Content Pack II --- */
  weightedblanket: { name: "Weighted Blanket", quote: "Fifteen pounds of okay.", desc: "+2 hearts, −5% speed. You are being gently held. You are also being gently slowed.", pools: ["special", "shop"], apply(p) { p.maxhp += 4; p.hp += 4; p.spd *= 0.95; } },
  noisemachine: { name: "White Noise Machine", quote: "Shhhhhhhh.", desc: "Patients wake up groggy — everything spawns a beat slower.", pools: ["special", "shop"], apply(p) { p.flags.noise = true; } },
  copaycard: { name: "Copay Assistance Card", quote: "Terms apply. Terms always apply.", desc: "+1¢ every time a room clears. It's not much. It's on purpose.", pools: ["shop", "boss"], apply(p) { p.flags.roomCoin = true; } },
  wavepen: { name: "The Waiver Pen", quote: "Sign here, and here, and here—", desc: "KEYSTONE: your tears travel in signature loops. +0.5 damage. Nothing you sign flies straight.", pools: ["special", "boss"], apply(p) { p.clearKeystone(); p.flags.waveTears = true; p.dmg += 0.5; } },
  secondstomach: { name: "Iron Stomach", quote: "Down the hatch. Both hatches.", desc: "Pills hit TWICE. The good ones and, yes, the other ones.", pools: ["special", "oon"], apply(p) { p.flags.doublePill = true; } },
  outofoffice: { name: "Out-of-Office Reply", quote: "I am currently away from my body.", desc: "+12% speed, and your PRN grants a longer breath of invincibility.", pools: ["special", "shop"], apply(p) { p.spd *= 1.12; p.iframeTime += 0.15; } },
  ssri:      { name: "SSRIs", quote: "Feelings: buffering...", desc: "+1.5 damage, slower shots. The edges come off everything, including your tears.", pools: ["special"], apply(p) { p.dmg += 1.5; p.shotSpd *= 0.85; } },
  lithium:   { name: "Lithium", quote: "The original mood moderator.", desc: "Bipolar: stabilizes your cycle into permanent mild power. Everyone else: +damage, +half heart.", pools: ["special"], apply(p) { if (p.diag === 'bipolar') { p.flags.stable = true; } else { p.dmg += 0.5; p.maxhp += 1; p.hp += 1; } } },
  beta:      { name: "Beta Blockers", quote: "The hands. They're steady.", desc: "Removes shot wander. Panic becomes focus.", pools: ["special"], apply(p) { p.wobble = 0; p.flags.noWobble = true; } },
  antipsy:   { name: "Antipsychotic (XR)", quote: "Reality: now in HD.", desc: "+1 heart, +0.5 damage. Hallucinated enemies shimmer — you can finally tell.", pools: ["special", "oon"], apply(p) { p.maxhp += 2; p.hp += 2; p.dmg += 0.5; p.flags.seeFakes = true; } },
  amps:      { name: "Amphetamine Salts", quote: "Lunch is for the unmedicated.", desc: "+20% speed, +15% fire rate, -1 heart (appetite is a memory).", pools: ["special", "oon"], apply(p) { p.spd *= 1.2; p.tearDelay *= 0.85; p.maxhp = Math.max(2, p.maxhp - 2); p.hp = Math.min(p.hp, p.maxhp); } },
  melatonin: { name: "Melatonin Gummies", quote: "Bear-shaped unconsciousness.", desc: "+1 luck (better drops). Slightly sleepier shots.", pools: ["special", "shop"], apply(p) { p.luck += 1; p.tearDelay *= 1.04; } },
  coffee13:  { name: "The Thirteenth Coffee", quote: "It stopped working at the ninth. You kept going.", desc: "+5% speed. The Battery drains a little slower. Your hands are FINE.", pools: [], apply(p) { p.spd *= 1.05; p._battSaver = true; } },
  sampler:   { name: "Trial Sample Pack", quote: "The first one's free. So are the rest, legally speaking.", desc: "A free pill, and all pills this run come pre-identified.", pools: ["special", "shop"], apply(p, G) { p.flags.pillsKnown = true; if (p.pill == null) p.pill = U.randi(0, 9); } },
  sideeffects: { name: "Side Effects May Include", quote: "*reads fast* +2 damage and— everything else.", desc: "+2 damage. Every new floor: one random minor side effect. Worth it?", pools: ["special", "oon"], apply(p) { p.dmg += 2; p.flags.sideEffects = true; } },
  secondwind: { name: "Second Wind", quote: "Filed under: not done yet.", desc: "+1 heart container. The first hit you take in every room simply doesn't count.", pools: ["special", "boss"], apply(p) { p.maxhp += 2; p.hp += 2; p.flags.roomShield = true; } },
  overtimeform: { name: "Overtime Authorization", quote: "Approved. Reluctantly. In triplicate.", desc: "Below half health, your tears hit +25% harder. Desperation, notarized.", pools: ["special", "shop"], apply(p) { p.flags.otForm = true; } },
  grouprates: { name: "Group Rates", quote: "Bulk billing for bulk feelings.", desc: "Your whole Support Group hits +35% harder — current members and future recruits.", pools: ["special", "shop"], apply(p) { p.flags.allyBoost = true; for (const a of p.allies) a.dmgMul = (a.dmgMul || 1) * 1.35; } },

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
  grouptherapy:{ name: "Group Therapy", quote: "Have you considered… joining us?", desc: "Your tears sometimes RECRUIT a patient to the group (3 at a time, tops). Management, security, and paperwork never defect.", pools: ["special", "boss"], apply(p) { p.flags.charm = true; } },
  coldcompress:{ name: "Cold Compress", quote: "Just breathe. Colder.", desc: "Your tears CHILL — each hit stacks a slow on the patient (they get so, so tired).", pools: ["special", "shop"], apply(p) { p.flags.chillTears = true; } },
  incidentreport:{ name: "Incident Report", quote: "This WILL be escalated.", desc: "Your tears can IGNITE — paperwork burns, and so does everything it touches.", pools: ["special", "boss"], apply(p) { p.flags.burnTears = true; } },
  intrusivethought:{ name: "Intrusive Thought", quote: "It spreads if you feed it.", desc: "Kills release the thought — nearby patients CATCH it, take damage, and pass it on when they go.", pools: ["special", "boss"], apply(p) { p.flags.contagion = true; } },
  buddy:     { name: "Buddy System", quote: "Nobody walks the ward alone.", desc: "A fellow patient joins your Support Group and fights alongside you for the rest of the run.", pools: ["special", "boss"], apply(p, G) { p.recruitAlly(G); } },

  /* --- keystone prescriptions: build-arounds that change HOW you fire (one active at a time) --- */
  cryitout:  { name: "Crying It Out", quote: "Let it ALL out.", desc: "KEYSTONE: your tears become a continuous stream — a firehose of processed feelings.", pools: ["special", "boss"], apply(p) { p.clearKeystone(); p.flags.beam = true; } },
  spiralthoughts: { name: "Spiral Thoughts", quote: "They always come back around.", desc: "KEYSTONE: tears corkscrew outward in a widening gyre. Cover everything; aim nothing.", pools: ["special", "boss"], apply(p) { p.clearKeystone(); p.flags.spiralTears = true; p.dmg += 0.5; } },
  radicalhonesty: { name: "Radical Honesty", quote: "It cuts through everyone.", desc: "KEYSTONE: piercing tears that pass through up to 3 patients. The truth doesn't stop.", pools: ["special", "boss"], apply(p) { p.clearKeystone(); p.flags.pierceTears = true; } },
  xrdose:    { name: "Overprescribed XR", quote: "Extended release. VERY extended.", desc: "KEYSTONE: a quad shot — four weaker tears in a wide spread.", pools: ["special", "boss"], apply(p) { p.clearKeystone(); p.flags.quadShot = true; } },
  boomerchart: { name: "Boomerang Chart", quote: "Your file always finds its way back.", desc: "KEYSTONE: tears arc back to you — every throw gets two chances to connect.", pools: ["special", "boss"], unlock: 'hazardTour', apply(p) { p.clearKeystone(); p.flags.boomTears = true; p.dmg += 0.4; } },
  uglycry:   { name: "The Ugly Cry", quote: "One big one, then all the little ones.", desc: "KEYSTONE: tears burst into a ring of droplets wherever they land.", pools: ["special", "boss"], unlock: 'wired', apply(p) { p.clearKeystone(); p.flags.mortarTears = true; } },
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
  { id: 'allDiag',  name: "Hypochondriac",         desc: "Play all nine diagnoses.",                     hint: "Get diagnosed with everything.",           check: m => Object.keys(m.diagsPlayed || {}).length >= 9 },
  { id: 'kills500', name: "Symptom Management",     desc: "Defeat 500 enemies (all runs).",                hint: "Keep managing symptoms.",                  check: m => (m.kills || 0) >= 500 },
  { id: 'overRx',   name: "Overprescribed",        desc: "Get overprescribed — 4 pills on one floor.",    hint: "Take a LOT of pills at once.",             check: m => !!m.everOverRx },
  { id: 'nohit',    name: "Clean Bill of Health",  desc: "Clear a whole floor without taking a hit.",     hint: "Survive a floor untouched.",               check: m => !!m.everNoHitFloor },
  { id: 'denial',   name: "Peak Denial",           desc: "Reach Ward 5 as Perfectly Fine.",               hint: "Insist nothing is wrong. Deeply.",         check: m => ((m.diagBest || {}).fine || 0) >= 5 },
  { id: 'cured',    name: "The Cure (Allegedly)",  desc: "Defeat THE CURE at Ward 25. Unlocks Chronic Mode.", hint: "Descend all the way to Ward 25 and win.", check: m => !!m.cured, reward: "Chronic Mode (New Game+)" },
  { id: 'influencerDown', name: "Unsubscribed",    desc: "Defeat THE INFLUENCER.",                          hint: "Log off a wellness guru.",                 check: m => (m.influencerKills || 0) >= 1 },
  { id: 'founderDown', name: "Delisted",           desc: "Topple THE FOUNDER at Ward 50.",                  hint: "Climb all fifty rungs of the ladder.",     check: m => (m.founderKills || 0) >= 1 },
  { id: 'hazardTour', name: "Frequent Flyer",      desc: "Visit all four special hazard rooms. Unlocks the Boomerang Chart.", hint: "Seclusion, the ECT Suite, the Padded Cell, Observation.", check: m => m.hazardsSeen && ['seclusion', 'ect', 'padded', 'observation'].every(k => m.hazardsSeen[k]), reward: "Boomerang Chart" },
  { id: 'wired',    name: "Tired & Wired",         desc: "Clear a room while WIRED. Unlocks The Ugly Cry.", hint: "Insomnia: run the Sleep meter low, then win anyway.", check: m => !!m.everWiredClear, reward: "The Ugly Cry" },
  { id: 'fullGroup', name: "Group Session",        desc: "Have three Support Group allies at once.",        hint: "The group is full (3).",                   check: m => !!m.everFullGroup },
  { id: 'therapyGrad', name: "Modality Mastered",  desc: "Learn every talent in one therapy branch.",       hint: "Max out a Treatment Plan column, capstone included.", check: m => m.talents && DATA.TALENT_BRANCHES.some(br => DATA.TALENTS.filter(t => t.branch === br.id).every(t => m.talents[t.id])) },
  { id: 'fullPlan',    name: "Comprehensive Care", desc: "Learn the entire Treatment Plan. Every branch. Every capstone.", hint: "The chart has never seen coverage like this.", check: m => m.talents && DATA.TALENTS.every(t => m.talents[t.id]) },
  { id: 'prognosisAll', name: "Worst-Case Scenarios", desc: "Attempt all five Prognosis challenge runs.",   hint: "Try every way to make it harder.",         check: m => m.prognosisBest && Object.keys(m.prognosisBest).length >= 5 },
  { id: 'crisisPro', name: "Crisis Counselor",     desc: "Earn the payout from 3 CODE GRAY ward crises.",   hint: "Hazard pay, three times.",                 check: m => (m.crisesSurvived || 0) >= 3 },
  { id: 'keystone', name: "Off-Label Use",         desc: "Pick up a keystone prescription.",                hint: "Some meds change everything about you.",   check: m => !!m.everKeystone },
  { id: 'systemDown', name: "Out of Network",      desc: "Dismantle THE SYSTEM at Ward 100.",               hint: "Descend one hundred wards. All of them.",  check: m => (m.systemKills || 0) >= 1 },
  { id: 'protocolFirst', name: "Informed Consent", desc: "Complete a Challenge Protocol.",                  hint: "Survive one of the ten Protocols to Ward 6.", check: m => Object.keys(m.protocolsDone || {}).length >= 1 },
  { id: 'protocolFive', name: "Peer-Reviewed",     desc: "Complete 5 Challenge Protocols.",                 hint: "The methodology is sound.",                check: m => Object.keys(m.protocolsDone || {}).length >= 5 },
  { id: 'boardDown', name: "Golden Parachute",     desc: "Dissolve THE BOARD at the top of the Ascent.",    hint: "After Ward 5, take the elevator UP.",      check: m => (m.boardKills || 0) >= 1 },
  { id: 'auditClean', name: "Clean Books",         desc: "Put down THE AUDITOR.",                           hint: "Sometimes the thing follows you. Turn around.", check: m => (m.auditorKills || 0) >= 1 },
  { id: 'ama',        name: "Elopement Risk",      desc: "Leave Against Medical Advice.",                   hint: "Ward 8+, find the Day Room. Sign the form. Run.", check: m => (m.amaDone || 0) >= 1 },
  { id: 'contracts5', name: "Reliable Patient",    desc: "Complete 5 Day Room contracts.",                  hint: "The other patients need things.",          check: m => (m.contractsDone || 0) >= 5 },
  { id: 'goldplan',   name: "Cadillac Coverage",   desc: "Beat Dr. Walrus on the Gold plan.",               hint: "Pay dearly up front. Enjoy the discounts.", check: m => !!m.everGoldWalrus },
  { id: 'revenge',    name: "Grudge Settled",      desc: "Put down the one that REMEMBERS YOU.",            hint: "It got you once. It came back to gloat.",   check: m => (m.revenges || 0) >= 1 },
  { id: 'penpal',     name: "Pen Pal",             desc: "Redeem a Care Package.",                          hint: "Someone out there is thinking of you. Concerning.", check: m => (m.giftsGot || 0) >= 1 },
  { id: 'couch',      name: "Group Rate",          desc: "Finish a floor with Patient Two in the room.",    hint: "Bring a friend. Misery loves it.",          check: m => !!m.everCoop },
  { id: 'overtime10', name: "Time and a Half",     desc: "Survive to wave 10 in OVERTIME.",                 hint: "One room. Everything the ward has.",        check: m => (m.overtimeBest || 0) >= 10 },
  { id: 'janitor5',   name: "Employee of the Month", desc: "Buy 5 things from the Janitor.",                hint: "He finds things. Don't ask where.",         check: m => (m.janitorBuys || 0) >= 5 },
  { id: 'petGrown',   name: "Good Influence",      desc: "Evolve an Emotional Support Animal.",             hint: "40 rooms together changes an animal.",      check: m => m.petXp && Object.values(m.petXp).some(v => v >= 40) },
  { id: 'fileClosed', name: "File Closed",         desc: "Walk out the front door.",                        hint: "The Cure. The Founder. The System. The Board. The AMA door. Then: the actual door.", check: m => !!m.exitDone },
  { id: 'mentor',     name: "The Mentor",          desc: "Graduate an Intern — three floors, alive.",       hint: "Someone new is checking in on Ward 2. They're terrified.", check: m => !!m.internGrad },
  { id: 'goodFaith',  name: "Bargained in Good Faith", desc: "Settle a union action with severance.",       hint: "When they unionize, you don't HAVE to fight.", check: m => (m.unionsSettled || 0) >= 1 },
  { id: 'volunteer',  name: "Back On Purpose",     desc: "Clear a floor wearing the Volunteer Badge.",      hint: "Your file is closed. Theirs aren't.",       check: m => !!m.everVolunteer },
  { id: 'holdHung',   name: "Thank You For Holding", desc: "Hang up on THE HOLD.",                          hint: "Ward 7+. Press the number it asks for. Then press harder.", check: m => (m.holdKills || 0) >= 1 },
  { id: 'debtFree',   name: "In Good Standing",     desc: "Repay a Financing Desk plan in full.",           hint: "Borrow. Descend. Watch what follows. Pay it off anyway.", check: m => (m.debtsPaid || 0) >= 1 },
  { id: 'lucid',      name: "Lucid",                desc: "Take the DREAM PRESCRIPTION.",                   hint: "After a hard boss, sometimes: a bed. A real one.", check: m => (m.dreamRx || 0) >= 1 },
  { id: 'cutOut',     name: "Cut Out The Middleman", desc: "Pop the Pharmacy Benefits Manager.",            hint: "When prices spike 40% for no reason, the reason is in one of the rooms.", check: m => (m.pbmKills || 0) >= 1 },
  { id: 'wokeUp',     name: "Slept On It",          desc: "Wake from THE NIGHTMARE holding its prescription.", hint: "Sometimes the bed goes wrong. Go down anyway.", check: m => (m.nightmareRx || 0) >= 1 },
  { id: 'subStash',   name: "Another Basement",     desc: "Reach the Janitor's stash below the basement.",  hint: "He told you there's another basement. The hole is behind the shelves.", check: m => (m.subStash || 0) >= 1 },
  { id: 'onboarded87', name: "Fully Oriented",      desc: "Watch WELCOME TO THE WARD (1987) to the end.",   hint: "The tape is at the front desk. Nobody has ever finished it. Be the first.", check: m => !!m.orientationDone },
  { id: 'heldAlone',  name: "Held It Alone",         desc: "Clear the Isolation Wing solo.",              hint: "The door says ENTER ALONE. It means it. So can you.", check: m => (m.isolations || 0) >= 1 },
  { id: 'untitled',   name: "Untitled Goose Achievement", desc: "Catch THE GOOSE.",                     hint: "It has your stuff. It is not sorry.", check: m => (m.gooseCaught || 0) >= 1 },
  { id: 'goodOptics', name: "Excellent Optics",     desc: "Clear a room untouched while the Open House tour watches.", hint: "Admissions brings families through sometimes. Look treated.", check: m => (m.optics || 0) >= 1 },
  { id: 'sugarPill',  name: "It Was Sugar",        desc: "Complete a Clinical Trial that turns out to be the placebo.", hint: "Enroll with the Drug Rep. Believe hard.", check: m => (m.placeboDone || 0) >= 1 },
  { id: 'reRead',     name: "Second Read",         desc: "Let THE SCANNER re-interpret a prescription.",    hint: "A rare imaging suite. It sees something different every time.", check: m => (m.scans || 0) >= 1 },
  { id: 'mopShift',   name: "Second Career",       desc: "Reach Ward 5 as The Janitor.",                    hint: "Finish THE HANDOFF first. Then work the shift you accepted.", check: m => !!m.mopShift },
  { id: 'archivist',  name: "The Archivist",       desc: "Recover all 12 misfiled documents.",              hint: "The building's paperwork surfaces where the mess was.", check: m => Object.keys(m.docs || {}).length >= 12 },
  { id: 'biographer', name: "An Unreliable Narrator", desc: "Fill 10 pages of the Patient Diary.",          hint: "The journal on the coffee table writes itself. About you.", check: m => (m.dayCount || 0) >= 10 },
  { id: 'architect',  name: "Prior Authorization", desc: "Take a Custom Care Plan to ward 5.",              hint: "Design your own complications. Get them approved. Survive them.", check: m => !!m.carePlanDeep },
  { id: 'rivalry3',   name: "It's Not A Competition", desc: "Win 3 gym duels against your rival.",          hint: "Someone checked in the same day as you. They counted.", check: m => !!(m.rival && (m.rival.duelW || 0) >= 3) },
  { id: 'races5',     name: "Photo Finish",        desc: "Beat your rival to 5 prescriptions.",             hint: "When they burst in, stop aiming and RUN.",  check: m => !!(m.rival && (m.rival.raceW || 0) >= 5) },
  { id: 'retail8',    name: "Retail Therapy",      desc: "Buy 8 things from the Gift Shop.",                hint: "The fund was going to the walrus anyway.",  check: m => (m.giftBuys || 0) >= 8 },
  { id: 'nightOwl',   name: "Working Nights",      desc: "Clear 3 floors on the night shift (9pm–6am).",    hint: "The building keeps hours. Keep worse ones.", check: m => (m.nightFloors || 0) >= 3 },
  { id: 'blackout',   name: "BLACKOUT",            desc: "Complete every square on a daily bingo card.",    hint: "The activities coordinator believes in you. Contractually.", check: m => (m.bingoBlackouts || 0) >= 1 },
  { id: 'breakroom',  name: "Employee of the Break", desc: "Beat your rival's posted PILL CATCHER score.",  hint: "The machine in the breakroom. They taped their score to it.", check: m => !!(m.arcade && m.arcade.rivalBeaten) },
  { id: 'twoBirds',   name: "Two Birds",           desc: "Clear a JOINT COMMISSION room (two bosses, one paycheck).", hint: "Past Ward 15, management consolidates.", check: m => (m.jointsCleared || 0) >= 1 },
  { id: 'compound3',  name: "Ask Your Alchemist",  desc: "Have the Compounding Pharmacist fuse 3 meds.",    hint: "A back room behind some pharmacies. Two enter. One leaves.", check: m => (m.compounds || 0) >= 3 },
  { id: 'sceneReturn', name: "Return To The Scene", desc: "Clear the Incident Site where you last died.",   hint: "They roped it off. Your outline is still there.", check: m => (m.incidentsCleared || 0) >= 1 },
  { id: 'stairMaster', name: "StairMaster",         desc: "Take the stairs down clean, 3 times.",            hint: "Nobody takes the stairs. Take the stairs.",     check: m => (m.stairsClean || 0) >= 3 },
  { id: 'defyOdds',   name: "Outside The Model",    desc: "Win 3 wagers against the Actuary.",               hint: "The projection is not a diagnosis. Prove it.",  check: m => (m.actuaryWins || 0) >= 3 },
  { id: 'actCorrect', name: "A Model Patient",      desc: "Die exactly as the Actuary predicted.",           hint: "Right ward. They'll frame the printout.",       check: m => (m.actuaryCorrect || 0) >= 1 },
  { id: 'audiophile', name: "Heavy Rotation",       desc: "Unlock every track on WWRD Ward Radio.",          hint: "The building has nine songs. Hear them all.",   check: m => Object.keys(m.tracksHeard || {}).length >= 9 },
  { id: 'ownRecords', name: "It's My File",         desc: "Steal your original intake file from the Records Room.", hint: "They keep the originals behind the stacks. Don't be seen.", check: m => !!m.fileStolen },
  { id: 'mergerDown', name: "Hostile Takeover, Reversed", desc: "Defeat THE MERGER.",                       hint: "Past Ward 30, the acquisition closes. Object to it.", check: m => (m.mergerKills || 0) >= 1 },
  { id: 'fullWeek',   name: "Regular Programming",  desc: "Check in on all 7 days of the week.",             hint: "The building runs on a real calendar. So do you.", check: m => Object.keys(m.calDays || {}).length >= 7 },
  { id: 'walkinFast', name: "In And Out",           desc: "Finish a Walk-In Clinic visit in under 4 minutes.", hint: "Six-ish rooms, one manager, no dawdling.",     check: m => !!(m.walkinBest && m.walkinBest.secs <= 240) },
  { id: 'freshAir',   name: "Fresh Air",            desc: "Find the roof.",                                  hint: "A service ladder, sometimes, past Ward 6. Up, for once.", check: m => (m.roofVisits || 0) >= 1 },
  { id: 'phoneHome',  name: "Called Home",          desc: "Call MOM from the payphone 3 times.",             hint: "She worries. It's 1¢. Come on.",               check: m => (m.momCalls || 0) >= 3 },
  { id: 'fourSeasons', name: "A Year Indoors",      desc: "Clear a ward in all four seasons as Seasonal Affective.", hint: "Spring, summer, fall, winter — the building has no windows, but you'd know.", check: m => Object.keys(m.seasonsSeen || {}).length >= 4 },
  { id: 'goodShow',   name: "Nothing To See Here",  desc: "Hold your fire through an entire INSPECTION.",    hint: "When the Inspector tours, the ward performs wellness. Let it.", check: m => (m.inspections || 0) >= 1 },
  { id: 'whoAmI',     name: "Administrative Error", desc: "Survive a chart MIX-UP (a whole ward as someone else).", hint: "Bay 6 has your chart. You have theirs. Make it work.", check: m => (m.mixups || 0) >= 1 },
  { id: 'theHandoff', name: "Forty Years, One Bucket", desc: "Take the mop.",                                hint: "Close your file. Earn his trust, ten times over. Then look in the basement.", check: m => !!m.handoffDone },
  { id: 'playdate',   name: "The Daycare Expands",  desc: "Clear a floor with two fully-evolved animals on shift.", hint: "Two ★ companions. One very crowded kidney dish.", check: m => (m.playdates || 0) >= 1 },
  { id: 'annexClear', name: "Condemned, Cleared",   desc: "Survive THE ANNEX and take its deep exit.",        hint: "A boarded door beside some trapdoors. The wing they closed.", check: m => (m.annexClears || 0) >= 1 },
  { id: 'pulledIt',   name: "It Said Do Not",       desc: "Pull the fire alarm.",                            hint: "The box on the wall. The sign has three words.",   check: m => (m.alarmPulls || 0) >= 1 },
  { id: 'goodCrowd',  name: "Good Crowd",           desc: "Support 3 open-mic performers.",                  hint: "The Day Room has a stage now. It's a step stool.", check: m => (m.micSupports || 0) >= 3 }
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
  { id: 'thegoodone', name: "The Good One", msg: "Full heal, +1 luck. THE good one.", bad: false, apply(p) { p.hp = p.maxhp; p.luck += 1; SFX.play('heal'); } },
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
  { id: 'goodone', name: "The Good One", msg: "Oh, that's the GOOD one.", bad: false, apply(p) { p.dmg += 0.4; p.spd *= 1.05; p.tearDelay *= 0.95; } },
  { id: 'courage', name: "Chewable Courage", msg: "Grape flavored. Fearless for a while.", bad: false, apply(p) { p.dmg += 0.8; p._courageT = 45; } },
  { id: 'expiredopt', name: "Expired Optimism", msg: "Heals a heart. Tastes like 2019.", bad: false, apply(p) { p.heal(2); p.luck -= 0.4; SFX.play('heal'); } }
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
  form:      { name: "Prior Auth Form", hp: 4, spd: 0, r: 16, dmg: 0, beh: 'idle', clr: '#f4eee0' },
  gaslighter:{ name: "The Gaslighter", hp: 12, spd: 76, r: 15, dmg: 1, beh: 'gaslight', clr: '#b8a8d8' },
  projection:{ name: "The Projection", hp: 11, spd: 0, r: 15, dmg: 1, beh: 'mimic', clr: '#7ac0d8' },
  copaycollector: { name: "Copay Collector", hp: 13, spd: 122, r: 14, dmg: 0, beh: 'thief', clr: '#e0c95a' },
  wellnessbot: { name: "Wellness Bot", hp: 18, spd: 46, r: 16, dmg: 1, beh: 'shieldbot', clr: '#8fd0c8' },
  spiral:    { name: "The Spiral", hp: 9, spd: 0, r: 13, dmg: 1, beh: 'orbit', clr: '#d08ab0' },
  comparison:{ name: "The Comparison", hp: 14, spd: 62, r: 16, dmg: 1, beh: 'compare', clr: '#9ab86a' },
  waitingnum:{ name: "Now Serving", hp: 10, spd: 0, r: 16, dmg: 1, beh: 'ticket', clr: '#e8dcc0' },
  /* --- the deep roster (ward 8+) --- */
  secondop:  { name: "The Second Opinion", hp: 15, spd: 74, r: 15, dmg: 1, beh: 'chase', clr: '#b06be0' },
  waitlist:  { name: "The Waitlist", hp: 22, spd: 30, r: 19, dmg: 1, beh: 'waitlist', clr: '#c8b890' },
  premium:   { name: "The Premium", hp: 14, spd: 96, r: 14, dmg: 0, beh: 'premium', clr: '#e0b83a' },
  placebo:   { name: "The Placebo", hp: 1, spd: 60, r: 20, dmg: 1, beh: 'chase', clr: '#e8e0f0' },
  /* --- the roaming hunter --- */
  auditor:  { name: "THE AUDITOR", hp: 135, spd: 58, r: 22, dmg: 1, beh: 'auditor', clr: '#a8a29a', shotCd: 3.4, bulSpd: 195 },
  /* --- the price parasite (one room per PBM floor — hunt him) --- */
  middleman:{ name: "THE MIDDLEMAN", hp: 45, spd: 132, r: 15, dmg: 0, beh: 'pbm', clr: '#b0a468' },
  /* --- the goose. no further explanation. --- */
  goose:    { name: "THE GOOSE", hp: 26, spd: 150, r: 13, dmg: 0, beh: 'goose', clr: '#e8e4da' },
  /* --- the debt made flesh (spawns while you owe the Financing Desk) --- */
  collector:{ name: "THE COLLECTOR", hp: 30, spd: 96, r: 16, dmg: 1, beh: 'thief', clr: '#8a6a9a' },
  /* --- your rival (duels only — never in random pools) --- */
  rival:    { name: "THE RIVAL", hp: 58, spd: 92, r: 15, dmg: 1, beh: 'rival', clr: '#d08a4a', shotCd: 1.7, bulSpd: 205 },
  /* --- night-shift exclusive miniboss --- */
  nightnurse: { name: "THE NIGHT NURSE", hp: 70, spd: 38, r: 24, dmg: 1, beh: 'nightnurse', clr: '#8a90c8', shotCd: 2.8, bulSpd: 170 },
  /* --- records-room security (spawn only when a heist goes loud) --- */
  recordsguard: { name: "Records Patrol", hp: 32, spd: 72, r: 15, dmg: 1, beh: 'auditor', clr: '#b0a890', shotCd: 3.1, bulSpd: 180 },
  /* --- ward minibosses (clinic rooms) --- */
  chargenurse: { name: "THE CHARGE NURSE", hp: 55, spd: 42, r: 24, dmg: 1, beh: 'nursey', clr: '#e8ecf0', shotCd: 0.55, bulSpd: 210 },
  resident:    { name: "THE RESIDENT", hp: 48, spd: 58, r: 22, dmg: 1, beh: 'resident', clr: '#7ab8a0', bulSpd: 180 },
  orderly:     { name: "THE ORDERLY", hp: 74, spd: 34, r: 27, dmg: 1, beh: 'orderly', clr: '#9aa4b8' }
};
DATA.enemyPoolFor = function (depth) {
  // deeper enemies get relatively more common the further past their unlock you go,
  // so late wards lean on the nastier roster instead of the same early mix
  const P = [
    { id: 'scroller', d: 1, w: 3 }, { id: 'notif', d: 1, w: 3 }, { id: 'larper', d: 1, w: 2.4 },
    { id: 'ad', d: 2, w: 2.4 }, { id: 'doubt', d: 2, w: 2 },
    { id: 'deadline', d: 3, w: 2 }, { id: 'intrusive', d: 3, w: 2 },
    { id: 'redflag', d: 4, w: 1.8 }, { id: 'fog', d: 4, w: 1.4 }, { id: 'sideeffect', d: 4, w: 1.8 },
    { id: 'enabler', d: 5, w: 1.4 },
    { id: 'copaycollector', d: 3, w: 1.6 }, { id: 'gaslighter', d: 4, w: 1.6 }, { id: 'spiral', d: 4, w: 1.7 },
    { id: 'projection', d: 5, w: 1.5 }, { id: 'wellnessbot', d: 5, w: 1.3 }, { id: 'waitingnum', d: 5, w: 1.2 },
    { id: 'comparison', d: 6, w: 1.5 },
    { id: 'secondop', d: 8, w: 1.7 }, { id: 'waitlist', d: 8, w: 1.3 },
    { id: 'premium', d: 9, w: 1.5 }, { id: 'placebo', d: 8, w: 1.1 }
  ].filter(e => depth >= e.d);
  for (const e of P) e.w *= 1 + 0.12 * Math.max(0, depth - e.d);
  return P;
};
DATA.pickEnemy = function (depth, wing) {
  const P = DATA.enemyPoolFor(depth);
  // specialty wing: its signature crowd is 3× as common here
  const W = wing ? DATA.WINGS.find(w => w.id === wing) : null;
  if (W) for (const e of P) if (W.mix.includes(e.id)) e.w *= 3;
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
  influencer: { name: "THE INFLUENCER", sub: "“This ring light cured me. Use code WALRUS10.”", hp: 210 },
  peerreview: { name: "THE PEER REVIEW", sub: "“Interesting case. May I?”", hp: 280 },
  thecure:    { name: "THE CURE", sub: "“It was inside you all along. (It wasn't.)”", hp: 300 },
  founder:    { name: "THE FOUNDER", sub: "“I didn't invent the disease. I monetized the cure.”", hp: 400 },
  thesystem:  { name: "THE SYSTEM", sub: "“Your call is important to us. Estimated wait: forever.”", hp: 620 },
  theboard:   { name: "THE BOARD", sub: "“All in favor of denying coverage? Motion carries.”", hp: 470 },
  merger:     { name: "THE MERGER", sub: "“Synergy. Efficiencies. Your chart, our brand.”", hp: 430 },
  thehold:    { name: "THE HOLD", sub: "“Your call is important to us. Estimated wait: 40 minutes.”", hp: 240 },
  deductible: { name: "THE DEDUCTIBLE", sub: "“Your plan covers this fight at 80%. After the deductible.”", hp: 250 },
  abtest:     { name: "THE A/B TEST", sub: "“You are in the control group. You were always in the control group.”", hp: 260 },
  walrus:     { name: "DR. WALRUS, M.D.*", sub: "*mail-order", hp: 300 }
};
DATA.bossFor = function (depth, lastBoss) {
  if (depth === 25) return 'thecure';   // the (non-)finale
  if (depth === 50) return 'founder';   // the (real) superboss, for those who keep climbing
  if (depth === 100) return 'thesystem';   // the whole machine at once — the true ceiling
  if (depth % 5 === 0) return 'walrus';
  let pool = ['gatekeeper', 'larperking'];
  if (depth >= 2) pool.push('adjuster', 'priorauth');
  if (depth >= 3) pool.push('stigma', 'dsm', 'algorithm', 'influencer');
  if (depth >= 4) pool.push('withdrawal', 'burnout');
  if (depth >= 6) pool.push('peerreview');   // by now there's enough of you on file to copy
  if (depth >= 7) pool.push('thehold');      // deep enough that they stop pretending you'll be seen promptly
  if (depth >= 9) pool.push('abtest');       // by now you've consented to the methodology (implicitly)
  if (depth >= 8) pool.push('deductible');   // the plan year reset mid-descent. of course it did.
  if (depth >= 30) pool.push('merger', 'merger');   // deep wards: the acquisition closed (double weight)
  const filtered = pool.filter(b => b !== lastBoss);
  return U.choice(filtered.length ? filtered : pool);
};

/* ============ DAILY HOUSE RULES (same rules for everyone, posted at the door) ============ */
DATA.HOUSE_RULES = [
  { id: 'brokenCoolers', icon: '🚱', name: 'Coolers out of order', desc: 'Day Room water coolers heal nothing today' },
  { id: 'doublePills',   icon: '💊', name: 'Free samples day',     desc: 'every cleared room dispenses a pill' },
  { id: 'shadowAll',     icon: '🌑', name: 'Rolling blackouts',    desc: 'every ward from 6 down runs dark (shadow rules)' },
  { id: 'richWards',     icon: '💰', name: 'Petty cash audit',     desc: 'rooms drop noticeably more change' },
  { id: 'frailBosses',   icon: '🤒', name: 'Management is unwell', desc: 'bosses at −15% health' },
  { id: 'toughCrowd',    icon: '💪', name: 'Wellness seminar day', desc: 'patients at +15% health' },
  { id: 'repDay',        icon: '💼', name: 'Rep in the building', desc: 'the Drug Rep appears after every boss today' },
  { id: 'pricier',       icon: '📈', name: 'Rate adjustment',      desc: 'all copays +30%' },
  { id: 'stocked',       icon: '🏪', name: 'Overstock',            desc: 'an extra unlocked pharmacy on ward 1' },
  { id: 'fastCrowd',     icon: '🏃', name: 'Fire drill (ongoing)', desc: 'everything moves 10% faster' },
  { id: 'luckyDay',      icon: '🍀', name: 'Someone blessed the vents', desc: '+1 luck for everyone' },
  { id: 'fogOfWar',      icon: '🗺', name: 'Maps recalled',        desc: 'the minimap is down for maintenance' },
  { id: 'quietHours',    icon: '🤫', name: 'Quiet hours',          desc: 'patients fire 15% slower but pace 8% faster' },
  { id: 'visitorDay',    icon: '👪', name: 'Visitor day',          desc: 'Day Rooms are crowded — two extra patients with boons' }
];

/* ============ THE CREDITS (everyone gets thanked. nobody gets paid.) ============ */
DATA.CREDITS = [
  ['title', 'EVERYBODIES GOT SOMETHIN'],
  ['sub', 'a production of the ward'],
  ['gap'],
  ['role', 'STARRING'],
  ['name', 'You — as The Patient'],
  ['name', 'Your Symptoms — as Themselves'],
  ['name', 'Dr. Walrus — as "The Doctor" (title disputed)'],
  ['gap'],
  ['role', 'ANTAGONISTS'],
  ['name', 'The Management — sixteen of them, itemized'],
  ['name', 'The Bill — always'],
  ['gap'],
  ['role', 'SUPPORTING CAST'],
  ['name', 'The Janitor — forty years, one bucket'],
  ['name', 'The Support Group — they showed up'],
  ['name', 'Patient Two — checked in, eventually'],
  ['name', 'The Emotional Support Animals — good ones, all'],
  ['gap'],
  ['role', 'SPECIAL THANKS'],
  ['name', 'The Wellness Fund — for the aquarium'],
  ['name', 'The Intercom — for the commentary'],
  ['name', 'Whoever kept leaving coins in the rocks'],
  ['gap'],
  ['role', 'INSURANCE'],
  ['name', 'Declined to comment'],
  ['gap'],
  ['role', 'MEDICAL ACCURACY CONSULTANT'],
  ['name', '(position unfilled)'],
  ['gap'],
  ['sub', 'no symptoms were cured in the making of this game'],
  ['sub', 'everybody\'s got somethin. be kind. including to yourself.'],
  ['gap'],
  ['title', '🦭']
];

/* ============ THE RIVAL (checked in the same day. files identical. one of you is thriving.) ============ */
DATA.RIVAL_NAMES = ['TODD', 'DENISE', 'CRAIG', 'MARLA', 'DOUGIE', 'BEV', 'TOBIAS', 'SHARON', 'KEITH', 'PAM'];
DATA.RIVAL_TAUNTS = {
  raceWin:  ["“Mine! Prescribed to ME, basically.”", "“You hesitated. The chart noticed.”", "“Same intake day, and yet. AND YET.”"],
  raceLose: ["“I wasn't even trying. That was cardio.”", "“Keep it. It clashed with my prognosis anyway.”", "“...fine. FINE.”"],
  duelOffer: "“One round. Loser admits their coping is a lifestyle. The gym's free till four.”",
  duelWin:  ["“I'm telling the group about this. MY version of this.”", "“Best of three?? Rhetorical. Bye.”"],
  duelLose: ["“Undefeated. Tell your allies. Tell your PET.”"]
};
DATA.GIFTS = [
  { id: 'flowers',   icon: '💐', name: 'Flowers',            cost: 25, desc: 'They brighten the room. The room bills for light.', fx: '+1 heart container at check-in', quip: '“Real ones. Mostly. The ferns are aspirational.”' },
  { id: 'balloon',   icon: '🎈', name: 'GET WELL Balloon',   cost: 15, desc: 'It follows you. It believes in you. It is one (1) hit from bursting into confetti — three, actually.', fx: '+1 luck · pops after 3 hits (luck stays)', quip: '“Latex-free. Hope-adjacent.”' },
  { id: 'card',      icon: '💌', name: 'Get-Well Card',      cost: 20, desc: 'A message from someone who cares, or a good impression of one.', fx: '+0.4 damage all run', quip: '“The sentiment is preprinted. The love is implied.”' },
  { id: 'plush',     icon: '🧸', name: 'Plush Walrus (small)', cost: 30, desc: 'A tiny doctor of vibes. Orbits. Blocks nothing emotionally, some things physically.', fx: 'start with a plush familiar', quip: '“The eyes follow you. That\'s the quality.”' },
  { id: 'visitor',   icon: '🎫', name: 'Visitor Pass',       cost: 35, desc: 'One (1) guest may accompany the patient. The guest is armed.', fx: 'a random ally joins at check-in', quip: '“Visiting hours are whenever now. Nobody checks.”' },
  { id: 'chocolate', icon: '🍫', name: 'Contraband Chocolate', cost: 10, desc: 'Smuggled past the nutrition board in a get-well basket.', fx: 'a pre-identified pill + 2¢', quip: '“It\'s medicinal if you chew slowly.”' }
];

/* ============ THE COMPOUNDING PHARMACIST (two meds enter. one leaves. don't ask.) ============ */
DATA.COMPOUND_LINES = {
  greet: ["“Back here. Quickly. The cameras sweep on the minute.”", "“You look like someone who reads warning labels as suggestions.”", "“Compounding is legal. THIS is compounding-adjacent.”"],
  fuse: ["“They're reacting. That's normal. The smoke is normal. Stand back-ish.”", "“Molecularly speaking, these two always wanted each other.”", "“If anyone asks, this is a smoothie.”"],
  broke: ["“No charity. The mortar has a mortgage.”"]
};

/* ============ WARD BINGO (the activities coordinator finally did something) ============ */
DATA.BINGO_POOL = [
  { id: 'kill25',    icon: '👥', name: 'Manage 25 symptoms',        ev: 'kill',      n: 25 },
  { id: 'rooms12',   icon: '🚪', name: 'Clear 12 rooms',            ev: 'room',      n: 12 },
  { id: 'boss2',     icon: '☠',  name: 'Defeat 2 bosses',           ev: 'boss',      n: 2 },
  { id: 'coin30',    icon: '🪙', name: 'Collect 30¢',               ev: 'coin',      n: 30 },
  { id: 'pill4',     icon: '💊', name: 'Swallow 4 pills',           ev: 'pill',      n: 4 },
  { id: 'bomb2',     icon: '📄', name: 'File 2 claim forms',        ev: 'bomb',      n: 2 },
  { id: 'buy2',      icon: '🏪', name: 'Buy 2 meds',               ev: 'buy',       n: 2 },
  { id: 'secret1',   icon: '🧱', name: 'Find a secret room',        ev: 'secret',    n: 1 },
  { id: 'hazard1',   icon: '⚠',  name: 'Visit a hazard ward',       ev: 'hazard',    n: 1 },
  { id: 'miniboss1', icon: '⚕',  name: 'Clear a Clinic',            ev: 'miniboss',  n: 1 },
  { id: 'clean2',    icon: '✨', name: '2 rooms untouched',         ev: 'cleanroom', n: 2 },
  { id: 'floorclean1', icon: '🧼', name: 'A whole floor, no hits',  ev: 'floorclean', n: 1 },
  { id: 'trinket1',  icon: '🧷', name: 'Pocket a personal effect',  ev: 'trinket',   n: 1 },
  { id: 'ally1',     icon: '🤝', name: 'Recruit an ally',           ev: 'ally',      n: 1 },
  { id: 'contract1', icon: '📝', name: 'Complete a contract',       ev: 'contract',  n: 1 },
  { id: 'sample1',   icon: '🎁', name: 'Take a free sample',        ev: 'sample',    n: 1 },
  { id: 'janitor1',  icon: '🧹', name: 'Buy from the Janitor',      ev: 'janitor',   n: 1 },
  { id: 'race1',     icon: '🏁', name: 'Outrun your rival',         ev: 'race',      n: 1 },
  { id: 'spare1',    icon: '✌',  name: 'Spare a boss',              ev: 'spare',     n: 1 },
  { id: 'union1',    icon: '🤝', name: 'Settle a union',            ev: 'union',     n: 1 },
  { id: 'depth5',    icon: '⬇',  name: 'Reach Ward 5',              ev: 'depth5',    n: 1 },
  { id: 'depth8',    icon: '⬇',  name: 'Reach Ward 8',              ev: 'depth8',    n: 1 },
  { id: 'walrus1',   icon: '🦭', name: 'Beat Dr. Walrus',           ev: 'walrus',    n: 1 },
  { id: 'goals3',    icon: '🎯', name: 'Finish 3 treatment goals',  ev: 'goal',      n: 3 },
  { id: 'doc1',      icon: '🗂', name: 'Recover a misfiled document', ev: 'doc',     n: 1 },
  { id: 'daily1',    icon: '🗓', name: "Play today's Daily Ward",   ev: 'daily',     n: 1 },
  { id: 'night1',    icon: '🌙', name: 'Clear a floor on nights',   ev: 'night',     n: 1 },
  { id: 'gift1',     icon: '🎀', name: 'Check in with a gift',      ev: 'gift',      n: 1 }
];

/* ============ MISFILED DOCUMENTS (the building's true history, one page at a time) ============
   Found rarely where the mess was. Collected in the ARCHIVE tab of the Patient Chart. */
DATA.DOCUMENTS = [
  { id: 'intake1974', icon: '📄', title: 'Intake Form — March 4, 1974', sub: 'the first patient. the first label.',
    body: ["PATIENT #0001. Presenting complaint: 'nerves.'", "Diagnosis (write clearly): nerves. Secondary: none. Tertiary: none. The form only had room for one and nobody minded.",
      "Estimated stay: 'a few days.' Estimated cost: $4.00.", "Someone has underlined $4.00 twice, much later, in different ink, with what appears to be grief."] },
  { id: 'cruise', icon: '🛳', title: 'Transcript — The Seminar at Sea', sub: 'where the doctor learned Everything™.',
    body: ["DAY 2, POOLSIDE TRACK: 'Diagnosis as a Growth Industry.' Attendee D. WALRUS asks: 'But what if everyone has something?' Laughter. Then a pause. Then note-taking.",
      "DAY 4: D. WALRUS wins the raffle (a stamp).", "DAY 6, CLOSING KEYNOTE: 'You are not selling sickness. You are selling CERTAINTY.' Standing ovation. The ship never technically entered any nation's waters.",
      "Certificate mailed. Frame purchased separately. Sea legs: permanent."] },
  { id: 'blueprint', icon: '📐', title: 'Blueprint — Revision C', sub: 'there is another basement.',
    body: ["Floors shown: G, B1 through B12, then a floor drawn in pencil and labeled only 'THE JANITOR KNOWS.'", "Below it: a second, deeper rectangle. Someone wrote 'DO NOT NUMBER THIS FLOOR' and someone else wrote 'agreed' and someone else drew a small candle.",
      "The elevator shaft stops at B12 on paper. The stairs do not stop anywhere. The stairs are drawn going off the edge of the page.",
      "Revision D was never filed. Revision D was never going to be filed."] },
  { id: 'memoIntercom', icon: '📢', title: 'Memo — RE: RE: RE: The Intercom', sub: 'nobody installed it.',
    body: ["FROM: Facilities. 'Which contractor installed the PA system? We have no invoice.'", "FROM: Purchasing. 'We have no record. We assumed it came with the building.'",
      "FROM: The Architect (retired). 'The building did not come with a PA system. It came with excellent acoustics.'", "FROM: Facilities, four years later: 'Closing this ticket. It talks. People expect it now. Some things you stop asking about.'",
      "Attached: a maintenance schedule for a microphone no one has ever found. It is always marked 'ON.'"] },
  { id: 'mission', icon: '🖋', title: 'The Original Mission Statement', sub: 'edited until it meant nothing.',
    body: ["Draft 1 (handwritten): 'Help people.'", "Draft 4 (typed): 'Help people navigate their care journey.'", "Draft 9 (legal): 'Facilitate outcome-adjacent wellness pathways at scale, subject to coverage.'",
      "Draft 14 (final, framed in the lobby): 'YOUR HEALTH IS OUR EVERYTHING™.'", "Under the frame's backing paper, someone kept Draft 1. You can feel the pen strokes through the cardboard. Whoever wrote it pressed very hard."] },
  { id: 'fogInvoice', icon: '🧾', title: 'Invoice #0001 — Atmosphere, Rental', sub: 'the fog is partly a machine.',
    body: ["ITEM: Fog machine, model 'GRAVITAS II.' QTY: 3. PURPOSE (as written): 'ambiance / morale / plausible depth.'", "RECURRING MONTHLY SINCE: 1981. TOTAL TO DATE: do not calculate this. The margin note says 'do not calculate this' and the margin note is right.",
      "Note from the supplier: 'You know these are for theaters, right?' Reply, stamped: 'THIS IS A THEATER.'",
      "The Brain Fog on ward 4 is, at minimum, 30% rental equipment. The other 70% declined to be itemized."] },
  { id: 'peerFile', icon: '🪞', title: 'Employment File — "The Peer Review"', sub: 'hire date: unknown. photo: a mirror.',
    body: ["NAME: (the space is blank but worn, as if written and erased many times).", "HIRE DATE: unknown. FIRST PAYCHECK: never cashed. EMERGENCY CONTACT: 'you.'",
      "The attached photo is a photocopy of a mirror. It is, technically, a photo of whoever is holding the file.", "Performance review, single line, repeated annually for thirty years: 'Meets expectations. Exactly. Unsettlingly.'"] },
  { id: 'janitorAward', icon: '🏆', title: 'Employee of the Month — ×480', sub: 'forty years. never collected.',
    body: ["WINNER, EVERY MONTH SINCE 1985: 'the janitor' (no surname on file; payroll lists him as 'THE CONSTANT').", "Plaques ordered: 480. Plaques collected: 0. Plaques location: 'basement, probably. he'd know.'",
      "HR note, 1993: 'Asked him why he never comes to the ceremony. He said the floor doesn't mop itself during ceremonies.'", "HR note, 2011: 'Stopped holding the ceremony. He noticed. He sent a card. It said KEEP GOING.'"] },
  { id: 'ropeOrder', icon: '🪢', title: 'Purchase Order — Velvet Rope', sub: 'ordered before there was a line.',
    body: ["ITEM: rope, velvet, burgundy. QTY: 1. REQUESTED BY: G. Keeper, front of house.", "JUSTIFICATION (required): 'to have one.'", "FOLLOW-UP (required): 'a line will form. lines form where ropes are. this is the whole science of ropes.'",
      "APPROVED, with a note from Purchasing: 'First sensible request all year. People need something to wait behind, or they notice what they're waiting for.'"] },
  { id: 'boardMinutes', icon: '📋', title: 'Minutes — The Board, Q3 1997', sub: 'eleven seconds, in full.',
    body: ["CALLED TO ORDER: 9:00:00 AM. AGENDA ITEM 1 (of 1): 'renew everything.'", "MOTION: renewed. DISCUSSION: none. VOTE: unanimous, by silence. ADJOURNED: 9:00:11 AM.",
      "CATERING (attached receipt): $11,000.", "A shareholder asked, in writing, what 'everything' meant. The reply, in full: 'yes.'"] },
  { id: 'diploma', icon: '🎓', title: 'Certificate of Attendance', sub: 'attendance. not achievement.',
    body: ["'CRUISE SHIP MEDICAL ACADEMY hereby certifies that D. WALRUS was PRESENT.'", "Present for what is not specified. The seal is a sticker of an anchor. The anchor is smiling.",
      "Cost of the certificate: included with cruise. Cost of the frame: $340, gilt, museum glass.", "On the back, in pencil, in careful letters: 'they clapped for me.' It is the only honest document in this building."] },
  { id: 'patientZero', icon: '🗂', title: 'Discharge Summary — Patient #0001', sub: 'the door worked fine.',
    body: ["DATE: June 1, 1974. PATIENT #0001, admitted with 'nerves,' discharged with: nothing. The nerves left on their own, the way weather does.",
      "DISPOSITION: 'walked out the front door.' The front door. The one in the waiting room. It opened. It was a door the whole time.",
      "FOLLOW-UP SCHEDULED: none. FOLLOW-UP KEPT: none. LAST KNOWN STATUS: 'fine, or close enough, which is the same thing on a Tuesday.'",
      "At the bottom, handwritten, by a nurse whose name the ink has kept safe for fifty years: 'door works fine. remember that.'"] }
];

/* ============ ITEM SYNERGIES (some prescriptions were meant for each other) ============ */
DATA.SYNERGIES = [
  { id: 'frozenthoughts', a: 'coldcompress', b: 'intrusivethought', name: 'FROZEN THOUGHTS', desc: 'the contagion now chills everyone it touches', apply(p) { p.flags.synFreeze = true; } },
  { id: 'arson',          a: 'incidentreport', b: 'papertrail',     name: 'ARSON (ALLEGED)', desc: 'ignition odds nearly double — everything is flammable if you file hard enough', apply(p) { p.flags.synArson = true; } },
  { id: 'thermalshock',   a: 'coldcompress', b: 'incidentreport',   name: 'THERMAL SHOCK', desc: 'burning a chilled patient hits +50% harder', apply(p) { p.flags.synShock = true; } },
  { id: 'fullhouse',      a: 'grouptherapy', b: 'buddy',            name: 'FULL HOUSE', desc: 'recruitment odds way up — the group practically runs itself', apply(p) { p.flags.synHouse = true; } },
  { id: 'wellrested',     a: 'pillow', b: 'melatonin',              name: 'WELL RESTED', desc: 'the floor heal doubles — sleep is medicine, confirmed twice', apply(p) { p.flags.synRested = true; } },
  { id: 'openbook',       a: 'hyperfix', b: 'radicalhonesty',       name: 'OPEN BOOK', desc: 'the truth goes through one more person', apply(p) { p._pierceAdd = (p._pierceAdd || 0) + 1; } }
];

/* ============ BOSS NEGOTIATION (at the end of the rope, some of them talk) ============ */
DATA.BOSS_DEALS = {
  gatekeeper: {
    offer: "“FINE. Fine! You clearly need this more than the rope does. Take the keys and stop hitting me.”",
    give: "+4 Referrals 🔑, and he limps off",
    apply(p, G) { p.keys += 4; }
  },
  larperking: {
    offer: "“You fight like someone who's read the SECOND article. Respect. Let me show you the grip.”",
    give: "+1 damage, permanently — he taught you something real",
    apply(p, G) { p.dmg += 1; }
  },
  adjuster: {
    offer: "“Let's settle out of court. One premium item, gratis. The adjustment will appear on your statement.”",
    give: "a free special item now — but the final bill ×1.5",
    apply(p, G) {
      const pool = DATA.pickPool('special', p.items);
      G.peds.push({ x: CW / 2, y: RY + RH / 2 + 60, itemId: U.choice(pool.length ? pool : DATA.POOLS.special), kind: 'item', taken: false });
      G._billMul = 1.5;
    }
  },
  influencer: {
    offer: "“Okay okay okay — COLLAB? I'll pin you. Take the sponsorship, use my codes, we never speak of this.”",
    give: "+8¢ and 2 GoodRx coupons",
    apply(p, G) { p.coins += 8; p.coupons = Math.min(3, (p.coupons || 0) + 2); }
  },
  priorauth: {
    offer: "“APPROVED. Pre-approved! Everything, retroactively, forever. Just — please — no more forms.”",
    give: "your next 2 Specialist doors open free, plus a pill",
    apply(p, G) { G._preApproved = 2; if (p.pill == null) p.pill = U.randi(0, 9); }
  }
};

/* ============ THE JANITOR (he's seen every ward. he's mopped every ward.) ============ */
DATA.JANITOR = {
  newguy: [
    "(checks a laminated note) “…uncle says hi.”",
    "(reading from a card) “Don't… ask where it's… been.” Sorry, his handwriting.",
    "“He said you'd know the prices. He said you'd know everything, actually.”"
  ],
  greet: [
    "Found this in the vents. Cash only.",
    "Lost and found. Emphasis on lost.",
    "Fell off a cart. The cart won't miss it.",
    "Somebody checked out in a hurry. Their loss. Literally.",
    "Don't ask where it's been. It's been in the ward. Everything has."
  ],
  again: [
    "You again.",
    "Still here? Me too. Forty years.",
    "I mopped this spot an hour ago. Look at it.",
    "You're my best customer. That's not a compliment to either of us.",
    "The walrus doesn't know I do this. The walrus doesn't know a lot of things."
  ],
  buy: [
    "Pleasure doing business. That's the only pleasure left in this building.",
    "No refunds. The concept doesn't exist down here.",
    "Spend it in good health. Ha. Sorry. Habit.",
    "I'd have charged the doctor double.",
    "That thing? Saved my marriage. Then ended it. Good luck."
  ],
  broke: [
    "Cash only, friend. The economy in here runs on copays.",
    "Come back when the floor pays YOU.",
    "I take coins, not feelings. Learned that the hard way.",
    "Nothing personal. The mop needs new heads."
  ],
  wisdom: [
    "Forty years mopping this place. The stains come back. So do the patients.",
    "The lights hum in B-flat. You get used to it. That's the problem.",
    "I've seen the basement. There's another basement.",
    "The walrus? Decent tipper. Terrible doctor.",
    "Whatever it tells you at the bottom — don't sign anything."
  ]
};

/* ============ EMOTIONAL SUPPORT ANIMALS (one equipped, like hats) ============ */
DATA.PETS = [
  { id: 'pigeon',   icon: '🕊', name: 'The Pigeon',   note: 'finds loose change; strong opinions about crumbs', unlock: m => true,                         unlockHint: 'yours by default. it chose you.' },
  { id: 'cat',      icon: '🐈', name: 'Office Cat',   note: 'swats bullets off the table. you are the table',   unlock: m => (m.contractsDone || 0) >= 3,  unlockHint: 'complete 3 Day Room contracts' },
  { id: 'snake',    icon: '🐍', name: 'The Metaphor', note: 'it bites your problems. it IS your problems',      unlock: m => (m.amaDone || 0) >= 1,        unlockHint: 'leave Against Medical Advice once' },
  { id: 'goldfish', icon: '🐟', name: 'The Goldfish', note: 'enemies near it forget what they were doing',      unlock: m => (m.appealsWon || 0) >= 1,     unlockHint: 'win an appeal' },
  { id: 'dog',      icon: '🐕', name: 'Therapy Dog',  note: 'certified. vested. extremely good.',               unlock: m => !!(m.rival && (m.rival.duelW || 0) >= 1), unlockHint: 'win one gym duel vs your rival' },
  { id: 'ferret',   icon: '🐾', name: 'The Ferret',   note: 'steals for you. legally gray, morally correct',    unlock: m => (m.pbmKills || 0) >= 3,       unlockHint: 'pop THE MIDDLEMAN three times' }
];

/* ============ THE INTERCOM (Dr. Walrus is watching. commenting, even.) ============ */
DATA.INTERCOM = {
  lowhp:   ["Code... something, in your hallway. They're fine. Probably.", "Would the patient please stop bleeding on the new floors.", "A gentle reminder that dying is billed as a procedure."],
  hoard:   ["A reminder: the gift shop accepts exact change. And donations. Mostly donations.", "Someone on this floor is hoarding copays. The Fund sees you.", "That's a lot of change. The vending machine misses you."],
  nopills: ["We've noticed you haven't taken your medication. The medication has noticed too.", "The pill in your pocket has feelings, you know.", "Pharmacy asks: is it something we said?"],
  streak:  ["Whoever keeps dodging everything: the staff finds it unsettling.", "Three clean rooms. HR has opened a file on your file.", "Please allow at least one symptom to touch you. For morale."],
  idle:    ["Loitering is a symptom.", "We see you standing there. The floor is not a waiting room. The waiting room is.", "Movement is covered by your plan. Standing still is out-of-network."],
  fast:    ["Slow down. This is billed hourly.", "Speedrunning your treatment devalues the treatment. And the billing.", "The ward requests you savor your symptoms."],
  floor3:  ["You've reached Ward 3. Your insurance has been notified. It laughed.", "Ward 3. The elevators stop pretending after this."],
  floor7:  ["Ward 7. The plants down here are plastic. The feelings are real.", "Ward 7. If you see the Auditor, you didn't."],
  floor12: ["Ward 12. Honestly? We didn't think you'd get this far. Accounting did. Accounting always knows.", "Ward 12. The walls are load-bearing. So is your denial."],
  pattern: ["Try not to let the {X} get you this time. It's becoming a pattern. We've made it a chart.", "Statistically, the {X} is your problem. Clinically too."],
  internLost: ["The intern did not make it. This will be reflected in SOMEONE'S performance review.", "We regret to announce the intern. Past tense.", "The intern's badge has been retired. It was one (1) day old."],
  internGrad: ["The intern survived three floors. HR is calling it 'a program.'", "Congratulations to the intern, who has been promoted to Slightly Less Terrified."],
  rival: ["Patient {X} has claimed another prescription. The board is keeping score. The board was ASKED not to.", "Would {X} please stop lapping the other intake. This is a ward, not a track meet.", "Reminder: recovery is not a competition. {X} has requested that it be."],
  rivalLost: ["Update: {X} did not get there first. {X} would like the record to show the floor was wet.", "A moment of silence for {X}'s undefeated season."],
  night: ["(whisper) It's the night shift. If you need anything, need it quietly.", "(whisper) The lights are off for morale. The dark is complimentary.", "(whisper) Night differential is in effect. The coins apologize for the hour."],
  inspection: ["Reminder to all patients: we have ALWAYS had a meditation garden. Point at the garden when asked.", "The Inspector is here. Nothing is wrong. Nothing has EVER been wrong. Smile with your eyes.", "For the duration of the tour, symptoms are 'wellness journeys.' The fog machine is 'ambiance.' The screaming is 'a choir.'"],
  inspectionPass: ["The Inspector has departed, five stars. Regular dysfunction resumes... now.", "Tour complete. Everyone did BEAUTIFULLY. Especially the fog."],
  inspectionBust: ["The patient has attacked the performance. The performance is now attacking back.", "Well. THAT'S going in the report."],
  firealarm: ["That was NOT a drill, because drills are SCHEDULED, and THIS was a CHOICE.", "To the patient by the alarm: the sign has three words. You read all three. You PULLED.", "The sprinklers are older than most of the staff. Nobody knew if they worked. Now everything is wet and we know."]
};

/* ============ OPEN MIC NIGHT (the Day Room has a stage now. it's a step stool.) ============ */
DATA.OPENMIC = {
  larper:    { intro: "The Larper approaches the mic with printed pages.", piece: "“this poem is called 'per my last source.' — they said i wasn't sick. / i said you're not LISTENING. / stanza two is louder.”" },
  scroller:  { intro: "A Doomscroller reads from their drafts folder.", piece: "“unsent reply, march: 'actually—' / unsent reply, april: 'ACTUALLY—' / i am working on it. this is the work.”" },
  doubt:     { intro: "Doubt does crowd work, badly.", piece: "“is this thing on? is ANYTHING on? are you sure? how would you know, though. how would you KNOW.”" },
  deadline:  { intro: "A Deadline performs spoken word at double speed.", piece: "“duebytuesdaywhichtuesday THE tuesday — okay wow, time. time, everybody. give it up for time.”" },
  ad:        { intro: "A Pharma Ad does a tight five about itself.", piece: "“ask your doctor if listening to me is right for you. side effects include: hearing the rest of this.”" },
  gaslighter:{ intro: "The Gaslighter performs 'a memoir.'", piece: "“chapter one: that never happened. chapter two: you loved it. chapter three: i wasn't even there, and neither were you.”" },
  waitingnum:{ intro: "Now Serving hums its only note.", piece: "“…now serving number nine. number nine? nine. (softly) it was never about the numbers.”" },
  generic:   { intro: "A patient takes the step stool with tremendous courage.", piece: "“i wrote this in the elevator. it's called 'B-anything.' — going down is still going. thank you.”" }
};

/* ============ INSURANCE PLANS (pick your coverage at intake) ============ */
DATA.PLANS = [
  { id: 'bronze', icon: '🥉', name: 'BRONZE', tag: 'Catastrophic-Only', clr: '#c88a4a',
    desc: 'Cash up front. Everything else is out-of-pocket.',
    lines: ['start with +15¢', 'all copays ×1.5', 'boss rewards cost 6¢'] },
  { id: 'silver', icon: '🥈', name: 'SILVER', tag: 'The Marketplace Special', clr: '#a8b0b8',
    desc: 'The plan everyone has. The plan nobody chose.',
    lines: ['standard coverage', 'standard copays', 'standard despair'] },
  { id: 'gold',   icon: '🥇', name: 'GOLD', tag: 'Executive Wellness', clr: '#e0c040',
    desc: 'Premium care. The premium is your body.',
    lines: ['−1 heart container up front', 'all copays ×0.6', '+1 unlocked pharmacy room per floor'] }
];

/* ============ DAY ROOM CONTRACTS (the other patients need things) ============ */
DATA.CONTRACTS = [
  { id: 'kills20',   name: 'Group Project',    desc: 'manage 20 symptoms',            ev: 'kill',      n: 20, reward: 'coins',   rtext: '+9¢' },
  { id: 'pills2',    name: 'Taste Tester',     desc: 'swallow 2 pills',               ev: 'pill',      n: 2,  reward: 'hearts',  rtext: 'full heal' },
  { id: 'clean2',    name: 'Look Untouchable', desc: 'clear 2 rooms without a hit',   ev: 'cleanroom', n: 2,  reward: 'item',    rtext: 'a prescription' },
  { id: 'rooms6',    name: 'Do My Rounds',     desc: 'clear 6 rooms',                 ev: 'room',      n: 6,  reward: 'trinket', rtext: 'a personal effect' },
  { id: 'miniboss',  name: 'Office Politics',  desc: 'clear a Clinic miniboss',       ev: 'miniboss',  n: 1,  reward: 'insight', rtext: '+◆8' },
  { id: 'secret1',   name: 'I Hear Walls',     desc: 'find a secret room',            ev: 'secret',    n: 1,  reward: 'coins',   rtext: '+12¢' },
  { id: 'bombs2',    name: 'Demolition Notes', desc: 'file 2 claim forms (bombs)',    ev: 'bomb',      n: 2,  reward: 'hearts',  rtext: '+1 heart container' },
  { id: 'boss1',     name: 'Speak To A Manager', desc: 'defeat the ward boss',       ev: 'boss',      n: 1,  reward: 'fund',    rtext: '+20¢ to the Fund, in YOUR name' }
];

/* ============ THE CAFETERIA (the tray line) ============ */
DATA.TRAYS = [
  { id: 'jello',   name: 'the jello',          desc: 'it is always here. it is always red.', apply(p) { p.heal(2); p.luck += 0.5; } },
  { id: 'mystery', name: 'salisbury something', desc: '+0.5 damage. do not ask what it was.', apply(p) { p.dmg += 0.5; } },
  { id: 'soup',    name: 'broth, allegedly',    desc: 'warm. +1 heart container.', apply(p) { p.maxhp += 2; p.hp += 2; } },
  { id: 'salad',   name: 'the wellness salad',  desc: '+8% speed. mostly water weight.', apply(p) { p.spd *= 1.08; } },
  { id: 'fish',    name: 'fish on a friday',    desc: '+15% range. omega somethings.', apply(p) { p.range *= 1.15; } },
  { id: 'coffee',  name: 'urn coffee',          desc: '+10% fire rate, +wobble. it has been on since 1987.', apply(p) { p.tearDelay *= 0.9; p.wobble += 0.04; } },
  { id: 'toast',   name: 'toast, unbuttered',   desc: '+4 copays. somebody left them under it.', apply(p) { p.coins += 4; } },
  { id: 'taco',    name: 'THE TACO (Tuesdays)', desc: '+0.8 damage. it is Tuesday somewhere. here.', apply(p) { p.dmg += 0.8; } }
];
DATA.LUNCHLADY = [
  "Take a tray. The trays don't judge. I do, but the trays don't.",
  "The jello is load-bearing. Take it or don't, it'll outlive us.",
  "Hot food on the left, opinions on the right.",
  "You look like the soup type. No offense meant. Some taken, probably.",
  "Second helpings are a myth. Like discharge."
];

/* ============ THE DRUG REP (free samples, with strings) ============ */
DATA.SAMPLE_FX = [
  { id: 'tremors',  name: 'hand tremors',        apply: (p) => { p.wobble += 0.055; } },
  { id: 'drowsy',   name: 'drowsiness',          apply: (p) => { p.spd *= 0.94; } },
  { id: 'brainzap', name: 'brain zaps',          apply: (p) => { p.tearDelay *= 1.07; } },
  { id: 'thin',     name: 'lowered resistance',  apply: (p) => { p.maxhp = Math.max(2, p.maxhp - 1); p.hp = Math.min(p.hp, p.maxhp); } },
  { id: 'doom',     name: 'a vague sense of doom', apply: (p) => { p.luck -= 0.6; } },
  { id: 'appetite', name: 'delayed reactions',   apply: (p) => { p.shotSpd *= 0.9; } },
  { id: 'fog',      name: 'mild dissociation',   apply: (p) => { p.range *= 0.9; } },
  { id: 'jitters',  name: 'the jitters',         apply: (p) => { p.wobble += 0.03; p.spd *= 1.03; } }
];

/* ============ THE CLINICAL TRIAL (experimental compound, double-blind) ============
   Enroll via the Drug Rep. 3 hidden effects (2 benefits + 1 from SAMPLE_FX),
   revealed one per descent; the debrief 3 floors in pays out and unblinds.
   35% of enrollments receive the placebo. The placebo also gets paid. */
DATA.TRIAL_FX = [
  { id: 'tdmg',    name: '+22% damage',            apply: p => { p.dmg *= 1.22; } },
  { id: 'ttears',  name: '+15% fire rate',         apply: p => { p.tearDelay *= 0.85; } },
  { id: 'tspd',    name: '+12% movement',          apply: p => { p.spd *= 1.12; } },
  { id: 'thp',     name: '+1 heart',               apply: p => { p.maxhp += 2; p.hp += 2; } },
  { id: 'trange',  name: '+18% range',             apply: p => { p.range *= 1.18; } },
  { id: 'tshot',   name: '+15% shot speed',        apply: p => { p.shotSpd *= 1.15; } },
  { id: 'tluck',   name: '+1.5 luck',              apply: p => { p.luck += 1.5; } },
  { id: 'tsteady', name: 'steadier hands',         apply: p => { p.wobble = Math.max(0, p.wobble - 0.07); } }
];

/* ============ WHEEL OF APPEALS (spin to overturn) ============ */
DATA.SAMPLE_UNDO = {
  tremors: p => { p.wobble = Math.max(0, p.wobble - 0.055); },
  drowsy: p => { p.spd /= 0.94; },
  brainzap: p => { p.tearDelay /= 1.07; },
  thin: p => { p.maxhp += 1; p.hp += 1; },
  doom: p => { p.luck += 0.6; },
  appetite: p => { p.shotSpd /= 0.9; },
  fog: p => { p.range /= 0.9; },
  jitters: p => { p.wobble = Math.max(0, p.wobble - 0.03); p.spd /= 1.03; }
};

/* ============ FACILITY IMPROVEMENTS (the Wellness Fund) ============
   Leftover run coins are "donated" on discharge. Spend the fund on the
   Waiting Room itself — visible furniture, each with a small standing perk. */
DATA.FACILITY = [
  { id: 'plants',   icon: '🪴', name: 'More Plants',     cost: 60,  desc: 'It really opens the room up.', perk: 'shops 5% off',            apply: (p, G) => { p._facShopMul = 0.95; } },
  { id: 'coffee',   icon: '☕', name: 'Coffee Machine',   cost: 90,  desc: 'Decaf. Nobody was consulted.', perk: 'start with +1 key',        apply: (p) => { p.keys++; } },
  { id: 'cooler',   icon: '💧', name: 'New Water Cooler', cost: 110, desc: 'The old one gurgled ominously.', perk: 'coolers heal +1 extra',  apply: (p) => { p.flags.bigCooler = true; } },
  { id: 'aquarium', icon: '🐠', name: 'Aquarium',        cost: 150, desc: 'The fish have seen things.',   perk: '+0.5 luck on every run',   apply: (p) => { p.luck += 0.5; } },
  { id: 'tv',       icon: '📺', name: 'Wall Television',  cost: 130, desc: 'Stuck on the weather channel.', perk: 'start with +1 bomb',      apply: (p) => { p.bombs++; } },
  { id: 'toybox',   icon: '🧸', name: 'Toy Corner',      cost: 260, desc: 'For "the children."',           perk: 'start with a plush walrus', apply: (p) => { p.familiars.push(new Familiar('plush')); } }
];

/* ============ PATIENT CHART (codex) flavor ============
   Satirical clinical notes — aimed at the over-labeling machine, not people. */
DATA.CODEX_CHART = {
  enemies: {
    scroller: "Chronically online. Prognosis: one more scroll.",
    notif: "Demands your attention. Refuses to be marked as read.",
    secondop: "Disagrees with the first opinion on principle. Wound it and it produces a colleague who disagrees with IT.",
    waitlist: "Not hostile, exactly. It just keeps adding names ahead of yours. The tickets it prints are, though.",
    premium: "Cannot be harmed until it has billed you. One touch, one copay, and suddenly it's mortal like the rest of us.",
    placebo: "Looks devastating. Glows like a champion. Dies to literally anything. The confetti is real, though.",
    rival: "Checked in the same day as you. Files identical, minute-for-minute. One of you is thriving, and they have opinions about which. Fights like your mirror with a grudge.",
    recordsguard: "Junior auditors on stack patrol. Paid hourly to sweep a flashlight. Genuinely startled every time it finds someone.",
    nightnurse: "Only works nights. Glides. Doesn't run — has never needed to. Occasionally turns the lights off 'for morale' and closes the distance in the dark.",
    larper: "Read one (1) article. Now an expert. Sincerity: guarded.",
    ad: "Ask your doctor if being a walking commercial is right for you.",
    doubt: "Are you SURE it's real? It isn't sure either.",
    deadline: "Was due yesterday. Charges without warning.",
    intrusive: "Arrives uninvited. Means nothing by it, allegedly.",
    redflag: "Everyone saw it coming except you. Detonates on contact.",
    fog: "Where were we? Slows everything, thoughts included.",
    enabler: "Insists everyone is SO valid. Heals its friends to prove it.",
    sideeffect: "May cause: more of itself. Multiplies when disturbed.",
    form: "Please complete all fields. Then, if approved, complete them again.",
    gaslighter: "You're imagining it. It was never there. (It was there.)",
    projection: "It's not doing anything. YOU'RE doing something. Mirrors your every move.",
    copaycollector: "Runs up, takes its share, runs off. In-network, allegedly.",
    wellnessbot: "Beep boop, have you tried yoga? Shields its friends from your progress.",
    spiral: "It starts wide and gets closer. It always gets closer.",
    comparison: "Everyone's doing better than you. The healthier you look, the harder it tries.",
    waitingnum: "NOW SERVING #47. You are #112. When the counter hits zero, everyone loses it.",
    auditor: "It found a discrepancy. It follows you room to room until the books balance. The books are you.",
    middleman: "The Pharmacy Benefits Manager. Adds 40% to every price on the floor and cannot explain what he does. Runs when seen. Has vents. Pop him and watch the prices exhale.",
    goose: "Not a symptom. Not a patient. Not billed. It takes exactly one of your things and it honks. Catching it is an achievement in the technical sense and the clinical one.",
    collector: "The financing plan, personified. He doesn't fight — he FOLLOWS, and every floor you still owe, he comes back bigger. Killing him does nothing. The DEBT is the monster.",
    chargenurse: "Runs the floor. Sees everything. If you're moving, you're a problem — and she solves problems.",
    resident: "Thirty hours into the shift, doing an impression of every boss he's ever seen. Badly.",
    orderly: "Not angry. Not fast. Just always, always closer than he was."
  },
  bosses: {
    merger: "Two managements stitched into one org chart. Fights entirely with acquired attacks — nothing about it is original, including the smile. The stock ticks down as you object.",
    gatekeeper: "Guards the diagnosis you already have. You don't LOOK sick enough.",
    adjuster: "Reviews your suffering for billing errors. Finds them.",
    larperking: "Wears every diagnosis at once. Owns the group chat.",
    withdrawal: "The refill that never comes. Shakes the whole room.",
    stigma: "The look you get. Fights best in the dark, where no one sees.",
    burnout: "A candle lit at both ends and handed a third end.",
    dsm: "The book that has a name for you. All of them, actually.",
    priorauth: "Your treatment is denied pending paperwork. Fill the forms to be seen.",
    algorithm: "Learns how you move and serves you more of it. Engagement is the only cure it knows.",
    influencer: "Healed, and monetizing it. The crystals are load-bearing. The discount code is not.",
    thecure: "What everyone's chasing. Turns out it was the friends we diagnosed along the way.",
    founder: "The man who turned every feeling into a market. Waits at the very top of the ladder — Ward 50.",
    thesystem: "Not a person. All of it at once — the denials, the pharmacy, the feed. Ward 100. The last argument.",
    theboard: "Three suits, one table, zero patients seen. Waits at the top of the elevator, voting on you.",
    peerreview: "Requested your full file 'for methodology reasons.' Now it moves like you, shoots like you, and cites you against yourself. The healthier you look, the harder it argues.",
    deductible: "Every hit you land gets billed against the meter instead of hurting it. Meet the deductible and it becomes suddenly, satisfyingly mortal. The meter resets every plan year. The fight is the plan year.",
    abtest: "Half the room runs the old protocol, half runs the experimental one, and it swaps them the moment you adapt. The results will be published. You will not be cited.",
    thehold: "The phone tree, grown to full height. It announces the menu; you stand on the number or you get the consequences. Its options changed recently. They always have.",
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
  insomnia:   { name: "Power Nap", cd: 13, blurb: "Steal forty winks: refill Sleep, heal, and phase out untouchable — but you can't move or fire while you're out." },
  fine:       { name: "Denial", cd: 11, blurb: "\"I'm FINE.\" Briefly refuse to take damage." },
  burnout:    { name: "Clock Out", cd: 9, blurb: "Boundaries, suddenly. The Battery refills to full and nothing can touch you for a breath." },
  janitor:    { name: "Mop Bucket", cd: 11, blurb: "Dunk and slosh: a wave of wet floor rolls out, washing nearby shots away and slowing everything it touches." },
  graduate:   { name: "Pep Talk", cd: 10, blurb: "The thing you told them, back: heal half a heart and sprint like the third floor is watching." },
  seasonal:   { name: "Turn The Page", cd: 13, blurb: "Advance the season NOW — with a burst of the new one's weather." }
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

/* ============ THE SUPPORT GROUP (recruitable AI party allies) ============
   Fellow patients who follow you the whole run, each fighting in a diagnosis-
   flavored way. Stored on p.allies (cap 3). `kind` drives the fire pattern in
   the Ally class; downed allies revive when you clear a room. */
DATA.ALLIES = [
  { id: 'vet',      name: "The Veteran",      diag: "PTSD",     tint: '#c25a52', kind: 'heavy',    blurb: "Slow, heavy covering fire." },
  { id: 'worrier',  name: "The Worrier",      diag: "Anxiety",  tint: '#43b8a5', kind: 'anxious',  blurb: "Rapid, scattered nerves." },
  { id: 'firework', name: "The Firecracker",  diag: "Bipolar",  tint: '#b86bff', kind: 'manic',    blurb: "Manic bursts of three." },
  { id: 'watcher',  name: "The Watcher",      diag: "Schizo.",  tint: '#ff7a9e', kind: 'paranoid', blurb: "Homing suspicion — never misses for long." },
  { id: 'checker',  name: "The Perfectionist",diag: "OCD",      tint: '#6c7ff0', kind: 'precise',  blurb: "Symmetric twin shots." },
  { id: 'sponsor',  name: "The Sponsor",      diag: "in recovery", tint: '#8fd05a', kind: 'basic', blurb: "Steady, dependable fire." },
  { id: 'intern',   name: "The Graduate",     diag: "made it",  tint: '#e8c05a', kind: 'manic',    blurb: "Your old intern. Fights like they have something to prove.", locked: true }
];

/* ============ THE TREATMENT PLAN (between-run skill tree) ============
   Earn ◆ Insight per run (recordRun); spend it on a permanent therapy-modality
   talent tree. Applied at run start by G.applyTalents(). Progress in Meta. */
DATA.TALENT_BRANCHES = [
  { id: 'cbt',   name: 'CBT',   icon: '🧠', blurb: 'Cognitive Behavioral — sharpen your output.' },
  { id: 'dbt',   name: 'DBT',   icon: '🛡', blurb: 'Dialectical Behavior — endure more.' },
  { id: 'emdr',  name: 'EMDR',  icon: '💨', blurb: 'Reprocessing — move & recover faster.' },
  { id: 'meds',  name: 'Meds',  icon: '💊', blurb: 'Medication Management — economy & pills.' },
  { id: 'group', name: 'Group', icon: '🤝', blurb: 'Group Work — a stronger Support Group.' },
  { id: 'ot',    name: 'OT',    icon: '🧰', blurb: 'Occupational Therapy — tools, routine, tips.' }
];
DATA.TALENTS = [
  // CBT — damage
  { id: 'cbt1', branch: 'cbt', tier: 1, name: 'Thought Records', desc: '+0.7 damage.', cost: 4, req: null, apply(p) { p.dmg += 0.7; } },
  { id: 'cbt2', branch: 'cbt', tier: 2, name: 'Cognitive Restructuring', desc: '+0.9 damage.', cost: 8, req: 'cbt1', apply(p) { p.dmg += 0.9; } },
  { id: 'cbt3', branch: 'cbt', tier: 3, name: 'Core Beliefs', desc: '+1.2 damage; tears fly 12% faster.', cost: 14, req: 'cbt2', apply(p) { p.dmg += 1.2; p.shotSpd *= 1.12; } },
  { id: 'cbt4', branch: 'cbt', tier: 4, name: 'Schema Work', desc: 'CAPSTONE: +15% damage and +10% fire rate — the whole framework, internalized.', cost: 30, req: 'cbt3', apply(p) { p.dmg *= 1.15; p.tearDelay *= 0.9; } },
  // DBT — survivability
  { id: 'dbt1', branch: 'dbt', tier: 1, name: 'Distress Tolerance', desc: '+1 heart.', cost: 4, req: null, apply(p) { p.maxhp += 2; p.hp += 2; } },
  { id: 'dbt2', branch: 'dbt', tier: 2, name: 'Grounding Skills', desc: 'Noticeably longer i-frames after a hit.', cost: 8, req: 'dbt1', apply(p) { p.iframeTime += 0.3; } },
  { id: 'dbt3', branch: 'dbt', tier: 3, name: 'Radical Acceptance', desc: '+2 hearts.', cost: 14, req: 'dbt2', apply(p) { p.maxhp += 4; p.hp += 4; } },
  { id: 'dbt4', branch: 'dbt', tier: 4, name: 'Wise Mind', desc: 'CAPSTONE: +1 heart, and once per floor a killing blow leaves you standing at half a heart.', cost: 30, req: 'dbt3', apply(p) { p.maxhp += 2; p.hp += 2; p.flags.wiseMind = true; } },
  // EMDR — mobility
  { id: 'emdr1', branch: 'emdr', tier: 1, name: 'Bilateral Stimulation', desc: '+10% move speed.', cost: 4, req: null, apply(p) { p.spd *= 1.10; } },
  { id: 'emdr2', branch: 'emdr', tier: 2, name: 'Rapid Processing', desc: 'Your PRN ability recharges 20% faster.', cost: 8, req: 'emdr1', apply(p) { p.abilMax *= 0.8; p.abilCd = Math.min(p.abilCd, p.abilMax); } },
  { id: 'emdr3', branch: 'emdr', tier: 3, name: 'Reprocessing', desc: '+10% speed; start each floor with a breath of i-frames.', cost: 14, req: 'emdr2', apply(p) { p.spd *= 1.10; p.flags.floorGrace = true; } },
  { id: 'emdr4', branch: 'emdr', tier: 4, name: 'Dual Attention', desc: 'CAPSTONE: using your PRN grants 1.5s of untouchable follow-through.', cost: 30, req: 'emdr3', apply(p) { p.flags.prnGrace = true; } },
  // Meds — economy / pills
  { id: 'meds1', branch: 'meds', tier: 1, name: 'Formulary Access', desc: '+5 copays & +1 luck.', cost: 4, req: null, apply(p) { p.coins += 5; p.luck += 1; } },
  { id: 'meds2', branch: 'meds', tier: 2, name: 'Titration', desc: '+8% fire rate.', cost: 8, req: 'meds1', apply(p) { p.tearDelay *= 0.92; } },
  { id: 'meds3', branch: 'meds', tier: 3, name: 'Maintenance Dose', desc: 'Start with an identified pill in your pocket.', cost: 14, req: 'meds2', apply(p) { if (p.pill == null) p.pill = U.randi(0, 9); p.flags.pillsKnown = true; } },
  { id: 'meds4', branch: 'meds', tier: 4, name: 'Preferred Formulary', desc: 'CAPSTONE: pharmacy prices −15% and +1 luck. The system finally works for you, slightly.', cost: 30, req: 'meds3', apply(p) { p._facShopMul = (p._facShopMul || 1) * 0.85; p.luck += 1; } },
  // Group — allies
  { id: 'grp1', branch: 'group', tier: 1, name: 'Peer Support', desc: 'Begin each run with a Support Group ally.', cost: 5, req: null, apply(p, G) { p.recruitAlly(G); } },
  { id: 'grp2', branch: 'group', tier: 2, name: 'Facilitator', desc: 'Allies are tougher and hit harder.', cost: 9, req: 'grp1', apply(p) { p.flags.allyTough = true; } },
  { id: 'grp3', branch: 'group', tier: 3, name: 'Full Circle', desc: 'Begin each run with a second ally.', cost: 16, req: 'grp2', apply(p, G) { p.recruitAlly(G); } },
  { id: 'grp4', branch: 'group', tier: 4, name: 'Group Cohesion', desc: 'CAPSTONE: when a room clears, your group sometimes patches you up (+½♥, 35%).', cost: 32, req: 'grp3', apply(p) { p.flags.allyCare = true; } },
  // OT — tools & routine
  { id: 'ot1', branch: 'ot', tier: 1, name: 'Structured Day', desc: 'Start with +1 Referral 🔑 and +1 Claim Form 📄.', cost: 4, req: null, apply(p) { p.keys += 1; p.bombs += 1; } },
  { id: 'ot2', branch: 'ot', tier: 2, name: 'Coping Toolkit', desc: 'Start each run holding a random Personal Effect (trinket).', cost: 8, req: 'ot1', apply(p) { const t = U.choice(DATA.TRINKETS.filter(x => x.id !== 'masterkey')); p.trinket = t.id; } },
  { id: 'ot3', branch: 'ot', tier: 3, name: 'Daily Routine', desc: 'Cleared rooms tip noticeably more often.', cost: 14, req: 'ot2', apply(p) { p.flags.otRoutine = true; } },
  { id: 'ot4', branch: 'ot', tier: 4, name: 'Mastery Project', desc: 'CAPSTONE: start every run with a prescription off the good shelf.', cost: 30, req: 'ot3', apply(p) { const pool = DATA.POOLS.special; p.addItem(U.choice(pool), null, true); } }
];

/* ============ MINI-EVENTS (non-combat choice rooms) ============ */
DATA.EVENTS = [
  {
    name: "Visiting Hours", prompt: "The front desk says you have visitors. Plural. You get to pick who comes back.",
    choices: [
      { label: "Your family — and you tell them the truth", note: "+1 heart · they carry a worry out with them", apply(p) { p.maxhp += 2; p.hp += 2; } },
      { label: "Your family — and you say you're fine", note: "+0.8 damage, −1 luck · something to prove now", apply(p) { p.dmg += 0.8; p.luck -= 1; } },
      { label: "Your sponsor, with the chip", note: "full heal · a steadier hand after hits", apply(p) { p.heal(99); p.iframeTime += 0.12; } },
      { label: "An old friend smuggling snacks", note: "+6 copays, a pill, and half a heart", apply(p) { p.coins += 6; if (p.pill == null) p.pill = U.randi(0, 9); p.heal(1); } }
    ]
  },
  {
    name: "Support Group", prompt: "A circle of folding chairs. They actually want to listen.",
    choices: [
      { label: "Share honestly", note: "heal 1 heart + a little luck", apply(p) { p.heal(2); p.luck += 1; } },
      { label: "Just listen", note: "+0.4 damage (you learned something)", apply(p) { p.dmg += 0.4; } },
      { label: "Slip out early", note: "nothing ventured", apply() { } }
    ]
  },
  {
    name: "3 A.M. Self-Diagnosis", prompt: "The search bar glows. You've already typed \"my symptoms\". It's never good news.",
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

/* ============ CHAMPION BOSSES (deep-ward affixes) ============
   Past Ward 8 a rotation boss can spawn as a champion. */
DATA.BOSS_AFFIXES = [
  { id: 'armored',  name: "ARMORED",  tint: '#9aa8b8', note: "periodically refuses to be hit" },
  { id: 'swift',    name: "SWIFT",    tint: '#e8c84c', note: "everything comes faster" },
  { id: 'feverish', name: "FEVERISH", tint: '#e07830', note: "burns where it walks" },
  { id: 'cloned',   name: "CLONED",   tint: '#b86bff', note: "its echo attacks too" },
  { id: 'terminal', name: "TERMINAL", tint: '#e05a5a', note: "desperate from the halfway mark" }
];

/* ============ ACHIEVEMENT HATS (cosmetics) ============
   Earned by achievements, picked in Settings, worn everywhere. */
DATA.HATS = [
  { id: 'partyhat', name: "Party Hat",        ach: 'allDiag',      hint: "play all nine diagnoses" },
  { id: 'plushhat', name: "Tiny Walrus",      ach: 'walrus3',      hint: "beat Dr. Walrus three times" },
  { id: 'halo',     name: "Halo (Allegedly)", ach: 'cured',        hint: "reach THE CURE" },
  { id: 'crown',    name: "Founder's Crown",  ach: 'founderDown',  hint: "topple THE FOUNDER" },
  { id: 'gradcap',  name: "Graduation Cap",   ach: 'therapyGrad',  hint: "master a therapy branch" },
  { id: 'hardhat',  name: "Hard Hat",         ach: 'crisisPro',    hint: "survive 3 CODE GRAYs" },
  { id: 'visor',    name: "Auditor's Visor",  ach: 'auditClean',   hint: "put down THE AUDITOR" },
  { id: 'ticket',   name: "Ticket Stub",      ach: 'protocolFive', hint: "complete 5 Protocols" },
  { id: 'paperhat', name: "Folded Paper Hat", ach: 'stairMaster',  hint: "three clean stairwell descents" }
];

/* ============ AWARENESS MONTHS (the building observes the real calendar, loudly) ============
   Applied at run start from the actual month. Small, always slightly self-serving. */
DATA.MONTHS = [
  { name: 'NEW YEAR NEW YOU INITIATIVE', tag: 'January',  desc: 'the posters are fresh and so, briefly, are you — +0.3 damage', apply(p) { p.dmg += 0.3; } },
  { name: 'HEART HEALTH MONTH',          tag: 'February', desc: 'cardiology sponsors the lobby — +1 heart container',           apply(p) { p.maxhp += 2; p.hp += 2; } },
  { name: 'SLEEP AWARENESS MONTH',       tag: 'March',    desc: 'rest is medicine (billable) — PRN abilities recharge 10% faster', apply(p) { p.abilMax *= 0.9; } },
  { name: 'STRESS AWARENESS MONTH',      tag: 'April',    desc: 'a breathing poster appears — slightly longer i-frames',        apply(p) { p.iframeTime += 0.15; } },
  { name: 'MENTAL HEALTH AWARENESS MONTH', tag: 'May',    desc: 'the building CARES, visibly, all month — +1 luck and +5¢',     apply(p) { p.luck += 1; p.coins += 5; } },
  { name: 'EMPLOYEE WELLNESS MONTH',     tag: 'June',     desc: 'the coolers got serviced — water coolers heal +1 extra',       apply(p) { p.flags.monthCooler = true; } },
  { name: 'HYDRATION AWARENESS MONTH',   tag: 'July',     desc: 'there are cucumber slices in the water — +5% speed',           apply(p) { p.spd *= 1.05; } },
  { name: 'BACK-TO-SCHOOL DRIVE',        tag: 'August',   desc: 'donated supplies — start with +1 Claim Form',                  apply(p) { p.bombs += 1; } },
  { name: 'SELF-CARE SEPTEMBER',         tag: 'September', desc: 'the building endorses baths — heal a half-heart at each new ward', apply(p) { p.flags.monthHeal = true; } },
  { name: 'AWARENESS AWARENESS MONTH',   tag: 'October',  desc: 'this month we raise awareness of the other months — +1 luck',  apply(p) { p.luck += 1; } },
  { name: 'GRATITUDE MONTH',             tag: 'November', desc: 'the staff are thankful, contractually — +5¢',                  apply(p) { p.coins += 5; } },
  { name: 'OPEN ENROLLMENT SEASON',      tag: 'December', desc: 'everything must go (up) — pharmacy prices −10%',               apply(p) { p._facShopMul = (p._facShopMul || 1) * 0.9; } }
];

/* ============ THE WARD CALENDAR (the building runs on a real week) ============ */
DATA.CALENDAR = {
  1: { id: 'monday',    icon: '📣', name: 'Motivational Monday', desc: 'the posters are working — +0.3 damage, whether you like it or not' },
  2: { id: 'tuesday',   icon: '🍮', name: 'Pudding Tuesday',     desc: 'the Day Rooms serve pudding — water coolers heal +1 extra' },
  3: { id: 'wednesday', icon: '📄', name: 'Paperwork Wednesday', desc: 'start with +2 claim forms; cleared rooms shed extra forms' },
  4: { id: 'thursday',  icon: '💰', name: 'Payday Thursday',     desc: 'the building is briefly liquid — rooms tip better' },
  5: { id: 'friday',    icon: '🎩', name: 'CASUAL FRIDAY',       desc: 'everything is wearing a hat. everything.' },
  6: { id: 'saturday',  icon: '📺', name: 'Rerun Saturday',      desc: 'the good shows are on — +1 luck, the whole building relaxes' },
  0: { id: 'sunday',    icon: '🕊', name: 'Quiet Sunday',        desc: 'short-staffed on purpose — fewer patients per room' }
};

/* ============ WWRD — WARD RADIO (the jukebox; DJ Walrus between tracks) ============ */
DATA.RADIO_TRACKS = [
  { mode: 'menu',      name: 'Intake (Lobby Mix)',        sub: 'the hold music that holds you' },
  { mode: 'dayroom',   name: 'Decaf Sunrise',             sub: 'the one calm corner, in C major' },
  { mode: 'run',       name: 'Fluorescent Shuffle',       sub: 'the wards, walking tempo' },
  { mode: 'boss',      name: 'Management Is Coming',      sub: 'you will feel this in your copay' },
  { mode: 'superboss', name: 'The C-Suite',               sub: 'dread, orchestrated quarterly' },
  { mode: 'cutscene',  name: 'Chart Notes (Ballad)',      sub: 'for reading your own file to' },
  { mode: 'ward13',    name: 'The Thirteenth (Candlelit)', sub: 'sixty beats per minute. a bell.' },
  { mode: 'basement',  name: 'Forty Years (Tape Warble)', sub: 'the janitor\'s side A' },
  { mode: 'overtime',  name: 'Time And A Half',           sub: '160bpm. the floor never closes.' }
];
DATA.RADIO_DJ = [
  "You're listening to WWRD — all ward, all day. The weather in here is fluorescent.",
  "That was for the patient in bay 6, from the patient in bay 6.",
  "WWRD, where the hits keep coming and so does the billing.",
  "Requests go in the complaint box. The complaint box goes in the incinerator. The music plays on.",
  "Up next: the sound of the building settling. It's been settling since 1974. WWRD."
];

/* ============ PERSONAL EFFECTS (trinkets) ============
   Small held charms — one slot, swap freely by walking over another.
   Effects are checked at their sites via p.trinket === id. */
DATA.TRINKETS = [
  { id: 'luckypen',    name: "Lucky Pen",          icon: '🖊', desc: "The one that signed something good, once. 10% of your tears hit twice as hard." },
  { id: 'expiredcoupon', name: "Expired Coupon",   icon: '🎫', desc: "They never check the date. Pharmacy shelf prices −30%." },
  { id: 'stressball',  name: "Stress Ball",        icon: '🟡', desc: "Squeezed on impact — getting hit wipes the bullets around you." },
  { id: 'rosary',      name: "Grandma's Rosary",   icon: '📿', desc: "Once per floor, a killing blow leaves you at half a heart instead." },
  { id: 'fidgetcube',  name: "Fidget Cube",        icon: '🎲', desc: "Something to do with your hands. Your PRN ability recharges 25% faster." },
  { id: 'stickynote',  name: "Sticky Note",        icon: '🗒', desc: "\"blue = good??\" — pills are identified while you hold this." },
  { id: 'hallpass',    name: "Hall Pass",          icon: '🪪', desc: "You're allowed to be here. +10% speed in rooms you've already cleared." },
  { id: 'paperclip',   name: "Paperclip Chain",    icon: '📎', desc: "Holds your claims together — Claim Forms explode 35% bigger." },
  { id: 'wristband',   name: "Visitor Wristband",  icon: '🎗', desc: "Practically staff. Commissary machines charge you 1¢ less." },
  { id: 'thermometer', name: "Glass Thermometer",  icon: '🌡', desc: "You can just… tell. Enemy health bars are visible." },
  { id: 'earplugs',    name: "Foam Earplugs",      icon: '🔇', desc: "The noise sorts itself out. Hallucinations shimmer — you can tell what's real." },
  { id: 'batteredwatch', name: "Battered Watch",   icon: '⌚', desc: "It runs slow, and so does everything else — slow-motion moments last twice as long." },
  { id: 'laminatedcard', name: "Laminated Card",   icon: '💳', desc: "An insurance card so pristine they just… believe it. Shop meds −15%, and the Copay Collector can't touch your change." },
  { id: 'spareglasses', name: "Spare Readers",     icon: '👓', desc: "From the lost & found. +15% range, and picked-up pills identify themselves 40% of the time." },
  { id: 'masterkey',   name: "The Master Key",     icon: '🗝', desc: "The Janitor had a copy all along. Locked treatment rooms open free. Only found on the Thirteenth Ward." },
  { id: 'worrystone',  name: "Worry Stone",        icon: '🪨', desc: "Thumb-polished by four decades of waiting rooms. Noticeably longer i-frames after a hit." },
  { id: 'expiredmints', name: "Expired Mints",     icon: '🍬', desc: "From the bottom of a donated purse. +0.3 damage — your breath is now technically a symptom." }
];

/* ============ CHALLENGE PROTOCOLS (curated rule-set runs) ============
   Ten pre-built ways to make it worse. Completing one (beat the Ward-5
   boss) pays +25 ◆ Insight and is tracked in Meta.protocolsDone. */
DATA.PROTOCOLS = [
  { id: 'waitingroom', name: "The Waiting Room", icon: '🪑', desc: "One heart. No healing. Ever. Sit with it." },
  { id: 'wordsalad',   name: "Word Salad",       icon: '🥗', desc: "No choosing your meds — rooms may dispense a random prescription when cleared." },
  { id: 'nightshift',  name: "Night Shift",      icon: '🌙', desc: "The lights never come on. Any of them. On any floor." },
  { id: 'understaffed', name: "Understaffed",    icon: '🩺', desc: "Nobody's minding the wards — a straight shot from boss to boss." },
  { id: 'litigious',   name: "Litigious",        icon: '📄', desc: "Everything that goes down drops paperwork. You may as well file it." },
  { id: 'maximumdose', name: "Maximum Dose",     icon: '💊', desc: "A pill after every room. The only way out is through the pharmacy." },
  { id: 'timeslot',    name: "The 20-Minute Slot", icon: '⏰', desc: "Your appointment ends in 20 minutes. Then you are discharged. Permanently." },
  { id: 'allelites',   name: "Grand Rounds",     icon: '👑', desc: "Every patient on every floor is a champion. Attendance is mandatory." },
  { id: 'deductible',  name: "High Deductible",  icon: '💳', desc: "Nothing is free. 'Free' meds bill you 10¢ and every copay is doubled." },
  { id: 'infection',   name: "Secondary Infection", icon: '🦠', desc: "Every hit you take spawns a Side Effect. Try not to get hit. Ha." }
];

/* ============ CODE GRAY (floor-wide crisis events) ============
   Occasionally a whole ward goes into crisis: a temporary ruleset with hazard
   pay for surviving it. Rolled in newFloor (depth 4+); G.crisis holds the id. */
DATA.CRISES = [
  { id: 'lockdown',   name: "CODE GRAY: LOCKDOWN", icon: "🚨", desc: "Doors are sealing. Clear the whole ward before the timer runs out — hazard pay if you do." },
  { id: 'firedrill',  name: "FIRE DRILL",          icon: "🔥", desc: "This is not a drill (it is). Rooms catch fire behind you — don't linger." },
  { id: 'inspection', name: "SURPRISE INSPECTION", icon: "📋", desc: "Contraband sweep. Any pill you're holding may be confiscated — reach the trapdoor with one to pass." },
  { id: 'outage',     name: "POWER OUTAGE",        icon: "🔦", desc: "The lights are out ward-wide. Maintenance has been notified. Maintenance is not coming." }
];

/* ============ THE COMMISSARY (machines) ============
   Horoscope fortunes: a printed slip that applies a real (small) blessing or curse. */
DATA.HOROSCOPES = [
  { text: "“Great fortune finds the well-hydrated.” Heal a heart. The machine keeps its word.", apply(p) { p.heal(2); } },
  { text: "“Mercury is in retrograde. Your aim is not.” Shots steady.", apply(p) { p.wobble = Math.max(0, p.wobble - 0.06); } },
  { text: "“A windfall approaches.” +5 copays.", apply(p) { p.coins += 5; } },
  { text: "“You will meet a tall, dark prescription.” +0.5 damage.", apply(p) { p.dmg += 0.5; } },
  { text: "“The stars recommend cardio.” +6% speed.", apply(p) { p.spd *= 1.06; } },
  { text: "“Luck is a skill. You are unskilled.” −1 luck, +4 copays.", apply(p) { p.luck -= 1; p.coins += 4; } },
  { text: "“Beware small print.” Your next med may bite. −0.5 luck.", apply(p) { p.luck -= 0.5; } },
  { text: "“The universe owes you nothing. Here's a pill.”", apply(p) { if (p.pill == null) p.pill = U.randi(0, 9); } },
  { text: "“Today's energy: chaotic.” Fire rate up, aim wanders.", apply(p) { p.tearDelay *= 0.92; p.wobble += 0.05; } }
];

/* ============ TREATMENT GOALS (per-run objectives) ============
   3 rolled per run; each pays ◆ Insight the moment it completes.
   ev = the G.goalEvent key that advances it, n = target count. */
DATA.GOALS = [
  { id: 'kills25',   name: "Symptom Sweep",       desc: "Manage 25 symptoms.",              ev: 'kill',       n: 25, insight: 4 },
  { id: 'rooms8',    name: "Making Rounds",       desc: "Clear 8 rooms.",                   ev: 'room',       n: 8,  insight: 4 },
  { id: 'pills2',    name: "As Prescribed",       desc: "Swallow 2 pills.",                 ev: 'pill',       n: 2,  insight: 4 },
  { id: 'items3',    name: "Treatment Adherent",  desc: "Collect 3 prescriptions.",         ev: 'item',       n: 3,  insight: 4 },
  { id: 'boss1',     name: "Second Opinion",      desc: "Defeat a boss.",                   ev: 'boss',       n: 1,  insight: 5 },
  { id: 'clean1',    name: "Clean Bill",          desc: "Finish a floor untouched.",        ev: 'floorclean', n: 1,  insight: 8 },
  { id: 'ally1',     name: "Buddy Up",            desc: "Recruit a Support Group ally.",    ev: 'ally',       n: 1,  insight: 5 },
  { id: 'buy2',      name: "Retail Therapy",      desc: "Buy 2 things at the pharmacy.",    ev: 'buy',        n: 2,  insight: 4 },
  { id: 'bombs3',    name: "Filed in Triplicate", desc: "File 3 Claim Forms (bombs).",      ev: 'bomb',       n: 3,  insight: 4 },
  { id: 'coins15',   name: "Out of Pocket",       desc: "Collect 15 copays.",               ev: 'coin',       n: 15, insight: 4 },
  { id: 'secret1',   name: "Off the Record",      desc: "Find a secret room.",              ev: 'secret',     n: 1,  insight: 6 },
  { id: 'hazard1',   name: "High Acuity",         desc: "Enter a special hazard room.",     ev: 'hazard',     n: 1,  insight: 5 }
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

/* ============ SPECIALTY WINGS (floor biomes) ============
   Some wards belong to a specialty wing: its own palette, its own crowd.
   Rolled in newFloor (depth 4+); `mix` enemies get ×3 weight in the pool. */
DATA.WINGS = [
  { id: 'pediatric', name: "THE PEDIATRIC WING", sub: "deceptively cheerful", icon: "🧸",
    pal: { floor: '#5a6a72', line: '#4a5a62', wall: '#7a5a72', trim: '#2a3038' },
    mix: ['notif', 'spiral', 'enabler', 'larper'] },
  { id: 'records', name: "THE RECORDS BASEMENT", sub: "everything is paper", icon: "🗄",
    pal: { floor: '#55492f', line: '#453b25', wall: '#635430', trim: '#2a230f' },
    mix: ['copaycollector', 'larper', 'deadline'] },
  { id: 'nightward', name: "THE NIGHT WARD", sub: "lights out", icon: "🌙",
    pal: { floor: '#2c3040', line: '#232636', wall: '#343a50', trim: '#12141f' },
    mix: ['gaslighter', 'intrusive', 'scroller'], dark: 0.4 },
  { id: 'surgical', name: "THE SURGICAL THEATER", sub: "sterile precision", icon: "🩻",
    pal: { floor: '#48565a', line: '#3a474a', wall: '#59696e', trim: '#1e282b' },
    mix: ['projection', 'comparison', 'deadline'] },
  { id: 'boardroom', name: "ADMINISTRATION", sub: "executive floors", icon: "🏢", noRoll: true,
    pal: { floor: '#5a4a34', line: '#4a3c28', wall: '#6a5638', trim: '#2a2012' },
    mix: ['copaycollector', 'comparison', 'deadline', 'ad'] }
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
  "Ah, my favorite patient. Time for your copay.",
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
  overrx: "OVERPRESCRIBED! One side effect, on the house.",
  referral: "You need a REFERRAL for the Specialist. (Find a key.)",
  oon: "The Out-of-Network Specialist accepts one payment: a piece of you.",
  secret: "A hidden room! It smells like unfiled complaints.",
  blanket: "The Blanket absorbed the hit.",
  oonPoor: "Not enough hearts to pay out-of-pocket."
};
