# Documents API (DOMAIN-0010, supporting)

Store files attached to rentals and accounts — signed agreements, delivery photos, inspection
sheets. Deliberately light (transaction script): CRUD plus one authorization rule. No aggregate.

## Resource mapping

| Domain element | Kind | API surface |
|---|---|---|
| `Document {id, ownerUserId, linkedEntityId}` | record | `/documents` + `/documents/{documentId}` |
| file bytes | content | `POST /documents` (multipart) + `GET /documents/{documentId}/content` |
| `Upload` / `Delete` | commands | `POST /documents` / `DELETE /documents/{documentId}` |
| `LinkedEntityId` | ref | the rental or account the file is attached to (cross-context id, filterable) |

## Business rule → API behaviour (captured, not invented)

**Only the document owner (the uploader) or an admin may delete a document.** Enforced as:
`DELETE /documents/{documentId}` → `403 forbidden` (`problem+json`) when the caller is neither the
`ownerUserId` nor an admin. `ownerUserId` is the uploader-owner projection (a real ownership
relationship), not audit metadata — one of the three distinct meanings of "owner" the domain keeps
apart (see context-map declined Ownership candidate).

## Error catalog

| Status | `type` slug | When |
|---|---|---|
| 400 | `validation-error` | missing file / metadata |
| 401 | `unauthorized` | missing/invalid JWT |
| 403 | `forbidden` | delete attempted by a non-owner, non-admin |
| 404 | `document-not-found` | unknown `documentId` |
| 413 | `payload-too-large` | file exceeds limit (flagged assumption — no size stated: QUESTIONS Q-A9) |

Versioning: URI-versioned `/v1`.
