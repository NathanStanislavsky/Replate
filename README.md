# rePlate (MVP)

Restaurants post surplus food slots. **X% is reserved for community partners**, and **Y% is distributed to users by a fair lottery**. Winners receive a **QR pickup pass**.

**Stack:** FastAPI (Python) + React + MongoDB + Gemini API  
**Scope:** Boston-based

---

## What this MVP does

### Actors
- **Restaurant**: creates surplus food “slots”
- **Community Partner** (food pantry, mutual aid org, shelter): claims from the reserved 40%
- **Public User**: requests a slot and enters a lottery for the public 60%

### Core flow
1. Restaurant creates a **slot** (pickup window, location, quantity, notes).
2. The system splits capacity:
   - **X% reserved** for community partners
   - **Y% public pool** for lottery
3. Community partners claim reserved units.
4. Public users request the slot and a price is generated off of food insecurity

---

## Goals:
- No bargaining / dynamic pricing yet (Phase 2)
- Fair Payments
- No delivery
- Stop Restaurants from wasting food while maintaining their business side
---

## Repo structure (suggested)