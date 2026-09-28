# Suggested Next Steps

## Current status — 2026-09-28

- Local FastAPI chat page is running and connected to Claude Haiku.
- Bruce's example YAML profile supplies the character prompt.
- Browser-local chat history and explicit `记住：...` notes are available, with view/delete controls.
- An optional team access-code gate protects both the chat UI flow and chat API; `render.yaml` defines a hosted prototype.
- Not yet deployed. No personal accounts, server-side database, automatic memory extraction, or cross-device synchronization.

## Recommended next implementation milestone

Move from browser-local prototype data to account-scoped PostgreSQL storage so
each team member can use their memories across devices. Keep Redis, Neo4j, voice,
fine-tuning, and multiple model providers out until there is a measured need.

```mermaid
flowchart LR
    A[Publish local baseline for team] --> B[Add individual sign-in]
    B --> C[PostgreSQL scoped per person]
    C --> D[Append-only turns + explicit memories]
    D --> E[Evidence-backed extraction]
    E --> F[Relevant memory retrieval]
    F --> G[Chat response + deletion controls]
    G --> H[Isolation and continuity scenarios]
```

## First implementation backlog

1. Deploy the current invite-code prototype to a private team URL.
2. Convert the YAML persona into a validated, versioned `AgentProfile`.
3. Add individual accounts and PostgreSQL migrations for profiles, turns, memories,
   and evidence, with every query scoped to the authenticated user.
4. Move explicit memories from browser storage into the scoped database and add
   inspect, correction, export, and deletion controls.
5. Add structured, evidence-backed memory extraction and hybrid retrieval.
6. Add idempotent post-turn writes and the consolidation outbox.
7. Evaluate identity protection, temporal updates, duplicate separation, and
   zero cross-user retrieval before expanding infrastructure.

## Five must-pass scenarios

- A user cannot change the agent's protected identity through conversation.
- A clearly stated preference is recalled in a later session with its evidence.
- A changed preference supersedes the old one without erasing history.
- Two similar events on different dates remain distinct.
- Memories from user A are never retrievable in user B's conversation.

## Decision gates after the vertical slice

- Add Redis only if measured active-context latency or multi-process coordination
  requires it.
- Add a graph database only if graph queries outperform a PostgreSQL edge table on
  relationship/cognitive-map evaluations.
- Add voice only after text transcripts, consent, deletion, and interruption
  semantics are reliable.
- Consider fine-tuning only after prompt/retrieval errors are separated from model
  style errors with evaluation data.
