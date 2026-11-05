---
name: PFVL support protocols
description: Protocol numbering requirements for customer support requests.
---

Generate each support protocol from the server's four-digit year and a zero-padded eight-digit sequence. Allocate the sequence atomically in a persistent per-year counter and enforce protocol uniqueness in the database. Never derive a protocol from the number of existing requests.

**Why:** The user explicitly requires protocols to remain unique if requests are deleted and under concurrent submissions.

**How to apply:** Any support-request protocol implementation or migration must preserve the annual counter independently of request rows and commit the counter increment with the request in one transaction.
