# Stu ICP Scoring Reference

## How Prospects Are Ranked

The system automatically scores each school (0-100) based on your Ideal Customer Profile (ICP) for MSP & early sales.

### Scoring Breakdown

**Base Score by Institution Type:**
- 🔥 **High Priority (+40)**: Community colleges, mid-tier state universities (SLCC, Snow College, Boise State, Northern Arizona, UVU)
- ✅ **Medium Priority (+20)**: Public universities, state universities with 10k-30k students
- ❌ **Low Priority (-20)**: Elite private universities (Harvard, Stanford, Yale, Princeton, MIT)
- 🚫 **Avoid (-∞)**: For-profit institutions (University of Phoenix, Western Governors)

**Bonus Points:**
- State Data Quality: Up to +20 points (higher confidence = higher bonus)
- Contact Data Quality: Up to +40 points (registrar/provost info found)
- Registrar Info Found: +10 points
- Provost Info Found: +10 points

### ICP Tiers & What They Mean

| Score | Tier | Meaning | Action |
|-------|------|---------|--------|
| 75+ | 🔥 **Ideal Target** | Perfect fit for your ICP. High contact quality data available. | **CALL FIRST** |
| 50-74 | ✅ **Good Fit** | Strong match to your ICP. Some contact data available. | **HIGH PRIORITY** |
| 30-49 | ⚪ **Neutral** | Mixed signals. May still be worth exploring. | **MEDIUM PRIORITY** |
| 10-29 | ⚠️ **Explore** | Some concerns, but worth investigating further. | **LOW PRIORITY** |
| 0-9 | ❌ **Skip** | Poor fit. Focus on other prospects. | **SKIP** |

---

## Your ICP (Phase 1–2): MSP & Early Sales Focus

### Primary Targets (High Priority)

**Community Colleges**
- Examples: SLCC, Snow College, Dixie State, Utah Valley Tech
- Student Size: 2k–8k
- Budget: $25k–$40k/year
- Why: Fast decision-making, high retention needs, understaffed advisors
- Pain: Multiple system integrations, low retention rates (40-50%)

**Mid-Tier State Universities**
- Examples: Boise State, Northern Arizona University, UVU, Weber State
- Student Size: 15k–25k
- Budget: $35k–$65k/year
- Why: Advisor overload, retention goals, manageable complexity
- Pain: Retention crisis, advisor burnout, aging Banner/DegreeWorks systems

**Regional Public Universities**
- Examples: Utah State, New Mexico State, Montana State
- Student Size: 10k–20k
- Budget: $40k–$75k/year
- Why: Similar pain to mid-tier, slightly larger budgets
- Pain: Complex multi-campus systems, ROI pressure

### Secondary Targets (Medium Priority)

**Larger State Universities**
- Examples: University of Utah, Arizona State, Colorado State
- Student Size: 25k–50k+
- Budget: $75k–$150k+/year (long-term pipeline, not Phase 1)
- Why: Long sales cycles, but eventual significant revenue
- Pain: Massive retention challenges, complex systems

**Technical/For-Profit Colleges** *(Strategic Opportunity)*
- Examples: Western Governors University (online), coding bootcamps, technical schools
- Student Size: Varies widely (5k–50k+)
- Budget: Varies (often lower, but ROI-driven)
- Why: Online-first, high churn, fast decision-making
- Pain: Student retention is existential, online-first platform challenges

### Avoid (Low/No Priority)

**Elite Private Universities**
- Examples: Harvard, Stanford, Yale, Princeton, MIT
- Budget: $$$+
- Why: Custom systems, slow procurement, low pain urgency, not your customer
- Time to close: 18–36+ months

**Small Liberal Arts Colleges**
- Examples: Southern Utah University, small private nonprofits
- Budget: $15k–$30k (too small for Phase 1)
- Why: Limited advisor staff, limited budgets, niche needs
- Consider later when you have case studies

---

## How Confidence Scores Work

### State Confidence (City/State Data)
- **80%+** (Green): Verified state data from IPEDS/Scorecard
- **60%+** (Emerald): High confidence state location
- **40%+** (Yellow): Moderate confidence, likely correct
- **20%+** (Orange): Lower confidence, manual verification needed
- **0-20%** (Red): Could not verify

### Contact Confidence (Registrar/Provost Info)
- **80%+** (Green): Clear registrar/provost names + emails extracted
- **60%+** (Emerald): Names or emails found, but not both
- **40%+** (Yellow): Some contact info found via Gemini extraction
- **20%+** (Orange): Limited info, may need manual follow-up
- **0-20%** (Red): No contact info available

---

## Recommended Outreach Order

### Week 1: "Ideal Target" Prospects (Score 75+)
1. **Why**: Highest ROI, best available contact data
2. **Approach**: Direct cold outreach to registrar/provost email
3. **Goal**: 5-10 introductory calls scheduled

### Week 2-3: "Good Fit" Prospects (Score 50-74)
1. **Why**: Strong ICP match, worth dedicated effort
2. **Approach**: Email + LinkedIn + phone if needed
3. **Goal**: 10-15 conversations, 2-3 demos

### Week 4+: "Neutral" Prospects (Score 30-49)
1. **Why**: Exploratory conversations, gather intelligence
2. **Approach**: Group email campaigns, nurture sequences
3. **Goal**: Build pipeline for future deals

---

## Quick Decision Framework

**Decision: Should I call this school?**

| Scenario | Answer | Why |
|----------|--------|-----|
| Score 75+, has registrar email | ✅ **YES** | Ideal target with direct contact |
| Score 60+, community college | ✅ **YES** | High priority ICP + fast decisions |
| Score 50+, mid-tier state university | ✅ **YES** | Perfect ICP fit, medium-long pipeline |
| Score 40+, no contact data | ⚠️ **MAYBE** | Need to do research first or skip |
| Score 30-, elite university | ❌ **NO** | Wrong ICP for Phase 1 |
| Score 0, for-profit | ❌ **NO** | Skip entirely for now |

---

## Adjusting the ICP

If you want to modify ICP keywords, edit `/app/web-scraper/web-scraper-client.tsx`:

```typescript
const ICP_KEYWORDS = {
  highPriority: [
    'community college', 'slcc', // Add/remove keywords here
  ],
  mediumPriority: [
    'utah state', 'state university',
  ],
  lowPriority: [
    'harvard', 'stanford',
  ],
  avoidKeywords: [
    'for-profit',
  ],
};
```

Then rebuild: `npm run build`

---

## Example Output

When you run a scan, you'll see:

**🎯 Prospect Ranking Section:**
```
🔥 Ideal Target (85/100)
Boise State University
State: ID · Registrar: ✓ · Provost: ✓

✅ Good Fit (62/100)
University of Utah
State: UT · Registrar: ✓ · Provost: ✗
```

**Complete Data Table:**
- ICP Fit column: Color-coded green/yellow/red
- Confidence scores: Shown as percentages (80%, 45%, etc.)
- All contact data: Registrar, provost, dept emails/phones

---

**Last Updated**: November 2024
