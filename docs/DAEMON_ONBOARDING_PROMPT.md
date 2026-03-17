# Daemon Onboarding Prompt
## For openclaw-knobase setup flow

---

## Placement in Setup Flow

After agent connection succeeds, before file sync selection:

```
Step 3: Choose Your Sync Mode

[After device code auth and agent selection]
```

---

## The Prompt

```
═══════════════════════════════════════════════════════════

☁️  SYNC MODE: Where Should Your Agent's Brain Live?

═══════════════════════════════════════════════════════════

Your agent has a personality defined by files like SOUL.md, 
IDENTITY.md, and MEMORY.md.

Where do you want to keep these files?

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [1] 🏠 LOCAL ONLY (Traditional)                        │
│                                                         │
│      Files stay on your computer only                   │
│      • Edit in VS Code, vim, etc.                       │
│      • Manual sync to Knobase when you want             │
│      • Risk: Lose files if computer crashes             │
│      • Best for: Privacy-focused users, air-gapped      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [2] 🧠 KNOBASE BRAIN (Recommended) ★                   │
│                                                         │
│      Knobase becomes the source of truth                │
│      • Edit beautiful markdown in your browser          │
│      • Changes sync to OpenClaw automatically           │
│      • Access from anywhere, any device                 │
│      • Never lose work - everything backed up           │
│      • Collaboration: Multiple agents, shared memory    │
│      • Version history: See every change you made       │
│      • Works offline - syncs when reconnected           │
│                                                         │
│      We'll start a background daemon that keeps         │
│      everything in sync automatically.                  │
│                                                         │
│      🎁 BONUS: Get a public docs site at:               │
│         https://docs.yourdomain.com                     │
│                                                         │
└─────────────────────────────────────────────────────────┘

Recommended: 🧠 Knobase Brain (Option 2)

Your choice [1/2]: 2

═══════════════════════════════════════════════════════════

🚀 Enabling Knobase Brain Mode...

✓ Starting sync daemon
✓ Connected to Knobase cloud
✓ Initial sync complete (7 files)
✓ Daemon watching for changes

📝 Pro Tip: Edit your agent's personality at:
   https://app.knobase.com/s/your-workspace
   
   Changes appear in OpenClaw within 5 seconds!

═══════════════════════════════════════════════════════════
```

---

## Alternative Shorter Version

(If full version is too long)

```
☁️  Where should your agent's personality live?

[1] 📁 On this computer only
    Edit with VS Code. Manual sync. Risk of losing files.

[2] 🧠 In Knobase cloud (Recommended) ★
    Edit in browser. Auto-sync. Never lose work. Access anywhere.
    Bonus: Get a public docs site!

Your choice [1/2]: 2

✓ Brain mode enabled! Edit at: https://app.knobase.com/s/...
```

---

## Key Selling Points

### 1. Visual Differentiation
- Option 1: 🏠 (house) - feels small, limited
- Option 2: 🧠 (brain) - feels smart, powerful
- Option 2 has ★ (recommended) badge

### 2. Benefit-Focused Language

**Option 1 focuses on:**
- What you already know (VS Code)
- The work you have to do (manual sync)
- The risk you take (lose files)

**Option 2 focuses on:**
- The beautiful experience (browser editing)
- The magic (automatic sync)
- The peace of mind (never lose work)
- The superpowers (access anywhere, collaboration)
- The bonus (public docs site)

### 3. Social Proof
- "(Recommended)" label
- ★ star icon
- Default selection (Option 2)

### 4. Immediate Next Step
- After choosing, shows the URL they can use
- Gives a "Pro Tip" to make them feel smart
- Shows progress (✓ checks) to build confidence

---

## Implementation

Add to `bin/setup.js` after agent connection:

```javascript
async function promptSyncMode() {
  console.log(chalk.blue.bold('\n☁️  Where should your agent\'s brain live?\n'))
  
  console.log(chalk.gray('[1] 📁 On this computer only'))
  console.log(chalk.gray('    Edit with VS Code. Manual sync. Risk of losing files.\n'))
  
  console.log(chalk.cyan.bold('[2] 🧠 In Knobase cloud (Recommended) ★'))
  console.log(chalk.cyan('    Edit in browser. Auto-sync. Never lose work.'))
  console.log(chalk.cyan('    Bonus: Get a public docs site!\n'))
  
  const rl = createInterface({ input, output })
  const answer = await new Promise(resolve => {
    rl.question('Your choice [1/2] (default: 2): ', resolve)
  })
  rl.close()
  
  if (answer === '1') {
    console.log(chalk.yellow('ℹ️  Local mode selected. Run "openclaw-knobase sync" manually.'))
    return 'local'
  } else {
    console.log(chalk.green('\n🚀 Enabling Knobase Brain Mode...'))
    await startDaemon()
    console.log(chalk.green('✓ Brain mode enabled!'))
    console.log(chalk.blue('📝 Edit at: https://app.knobase.com/s/...'))
    return 'brain'
  }
}
```

---

## A/B Testing Ideas

### Test A: Fear vs. Aspiration

**Fear-based (Option 1 focus):**
```
⚠️  Without cloud sync, you could lose your agent's 
    personality if your computer crashes!
    
    Enable cloud backup? [Y/n]
```

**Aspiration-based (Option 2 focus):**
```
🚀 Make your agent smarter with Knobase cloud!
    Edit anywhere, collaborate, never lose work.
    
    Enable brain mode? [Y/n]
```

### Test B: Feature List vs. Story

**Feature list:**
```
Cloud features:
✓ Auto-sync
✓ Version history  
✓ Offline support
✓ Public docs
```

**Story:**
```
Imagine editing your agent's personality on your phone 
during your commute, and seeing the changes instantly 
when you get back to your computer.

That's Knobase Brain Mode.
```

---

## Metrics to Track

- [ ] Conversion rate (what % choose brain mode)
- [ ] Time to enable (how long they think about it)
- [ ] Retention (do they keep it on after 7 days)
- [ ] Support tickets (confusion about the choice)

---

## Final Recommendation

Use the **full version** because:
1. Clear visual distinction between options
2. Multiple benefits listed for brain mode
3. Bonus (public docs) is unexpected delight
4. Progress indicators build confidence
5. Pro tip makes user feel like an insider

The goal: Make brain mode feel like the obvious, smart choice.
