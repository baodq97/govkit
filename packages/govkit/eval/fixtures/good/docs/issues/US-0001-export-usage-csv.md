---
id: US-0001
title: Export usage as CSV
status: open
owner: TBD
date: 2026-05-31
priority: P1
---

As a finance owner I want to export my metered usage as a CSV so that I can reconcile
spend in my own spreadsheet before the invoice arrives.

## Acceptance criteria

- [ ] Given a signed-in user, when they click Export, then a CSV download starts.
- [ ] The CSV includes one row per metered event with a timestamp and quantity.
- [ ] Given a date filter is applied, when exporting, then only rows in range appear.
