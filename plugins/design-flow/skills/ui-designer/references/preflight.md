# Pre-flight — run before declaring the design done

Two tiers, deliberately not one flat list: **blockers** are countable or machine-checkable
and all must pass; **advisories** are judgment calls the reviewer weighs. Each item names the
rule it checks — a checklist item with no rule behind it, or a rule with no item, is drift in
this file.

## Blockers

- [ ] `check_prototype.mjs` exits 0 — every declared screen drawn, no unfilled frame or filler
      text, every color resolving to a token role. *(Hard rules 1–2, 6)*
- [ ] Read the prototype cold: for every screen you can name its one action and what happens
      when it fails. If you cannot, the frame is decoration. Rendering it in a browser is the
      best way to do this; reading your own HTML carefully is the honest fallback when there is
      no browser, and saying which one you did is part of the check.
- [ ] Every error state offers at least one way forward. Count them against the error list.
- [ ] The surface's floor numbers are met (body size, target size — see
      `references/prototype-craft.md` § Surface floors). Measure, don't estimate.
- [ ] Physical / platform affordances are drawn where the hardware actually is, and anything
      present on every screen is in the device chrome, not one screen's UI. *(Hard rule 7)*
- [ ] `check_tokens.mjs` exits 0 on `docs/ui/tokens.json` — design read filled, dials
      reasoned, every declared pair AA-clean. *(Hard rules 3–5)*
- [ ] Exactly one design system / approximation, named in the read and recorded as an ADR;
      exactly one icon family; one brand accent, with semantic state colors kept separate and
      deliberate. *(Hard rule 8)*
- [ ] Every screen declares exactly one primary action. Count them. *(Hard rule 6)*
- [ ] **When `docs/api/` exists:** every RFC 9457 problem type of a screen's bound operations
      has an error entry. Diff the two lists. With no API design, this blocker does not apply —
      derive the error cases from the domain's rejection paths instead and record the absence
      as a gap.
- [ ] Screen and entity names match `docs/domain/` ubiquitous language — grep the screens
      file for names that appear nowhere in the domain docs; each hit is a rename, an
      invention, or a recorded gap. *(Hard rule 9)*
- [ ] The brief has a non-empty **Rejected defaults** section. *(Hard rule 11)*
- [ ] Every decision in the brief cites its source (PRD / domain / API / brief sentence), and
      every upstream gap is recorded as a gap. *(Hard rule 13)*
- [ ] If `docs/ui/` predated this run: prior decisions were read and carried forward or
      explicitly overridden with direction, and the brief records kept-vs-replaced.
      *(Hard rule 12)*

## Advisories

- [ ] One signature element, and only one — could a reviewer point at it in the prototype
      without being told? *(Hard rule 10)*
- [ ] Screens read as real: real numbers, real sentences, brand present, realistic density —
      run the tells list in `references/prototype-craft.md`. Every screen earned its own shape
      rather than reusing one layout with different words.
- [ ] The quality floor is present without being announced: visible focus for every input the
      surface has, reduced motion respected, no affordance that exists only on hover for a
      touch surface. *(Hard rule 10)*
- [ ] Copy passes the register check: active verbs, stable action names through each flow,
      errors that direct rather than apologize.
- [ ] Structure encodes truth — no numbering/eyebrow/divider that would survive unchanged on
      another product's page.
- [ ] Dark mode (when in scope): declared dark pairs are in `contrastPairs` (`dark.<role>`),
      hierarchy reads the same in both modes, no pure #000/#fff.

If a blocker cannot be honestly ticked, the design is not done. An advisory that cannot be
ticked is a judgment for the reviewer, stated in the brief — not silently dropped.
