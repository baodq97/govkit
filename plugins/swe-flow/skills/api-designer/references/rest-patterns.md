# Resource & Operation Judgement

Mechanics — HTTP verb semantics, status codes, HATEOAS, caching, idempotency headers — are the
[HTTP semantics RFC (9110)](https://www.rfc-editor.org/rfc/rfc9110) and are enforced, not
explained, by `../redocly.yaml` (`no-http-verbs-in-paths`, `operation-4xx-response`,
`operation-operationId`). This file is what the linter cannot check: which resource a concept
becomes, whether a related context gets a contract at all, and which of four responsibilities an
operation actually has.

## Relationship role → does this context get a contract at all

`docs/domain/*/model.yaml` splits a relationship across **two axes**, and only one of them decides
a contract. `direction: upstream | downstream | peer` says who depends on whom; `our_roles` and
`their_roles` say how each side *governs* that dependency. A direction is not a role: the same
downstream is free to conform *or* to build an ACL, and an upstream may be an Open Host Service,
publish a language, both, or neither. (EuroPLoP'21 Fig. 5 marks `U`/`PL` on the upstream end and
`D`/`CF` on the downstream one; ddd-crew's context-mapping repo groups the nine patterns the same
way.) So read the **role**, never the direction — and read it on **`our_roles`**, because a role
held at the other end belongs to the other end's contract.

**The provider of a contract is the upstream side, so only an upstream role makes a provider.**
Open Host Service, Published Language and Supplier are what a context *offers* its callers;
Conformist, ACL and Customer are what a context *does about* someone else's offer. This section is
the single statement of that rule — `scripts/derive_cel.py` implements it and cites this section
instead of restating it. Don't default to "every context gets an `openapi.yaml`":

| Role (`our_roles`) | Contract decision |
|---|---|
| **open-host** | Gets a contract, published deliberately for many, partly unknown consumers — this is the one to put versioning/deprecation rigor into first. |
| **published-language** | Gets a contract: the published schema *is* the contract, so a context that publishes one is by definition called. |
| **supplier** | Gets a contract. The customer end has negotiating power over it, so expect requested changes as issues against this spec — never a fork. |
| **partnership** | Gets a contract, and so does the other end; treat as two co-evolving providers, not one. |
| **customer** | No new contract. It negotiates the supplier's; record its needs against the supplier's spec. |
| **conformist** | No new contract, no negotiation either — it accepts the upstream's model as-is. |
| **acl** | **No new contract.** Holding an ACL is a downstream act — see the paragraph below. |
| **shared-kernel** | No separate contract. Both sides import the same schema components (`$ref` a shared file); a contract fork here re-introduces the coupling Shared Kernel was meant to avoid. |
| **separate-ways** | No integration at all, so no API at all. |
| **other** | Nothing to decide: the model has not said how this side is governed. Park the traffic and ask the modeller — never promote an `other` to a contract to fill a table. |

**Why holding an ACL publishes nothing.** ddd-crew groups the anticorruption layer with the
*downstream* patterns, and a downstream is by definition wrapping an upstream it does not control;
EuroPLoP'21 Fig. 5 puts `D`/`CF` on that end and `U`/`PL` on the other. It is true that an ACL's
schema *differs* from the model it protects — but that schema faces **inward**. It is what this
context reads, not what it offers, so it gives this context nothing to publish. An ACL owner may of
course publish an Open Host Service to *its* own downstreams, and then it does get a contract: that
is the `open-host` row doing the work, not the `acl` row. Two roles, two rows, and one side is free
to hold both — `our_roles: [acl, open-host]` is a context that wraps a supplier and re-offers it.

## Published Language vs internal model

Whether the API schema mirrors the aggregate 1:1 or translates it depends on which side of a
boundary you're on, not on maintainability taste:

- **Own aggregate, no boundary crossed** — the API schema may mirror the aggregate directly; once
  versioned, that mirror *is* the Published Language.
- **Behind an ACL you hold** — the translation is internal. The schema you code against is the
  upstream's; the shape your ACL produces is your own model, and fields differing from the
  upstream's entity is the ACL working, not drift. It becomes a contract only when you publish it
  onward as an Open Host Service — the `acl` row above, then the `open-host` one.
- **Never expose invariant-only fields** — fields that exist purely to enforce a domain rule
  (a lock version, an internal state-machine guard) have no caller-facing question they answer.
  This is [OWASP API3:2023 — Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)
  (the 2023 merge of the old API3:2019 "Excessive Data Exposure" and API6:2019 "Mass Assignment" —
  the root cause of both was the same missing authorization at the property level). Treat the cut
  as an authorization control, not a schema-hygiene preference.

## Operation-responsibility taxonomy

Name the responsibility before reaching for a verb — the taxonomy, not the URI, drives the design:

| Responsibility | What it means | Shape |
|---|---|---|
| **State Creation** | A new aggregate/entity instance comes into existence. | `POST` on the collection. |
| **Retrieval** | Read, no side effects. | `GET` on collection (paginated) or item. |
| **State Transition** | An aggregate moves between states a domain event names (`CoursePublished`). | A **sub-resource**, never a verb: `PUT /courses/{id}/publication`, not `POST /publishCourse`. See `references/openapi.md` § domain events for the webhook pairing. |
| **Computation** | A derived read that costs more than plain retrieval (a report, a search, a projection) and isn't itself a domain resource. | Still `GET`, on a purpose-named resource: `GET /parking-visits/{id}/fee-estimate`, not an RPC endpoint. |

An RPC-verb path (`POST /publishCourse`, `GET /computeFee`) is never acceptable regardless of
which bucket the operation falls in — enforced by `no-http-verbs-in-paths` in `../redocly.yaml`.
