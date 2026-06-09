---
id: ADR-0002
title: Unparseable front-matter
status: proposed
owner: @baodq97
date: 2026-06-06
---

`owner: @baodq97` — an unquoted `@` is a reserved YAML indicator, so this block fails to
parse. The gate must report it as one violation, not crash the run. (US-0002)
