#!/usr/bin/env node
// Regenerates both eval fixtures deterministically. Lives OUTSIDE fixture-*/ on purpose:
// it states every planted count, so a runner that read it would be counting from the answer
// key instead of from the corpus. Runners are blinded from this file (README → Blinding).
//
//   node docs/research/discover-measure-eval/make-fixtures.mjs
//
// Prints the ground-truth census it just wrote; rubric.md quotes those numbers.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = dirname(new URL(import.meta.url).pathname);
const S = join(ROOT, "fixture-structured");
const P = join(ROOT, "fixture-prose");
const BOM = "﻿";

const put = (path, body) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
};

rmSync(S, { recursive: true, force: true });
rmSync(P, { recursive: true, force: true });

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE S — "FleetOps" legacy export. Structured, ≥20 files sharing one shape.
// ─────────────────────────────────────────────────────────────────────────────

// name -> [ [attrName, type, target] ]. `Owner` and `Cost` are the planted polysemes.
const ent = {
  WorkOrder: [
    ["Name", "string", ""], ["Owner", "lookup", "Employee"], ["Cost", "decimal", ""],
    ["CostCentre", "lookup", "CostCentre"], ["Asset", "lookup", "Asset"],
    ["Status", "picklist", "wo_status"], ["OpenedOn", "datetime", ""],
    ["ClosedOn", "datetime", ""], ["Priority", "picklist", "priority"],
    ["Downtime", "decimal", ""], ["Notes", "memo", ""], ["CreatedBy", "lookup", "SystemUser"],
  ],
  Asset: [
    ["Name", "string", ""], ["Owner", "lookup", "Depot"], ["SerialNo", "string", ""],
    ["Cost", "decimal", ""], ["AcquiredOn", "datetime", ""], ["Category", "lookup", "Category"],
    ["Meter", "decimal", ""], ["Status", "picklist", "asset_status"],
    ["ModifiedOn", "datetime", ""],
  ],
  Depot: [
    ["Name", "string", ""], ["Owner", "string", ""], ["Region", "lookup", "Region"],
    ["Capacity", "int", ""], ["Address", "string", ""],
  ],
  Employee: [
    ["FullName", "string", ""], ["Depot", "lookup", "Depot"], ["Trade", "picklist", "trade"],
    ["Cost", "lookup", "CostCentre"], ["HiredOn", "datetime", ""],
  ],
  PartsRequest: [
    ["Name", "string", ""], ["WorkOrder", "lookup", "WorkOrder"], ["Part", "lookup", "Part"],
    ["Qty", "int", ""], ["Cost", "string", ""], ["Owner", "picklist", "owner_role"],
    ["ApprovedBy", "lookup", "Employee"],
  ],
  Part: [
    ["Name", "string", ""], ["Sku", "string", ""], ["Cost", "decimal", ""],
    ["Supplier", "lookup", "Supplier"], ["OnHand", "int", ""],
  ],
  Supplier: [["Name", "string", ""], ["Tin", "string", ""], ["Region", "lookup", "Region"]],
  CostCentre: [["Name", "string", ""], ["Code", "string", ""], ["Budget", "decimal", ""]],
  Region: [["Name", "string", ""], ["Code", "string", ""]],
  Category: [["Name", "string", ""], ["Parent", "lookup", "Category"]],
  Inspection: [
    ["Name", "string", ""], ["Asset", "lookup", "Asset"], ["Result", "picklist", "result"],
    ["InspectedOn", "datetime", ""], ["Inspector", "lookup", "Employee"],
  ],
  MeterReading: [
    ["Asset", "lookup", "Asset"], ["Value", "decimal", ""], ["ReadOn", "datetime", ""],
  ],
  Downtime: [
    ["Asset", "lookup", "Asset"], ["Hours", "decimal", ""], ["Reason", "picklist", "reason"],
  ],
  PmSchedule: [
    ["Name", "string", ""], ["Asset", "lookup", "Asset"], ["IntervalDays", "int", ""],
    ["LastRun", "datetime", ""],
  ],
  Contract: [
    ["Name", "string", ""], ["Supplier", "lookup", "Supplier"], ["Cost", "decimal", ""],
    ["StartsOn", "datetime", ""], ["EndsOn", "datetime", ""],
  ],
  Warranty: [["Asset", "lookup", "Asset"], ["ExpiresOn", "datetime", ""]],
  Shift: [["Name", "string", ""], ["StartsAt", "datetime", ""], ["Depot", "lookup", "Depot"]],
  Crew: [["Name", "string", ""], ["Shift", "lookup", "Shift"], ["Lead", "lookup", "Employee"]],
  FuelLog: [
    ["Asset", "lookup", "Asset"], ["Litres", "decimal", ""], ["Cost", "decimal", ""],
    ["LoggedOn", "datetime", ""],
  ],
  Incident: [
    ["Name", "string", ""], ["Asset", "lookup", "Asset"], ["Severity", "picklist", "severity"],
    ["ReportedBy", "lookup", "Employee"], ["OccurredOn", "datetime", ""],
  ],
};

