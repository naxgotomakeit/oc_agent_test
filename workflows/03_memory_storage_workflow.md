# Workflow 03: Memory Storage

## Mission

Create storage for immutable identity, long-term autobiographical memory, and short-term working memory.

## Memory Levels

Level 1: Core Identity

- Immutable.
- Contains foundational profile data.
- Stored in YAML/JSON for v0.1, PostgreSQL for v0.2.

Level 2: Long-Term Memory

- Slowly changeable.
- Contains important events, preferences, relationship facts, repeated patterns, and consolidated summaries.
- Stored in SQLite for v0.1, PostgreSQL plus pgvector for v0.2.

Level 3: Short-Term Memory

- Fast changing.
- Contains recent messages, current emotion, active goals, temporary observations, and working context.
- Stored in SQLite for v0.1, Redis for v0.2.

## Recommended Metadata

Every memory should support:

- `memory_id`
- `agent_id`
- `user_id`
- `content`
- `memory_type`
- `created_at`
- `last_accessed`
- `importance`
- `emotional_intensity`
- `confidence`
- `strength`
- `source`
- `entities`
- `associations`
- `embedding`
- `expires_at`

## Implementation Requirements

- Keep identity writes separate from normal memory writes.
- Support memory creation, retrieval by ID, semantic search, update, decay, and expiration.
- Store embeddings for searchable memories.
- Support TTL for short-term memory.
- Preserve time history for changed facts instead of overwriting blindly.

## Test Plan

- Create long-term and short-term memories.
- Search memories by semantic similarity.
- Expire short-term memories.
- Reject unauthorized identity mutation.
- Preserve metadata on updates.
- Store changed preferences with temporal context.

## Builder Prompt

Build the storage layer for a three-level memory AI companion. Start with simple local storage, but design interfaces that can move to PostgreSQL plus pgvector for long-term memory and Redis for short-term memory. Every memory must include metadata for importance, confidence, emotional intensity, strength, source, timestamps, entities, associations, and embedding. Write tests for creation, retrieval, TTL expiration, immutable identity protection, and temporal handling of changed facts.

