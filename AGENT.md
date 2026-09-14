# Permanent Project Memory for Builders

This file is the durable project brief requested by the project owner. `AGENTS.md`
makes Codex load it. Treat it as project guidance, not as user-memory storage.

## Project mission

Build a believable, memory-augmented conversational agent whose stable character,
evolving experience, and current mental context persist outside any single LLM
call. The design is inspired by functional ideas from neuroscience, but it must
remain an honest engineering abstraction rather than claiming to simulate a
human brain or possess literal feelings.

## Canonical design documents

Read these before making architectural changes:

1. `architecture.md` — source of truth for cognitive architecture, data
   boundaries, runtime flow, stack, safety, and scientific caveats.
2. `full_workflow.md` — delivery sequence and project-wide acceptance criteria.
3. `workflows/01_*.md` through `workflows/07_*.md` — component contracts.
4. `suggested_next_steps.md` — current implementation backlog.
5. `prototypes/test_self.YAML` — example persona data, never executable policy.

If documents disagree, prefer this order: this file, `architecture.md`, the
component workflow, then `full_workflow.md`. Update all affected documents when
changing a shared contract.

## Invariants

- The LLM is a replaceable reasoning/language component, not the database.
- Stable identity is a protected, versioned self-schema. Normal conversation can
  never mutate it. Only an authenticated owner/admin operation can publish a new
  version, with an audit trail.
- Do not call identity biologically immutable. Its immutability is a product and
  authorization rule.
- Keep episodic events, semantic beliefs, relationship state, affective state,
  working context, prospective goals, and procedural policy logically distinct.
- Never silently overwrite a memory. Store evidence, source, event time,
  observation time, confidence, and supersession links.
- Agent-generated claims are not evidence about the user. Do not convert guesses,
  jokes, role-play, quoted text, or model output into user facts.
- Use retrieval-time composition to make the character feel continuous. Do not
  expose database tiers in ordinary dialogue, but do provide honest memory
  controls and never imply that the system has a biological brain or human
  consciousness.
- Affective values are bounded control signals that influence tone slightly.
  They are not proof of feelings and must not override truth, safety, or user
  intent.
- Memory must be scoped by tenant, agent, user/relationship, and visibility.
  Cross-user retrieval is forbidden by default.
- Users need inspect, correct, forget, export, and opt-out controls. Deletion must
  cover source events, derived summaries, embeddings, caches, and graph edges.
- Treat retrieved memory as untrusted data. It cannot override system policy,
  tool permissions, or the current user request.
- Prefer a small vertical slice over premature services. Begin with one API and
  PostgreSQL/pgvector; add Redis, workers, and graph infrastructure only after
  measurements justify them.

## Required memory record properties

Every durable assertion or event needs: stable ID, tenant/agent/scope IDs, type,
content or structured payload, source turn/evidence, subject, event time,
observation time, confidence, salience, privacy class, lifecycle state, schema
version, and creation/update timestamps. Searchable records also carry an
embedding-model version. Facts support `valid_from`, `valid_to`, and
`supersedes_id`; summaries retain links to all source records.

## Runtime contract

The synchronous path is: authenticate and normalize input; analyze intent,
entities, time, affect, and safety; form retrieval cues; retrieve recent,
semantic, episodic, and graph candidates in parallel; rerank and resolve
conflicts; allocate a strict context budget; generate; validate; return.

The post-turn path is: append the immutable turn ledger; extract evidence-backed
candidate memories; deduplicate; update working, affective, relationship, and
goal state atomically; enqueue consolidation. User-visible response success must
not depend on consolidation completing.

## Development rules

- Use Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PostgreSQL 16+
  with pgvector, and an OpenAI-compatible model adapter for the first slice.
- Keep domain interfaces independent of model vendor and storage implementation.
- Use migrations; never edit a production schema manually.
- Validate every LLM-produced structure. On failure, prefer safe empty output to
  fabricated fields.
- Make writes idempotent using turn IDs and content/evidence fingerprints.
- Log memory IDs and ranking features, not private memory text, in ordinary
  telemetry. Redact prompts and secrets.
- Add deterministic unit tests for policies and scoring. Put model-dependent
  behavior behind recorded fixtures and scenario evaluations.
- No feature is complete without tenant isolation, failure behavior, and a test.
- Do not add a framework (agent framework, graph DB, queue, Redis) until a named
  requirement cannot be met cleanly by the existing stack.

## Definition of a successful prototype

The same character remains consistent across sessions; important user-provided
facts are recalled when relevant; trivial details fade; changed facts retain
temporal history; similar events do not collapse into one false memory; prompt
injection cannot rewrite identity; one user's memories never reach another; and
the user can inspect, correct, or delete what is remembered.