const attrXml = (a) =>
  `      <Attribute name="${a[0]}" type="${a[1]}"${a[2] ? ` target="${a[2]}"` : ""} required="false" />`;

const formXml = (name, attrs) => {
  const fields = attrs.slice(0, 4).map((a, i) => `        <Field name="${a[0]}" width="${100 + i * 15}" />`);
  const rest = attrs.slice(4).map((a, i) => `        <Field name="${a[0]}" width="${90 + i * 10}" />`);
  return [
    `  <Forms>`,
    `    <Form name="main" layout="two-column" formid="{form-${name.toLowerCase()}-0001}">`,
    `      <Section label="General" columns="2">`, ...fields, `      </Section>`,
    ...(rest.length ? [`      <Section label="Details" columns="1">`, ...rest, `      </Section>`] : []),
    `    </Form>`, `  </Forms>`,
  ].join("\n");
};

const entityXml = (name, attrs, pkg, version) =>
  [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<Entity name="${name}" schema="fo_${name.toLowerCase()}" package="${pkg}" version="${version}">`,
    `  <Display>${name.replace(/([a-z])([A-Z])/g, "$1 $2")}</Display>`,
    `  <Labels>`,
    `    <Label lcid="1033" value="${name}" />`,
    `    <Label lcid="1066" value="${name} (vi)" />`,
    `    <Label lcid="1036" value="${name} (fr)" />`,
    `  </Labels>`,
    `  <Attributes>`,
    ...attrs.map(attrXml),
    `    <Attribute name="fo_createdon" type="datetime" required="false" platform="true" />`,
    `    <Attribute name="fo_modifiedon" type="datetime" required="false" platform="true" />`,
    `    <Attribute name="fo_versionnumber" type="bigint" required="false" platform="true" />`,
    `  </Attributes>`,
    `  <Relationships>`,
    ...attrs
      .filter((a) => a[1] === "lookup")
      .map((a) => `    <Relationship name="fo_${name.toLowerCase()}_${a[0].toLowerCase()}" type="many-to-one" target="${a[2]}" />`),
    `  </Relationships>`,
    formXml(name, attrs),
    `</Entity>`,
    ``,
  ].join("\n");

// Core package — all 20 entities, full fidelity, BOM on every file (planted).
const names = Object.keys(ent);
for (const n of names) {
  put(join(S, "export/packages/core/entities", `${n}.xml`), BOM + entityXml(n, ent[n], "core", "3.2.1"));
}

// Addon package — 6 entities redefined THINNER (planted stage-3 conflicts).
const thin = { WorkOrder: 4, Asset: 3, Depot: 2, PartsRequest: 3, Contract: 2, FuelLog: 2 };
for (const [n, k] of Object.entries(thin)) {
  put(join(S, "export/packages/addon/entities", `${n}.xml`), BOM + entityXml(n, ent[n].slice(0, k), "addon", "1.4.0"));
}
// One addon file contradicts core on a TYPE, not just a count (sharper conflict).
put(
  join(S, "export/packages/addon/entities", "Inspection.xml"),
  BOM +
    entityXml("Inspection", [["Name", "string", ""], ["Result", "string", ""], ["Inspector", "string", ""]], "addon", "1.4.0"),
);

// Managed twins — byte-similar duplicates of 6 core files (planted stage-4 noise).
for (const n of names.slice(0, 6)) {
  put(join(S, "export/packages/addon-managed/entities", `${n}_managed.xml`), BOM + entityXml(n, ent[n], "addon-managed", "1.4.0"));
}

// Stubs — 5 files that PARSE but carry no Attributes node at all (planted stage-2 trap).
for (const n of ["Warranty", "Shift", "Crew", "MeterReading", "Downtime"]) {
  put(
    join(S, "export/packages/addon/entities", `${n}.xml`),
    BOM + `<?xml version="1.0" encoding="utf-8"?>\n<Entity name="${n}" schema="fo_${n.toLowerCase()}" package="addon" version="1.4.0">\n  <Display>${n}</Display>\n</Entity>\n`,
  );
}

// Monolith — one 0-attribute-per-entity index file restating 8 names (checksum, not a definition).
put(
  join(S, "export/packages/legacy/monolith.xml"),
  BOM +
    [
      `<?xml version="1.0" encoding="utf-8"?>`,
      `<Solution name="fleetops_legacy" version="0.9.7">`,
      `  <Entities>`,
      ...names.slice(0, 8).map((n) => `    <Entity name="${n}" schema="fo_${n.toLowerCase()}" />`),
      `  </Entities>`,
      `</Solution>`,
      ``,
    ].join("\n"),
);

// Glob traps — real content, extensions that a naive '*.xml' misses or wrongly includes.
put(join(S, "export/packages/addon/entities", "Incident.XML"), BOM + entityXml("Incident", ent.Incident.slice(0, 3), "addon", "1.4.0"));
put(join(S, "export/packages/core/entities", "Part.xml.bak"), BOM + entityXml("Part", ent.Part, "core", "3.1.0"));

// Business logic living OUTSIDE the entity model — the thing reading misses.
const formulas = [
  ["WorkOrder", "TotalCost", "Cost + Sum(PartsRequest.Cost) * 1.1"],
  ["WorkOrder", "SlaBreached", "If(ClosedOn > OpenedOn + Hours(Priority.SlaHours), true, false)"],
  ["Asset", "Utilisation", "Sum(MeterReading.Value) / Max(Downtime.Hours, 1)"],
  ["Asset", "NextPmDue", "PmSchedule.LastRun + Days(PmSchedule.IntervalDays)"],
  ["Asset", "BookValue", "Cost - (Cost * 0.15 * YearsSince(AcquiredOn))"],
  ["PartsRequest", "NeedsApproval", "If(Cost > 5000, true, false)"],
  ["Part", "ReorderFlag", "If(OnHand < 5, true, false)"],
  ["Contract", "Expiring", "If(EndsOn < Today() + Days(30), true, false)"],
  ["FuelLog", "CostPerLitre", "Cost / Max(Litres, 0.01)"],
  ["Depot", "Occupancy", "Count(Asset) / Max(Capacity, 1)"],
  ["Employee", "OpenWorkOrders", "Count(WorkOrder where Owner = this and Status <> 'closed')"],
];
formulas.forEach(([e, f, expr], i) =>
  put(join(S, "export/packages/core/formulas", `${e}_${f}.txt`), `entity=${e}\nfield=${f}\nkind=${i % 3 === 0 ? "rollup" : "calculated"}\nexpression=${expr}\n`),
);

const flows = [
  ["WorkOrderEscalation", "WorkOrder", "update", "Priority"],
  ["WorkOrderClose", "WorkOrder", "update", "Status"],
  ["PartsApproval", "PartsRequest", "create", ""],
  ["PartsRejectNotify", "PartsRequest", "update", "Status"],
  ["AssetRetire", "Asset", "update", "Status"],
  ["AssetTransfer", "Asset", "update", "Owner"],
  ["PmGenerate", "PmSchedule", "scheduled", ""],
  ["InspectionFail", "Inspection", "update", "Result"],
  ["IncidentEscalate", "Incident", "create", ""],
  ["ContractRenewal", "Contract", "scheduled", ""],
  ["FuelAnomaly", "FuelLog", "create", ""],
  ["CrewAssign", "Crew", "update", "Lead"],
];
flows.forEach(([n, e, ev, attr]) =>
  put(
    join(S, "export/packages/core/workflows", `${n}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>\n<Workflow name="${n}" primaryentity="fo_${e.toLowerCase()}" trigger="${ev}"${attr ? ` filteringattributes="${attr.toLowerCase()}"` : ""}>\n  <Step type="condition" />\n  <Step type="setvalue" />\n  <Step type="sendmail" />\n</Workflow>\n`,
  ),
);

// The format documents itself (stage-0 reward).
put(
  join(S, "schema/FleetOpsExport.xsd"),
  `<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
  <xs:simpleType name="attrType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="string" /><xs:enumeration value="memo" />
      <xs:enumeration value="int" /><xs:enumeration value="bigint" />
      <xs:enumeration value="decimal" /><xs:enumeration value="datetime" />
      <xs:enumeration value="picklist" /><xs:enumeration value="lookup" />
    </xs:restriction>
  </xs:simpleType>
  <xs:element name="Entity">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Display" type="xs:string" />
        <xs:element name="Labels" minOccurs="0">
          <xs:complexType><xs:sequence>
            <xs:element name="Label" maxOccurs="unbounded">
              <xs:complexType>
                <xs:attribute name="lcid" type="xs:int" use="required" />
                <xs:attribute name="value" type="xs:string" use="required" />
              </xs:complexType>
            </xs:element>
          </xs:sequence></xs:complexType>
        </xs:element>
        <xs:element name="Attributes" minOccurs="0">
          <xs:complexType><xs:sequence>
            <xs:element name="Attribute" maxOccurs="unbounded">
              <xs:complexType>
                <xs:attribute name="name" type="xs:string" use="required" />
                <xs:attribute name="type" type="attrType" use="required" />
                <xs:attribute name="target" type="xs:string" use="optional" />
                <xs:attribute name="required" type="xs:boolean" use="optional" />
                <xs:attribute name="platform" type="xs:boolean" use="optional" />
              </xs:complexType>
            </xs:element>
          </xs:sequence></xs:complexType>
        </xs:element>
        <xs:element name="Relationships" minOccurs="0">
          <xs:complexType><xs:sequence>
            <xs:element name="Relationship" minOccurs="0" maxOccurs="unbounded">
              <xs:complexType>
                <xs:attribute name="name" type="xs:string" use="required" />
                <xs:attribute name="type" type="xs:string" use="required" />
                <xs:attribute name="target" type="xs:string" use="required" />
              </xs:complexType>
            </xs:element>
          </xs:sequence></xs:complexType>
        </xs:element>
        <xs:element name="Forms" minOccurs="0">
          <xs:complexType><xs:sequence>
            <xs:element name="Form" maxOccurs="unbounded">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="Section" maxOccurs="unbounded">
                    <xs:complexType>
                      <xs:sequence>
                        <xs:element name="Field" maxOccurs="unbounded">
                          <xs:complexType>
                            <xs:attribute name="name" type="xs:string" use="required" />
                            <xs:attribute name="width" type="xs:int" use="optional" />
                          </xs:complexType>
                        </xs:element>
                      </xs:sequence>
                      <xs:attribute name="label" type="xs:string" use="required" />
                      <xs:attribute name="columns" type="xs:int" use="optional" />
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
                <xs:attribute name="name" type="xs:string" use="required" />
                <xs:attribute name="layout" type="xs:string" use="optional" />
                <xs:attribute name="formid" type="xs:string" use="optional" />
              </xs:complexType>
            </xs:element>
          </xs:sequence></xs:complexType>
        </xs:element>
      </xs:sequence>
      <xs:attribute name="name" type="xs:string" use="required" />
      <xs:attribute name="schema" type="xs:string" use="required" />
      <xs:attribute name="package" type="xs:string" use="optional" />
      <xs:attribute name="version" type="xs:string" use="optional" />
    </xs:complexType>
  </xs:element>
</xs:schema>
`,
);

// Layering signals exist, but nothing announces the rule — it has to be measured and stated.
put(
  join(S, "export/manifest.txt"),
  `# FleetOps solution export, produced by fleetops-exporter 4.2
# packages are applied in the order listed; later packages patch earlier ones
package core            state=base       publisher=fo   installed=2019-04-11
package addon           state=patch      publisher=fo   installed=2023-08-02
package addon-managed   state=managed    publisher=fo   installed=2023-08-02
package legacy          state=index      publisher=flt  installed=2017-01-30
`,
);

put(
  join(S, "README.md"),
  `# FleetOps export snapshot

An export of the FleetOps maintenance system, taken from the vendor tool. Nobody on the current
team wrote it and the original analysts have left. We are trying to work out what the system
actually does before we replace it.

The vendor publishes the export format's schema under \`schema/\`. \`export/manifest.txt\` lists the
packages in the order the tool applies them.
`,
);

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURE P — prose only. No repeated machine shape, nothing near the threshold.
// ─────────────────────────────────────────────────────────────────────────────

put(
  join(P, "README.md"),
  `# Harbourline — internal notes

We run coastal freight: containers move from an inland yard to a port, onto a vessel, and out. There
is no system yet worth the name — the team works off a shared spreadsheet and a WhatsApp group. These
notes are what we have written down so far.
`,
);

put(
  join(P, "docs/product-brief.md"),
  `# Harbourline product brief

Coastal freight forwarding. A customer books space for a container; we collect it from their yard,
truck it to the port, clear it, and load it onto a sailing. The customer wants to know where their
box is and what it will cost.

We make money on the spread between the rate we quote and what the carrier charges us, so a quote
that is wrong by 5% wipes out the margin on that booking. Today the quote is worked out by hand from
a rate card that changes weekly, and two people quote the same lane differently.

What hurts most, in the order the team argues about it:

1. A booking is confirmed before we know a slot exists on the sailing. Sometimes there is no slot.
2. Nobody can say where a container is without phoning the yard.
3. Invoices go out late because the surcharges are collected from three different people.

We have decided we will stop quoting by hand. We have not decided who owns the rate card.
`,
);

put(
  join(P, "docs/ops-walkthrough.md"),
  `# How a booking actually goes through, as told by operations

A customer emails or calls. Whoever picks it up writes the booking into the sheet — customer, lane,
container type, the date they want it collected. That row is the booking from then on.

We check with the carrier that there is space on the sailing. That is a phone call. If there is
space, we tell the customer it is confirmed. If there is not, we offer the next sailing, and the
customer usually accepts.

The truck goes out. The driver texts when the box is picked up and again when it is at the port
gate. Someone updates the sheet, usually the same day, not always.

Customs clearance is its own thing. The declaration goes to the broker with the packing list. If the
broker comes back with a query, the box sits at the gate until it is answered, and the sailing may go
without it. That is the worst outcome we have and it happens perhaps twice a month.

Once the box is loaded we consider the job done and it goes to billing.
`,
);

put(
  join(P, "docs/meeting-2026-05-14-pricing.md"),
  `# Meeting notes — pricing, 14 May 2026

Present: Mai (commercial), Tuan (operations), Linh (finance).

Mai: the rate card is weekly, per lane, per container type. There is a base rate and then surcharges
— fuel, congestion, and a documentation fee. The surcharges are where the disagreements are.

Linh: finance treats the documentation fee as revenue, commercial treats it as a pass-through. Both
have been true at different times. Left unresolved in the meeting.

Tuan: operations do not see the rate at all, so when a booking is unprofitable they find out from
finance a month later.

Mai wants a quote to expire. Nothing today says how long a quote is good for; she thinks 7 days,
Linh thinks it should follow the rate card week. Not decided.
`,
);

put(
  join(P, "docs/meeting-2026-06-02-tracking.md"),
  `# Meeting notes — visibility, 2 June 2026

Present: Tuan (operations), Ha (customer service), Duc (yard).

Ha: the question customers ask is always the same — where is my container and will it make the
sailing. She cannot answer either without two phone calls.

Duc: the yard knows where a box is while it is in the yard. Once it leaves, only the driver knows.

Tuan: we tried making drivers update the sheet. It lasted three weeks.

Ha asked what "delivered" means. Duc said it means it is on the vessel. Ha said customers use it to
mean it has reached the consignee, which is not something we even see. Two meanings, both in daily
use. Nobody picked one.
`,
);

put(
  join(P, "docs/decision-memo-carrier-integration.md"),
  `# Memo — do we integrate with the carrier?

Two carriers cover 80% of our sailings. One publishes a booking API; the other takes email and
replies within the day.

If we integrate with the first, slot availability stops being a phone call for most bookings. The
cost is that our booking flow has to cope with two completely different upstreams, and the email
carrier will not change.

Recommendation: integrate the one that has an API, keep the email path manual, and do not pretend in
the model that the two are the same thing. Nobody has signed off on this yet.
`,
);

put(
  join(P, "docs/support-log-digest.md"),
  `# What customers complain about — digest of six months of tickets

Read through the shared mailbox and grouped the complaints by hand. Rough proportions, not counts.

About half are "where is my box". A quarter are invoice disputes, and almost all of those are a
surcharge the customer says was never quoted. The rest are split between a collection that did not
happen on the day agreed, and a customs query the customer heard about too late to act on.

One recurring theme worth calling out: customers refer to the booking by their own purchase order
number, which we do not store anywhere. Staff keep it in the notes column when they remember.
`,
);

put(
  join(P, "docs/glossary-draft.txt"),
  `Words we use, written down after an argument about them. Not agreed.

booking      - the row in the sheet. Also used for the thing the customer asked for, before we
               confirmed anything. Mai and Tuan use it both ways in the same sentence.
job          - operations word for a booking that has been dispatched to a truck.
consignment  - what the customs paperwork calls the goods. Finance uses it to mean the invoice line.
delivered    - on the vessel (yard/ops) OR received by the consignee (customer service). See the
               2 June notes.
slot         - space on a sailing. Carrier calls it an allocation.
lane         - origin/destination pair. Sometimes includes the container type, sometimes not.
`,
);

// Small-structured bait: real DDL, three tables, nowhere near a corpus.
put(
  join(P, "db/schema.sql"),
  `-- The spreadsheet replacement someone started and abandoned.
CREATE TABLE booking (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  lane          TEXT NOT NULL,
  container     TEXT,
  wanted_on     DATE,
  status        TEXT
);

CREATE TABLE quote (
  id         SERIAL PRIMARY KEY,
  booking_id INT REFERENCES booking(id),
  base_rate  NUMERIC(12,2),
  surcharges NUMERIC(12,2),
  quoted_on  DATE
);

CREATE TABLE movement (
  id         SERIAL PRIMARY KEY,
  booking_id INT REFERENCES booking(id),
  event      TEXT,
  noted_at   TIMESTAMP
);
`,
);

// ─────────────────────────────────────────────────────────────────────────────
// Ground-truth census — the numbers rubric.md grades against.
// ─────────────────────────────────────────────────────────────────────────────
const { execSync } = await import("node:child_process");
const count = (glob, dir) => execSync(`find ${dir} -type f ${glob} | wc -l`, { encoding: "utf8" }).trim();

const senses = {};
for (const [e, attrs] of Object.entries(ent)) {
  for (const [n, t, tgt] of attrs) {
    (senses[n] ??= []).push(`${e}.${n}:${t}${tgt ? `->${tgt}` : ""}`);
  }
}
const poly = Object.entries(senses)
  .map(([n, occ]) => [n, new Set(occ.map((o) => o.split(":")[1])).size, occ.length])
  .filter(([, distinct]) => distinct > 1)
  .sort((a, b) => b[1] - a[1]);

console.log("FIXTURE-STRUCTURED census (ground truth for rubric.md)");
console.log(`  all files                     ${count("", S)}`);
console.log(`  *.xml (lowercase only)        ${count("-name '*.xml'", S)}`);
console.log(`  *.xml + *.XML                 ${count("\\( -name '*.xml' -o -name '*.XML' \\)", S)}`);
console.log(`  entity files (.xml, any pkg)  ${count("-path '*/entities/*' -name '*.xml'", S)}`);
console.log(`  entity files incl. .XML/.bak  ${count("-path '*/entities/*'", S)}`);
console.log(`  distinct entity NAMES         ${names.length}`);
console.log(`  stubs with no Attributes      5`);
console.log(`  _managed twins                ${count("-name '*_managed.xml'", S)}`);
console.log(`  formula files                 ${count("-path '*/formulas/*'", S)}`);
console.log(`  workflow files                ${count("-path '*/workflows/*'", S)}`);
const defs = {};
for (const n of names) (defs[n] ??= []).push("core");
for (const n of Object.keys(thin)) defs[n].push("addon");
defs.Inspection.push("addon");
for (const n of ["Warranty", "Shift", "Crew", "MeterReading", "Downtime"]) defs[n].push("addon(stub)");
for (const n of names.slice(0, 6)) defs[n].push("managed");
for (const n of names.slice(0, 8)) defs[n].push("legacy(index)");
defs.Incident.push("addon(.XML)");
const redefined = Object.entries(defs).filter(([, d]) => d.length > 1);
console.log(`  names defined >once           ${redefined.length} of ${names.length}`);
console.log(`  deepest redefinition          ${redefined.map(([n, d]) => `${n}=${d.length}`).sort((a, b) => Number(b.split("=")[1]) - Number(a.split("=")[1]))[0]} (${redefined.find(([, d]) => d.length === Math.max(...redefined.map(([, x]) => x.length)))[1].join(" + ")})`);
console.log(`  polysemes (>1 type for a name):`);
for (const [n, distinct, total] of poly) console.log(`    ${n.padEnd(12)} ${distinct} senses over ${total} occurrences`);
console.log(`\nFIXTURE-PROSE census`);
console.log(`  all files                     ${count("", P)}`);
console.log(`  markdown/txt                  ${count("\\( -name '*.md' -o -name '*.txt' \\)", P)}`);
console.log(`  .sql                          ${count("-name '*.sql'", P)}`);
