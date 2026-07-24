# Documents API

Source: `docs/domain/documents/` (DOMAIN-0010). Sub-domain type: **supporting** (transaction
script — CRUD + one authorization rule). Status: draft, owner: TBD.

## Resource model

| Domain element | API surface |
|---|---|
| `Document` (an uploaded file linked to a rental or account) | `POST /documents` (Upload), `GET /documents`, `GET /documents/{id}`, `DELETE /documents/{id}` (Delete) |
| `Owner (uploader)` (`OwnerUserId`) | Inline `ownerUserId` — an ownership projection (`document:uploader-owner`), not audit metadata |
| `LinkedEntityId` | Inline `linkedEntityId` + `linkedEntityType` (rental or account), by id reference only |

## Versioning

URI versioning, `/v1`. Base URL: `https://api.rentfield.com/documents/v1`.

## Error catalog

| Status | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `linkedEntityId`/`linkedEntityType`/file payload |
| 403 | `NOT_DOCUMENT_OWNER` | `DELETE` attempted by someone other than the uploader or an admin — the one stated business rule |
| 404 | `DOCUMENT_NOT_FOUND` | Unknown id |
| 401 | `UNAUTHENTICATED` | Standard auth failure |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error |

`403 NOT_DOCUMENT_OWNER` is not a generic "forbidden" — it is the single stated business rule
("only the document owner (the uploader) — or an admin — may delete a document"), captured, not
invented.

## Flags (carried from the domain model, not resolved here)

- **`linkedEntityType`, alongside `linkedEntityId`, is a mechanical addition** (not stated
  verbatim in the domain model, which only names `LinkedEntityId`) — needed so the API can
  disambiguate a rental id from an account id at the same numeric/string id space. This is a
  transport-layer disambiguator, not an invented business concept; flagged for confirmation.
- **No document versioning/replace semantics stated** — `PUT`/`PATCH` are intentionally absent;
  only `Upload` (create) and `Delete` are in the domain model.
