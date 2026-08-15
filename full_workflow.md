# Full Workflow: Dual-Memory AI Companion Prototype

## Mission Statement

Build a prototype AI companion whose LLM is only the reasoning and language engine, while identity, recent experience, emotional state, and long-term autobiographical memory live in an external memory architecture. The user should experience one continuous character, even though the backend separates immutable identity, slowly evolving long-term memory, and fast-changing short-term working memory.

The prototype should prove that a character can:

- Maintain a stable identity and personality across sessions.
- Recall relevant recent and long-term memories.
- Update short-term memory after each interaction.
- Periodically consolidate important short-term memories into long-term memory.
- Track emotional and relationship state as numerical signals.
- Hide technical memory boundaries from the user by blending retrieved context into one coherent prompt.

## Core Principle

Do not put all memory inside the LLM weights. Keep the LLM replaceable. Use external memory for facts, events, relationships, preferences, goals, and experience. Use prompting, optional fine-tuning, or LoRA only for style, behavior patterns, and character voice.

## System Architecture

The end-to-end flow is:

User input -> input processing -> memory retrieval -> context construction -> LLM generation -> post-processing -> response delivery -> memory extraction -> short-term update -> periodic consolidation -> long-term memory.

The practical architecture has three logical memory levels:

- Level 1: Core identity, immutable. Includes name, origin, foundational traits, core values, core backstory, and non-negotiable worldview anchors.
- Level 2: Long-term autobiographical memory, slowly changeable. Includes important events, relationships, learned preferences, repeated patterns, major emotional moments, and long-term user history.
- Level 3: Working and episodic memory, fast changeable. Includes the current session, recent messages, temporary goals, current mood, recent user situation, active tasks, and transient preferences.

## Recommended Prototype Stack

Start simple, then upgrade.

Version 0.1 stack:

- Frontend: Flutter, or a simple web/mobile client if faster.
- Backend: Python, FastAPI, Pydantic.
- LLM: hosted OpenAI-compatible API, or local Qwen through vLLM if already available.
- Storage: SQLite for initial proof of concept.
- Memory seed: `identity.json` or YAML agent profile.
- Retrieval: simple embedding-backed memory table, or keyword search plus recency/importance scoring.

Version 0.2 stack:

- Backend: FastAPI, Pydantic, SQLAlchemy.
- Long-term memory: PostgreSQL plus pgvector.
- Short-term memory: Redis.
- Embeddings: OpenAI embeddings, BGE, or E5.
- Retrieval orchestration: custom Python first; LangChain or LlamaIndex only if they reduce friction.
- Deployment: Docker Compose for API, database, Redis, and worker.

Version 0.3+ stack:

- Background jobs: Celery plus Redis, or APScheduler for a smaller prototype.
- Consolidation: summarizer, duplicate detector, contradiction detector, promotion rules, decay process.
- Monitoring: Langfuse for LLM traces, Prometheus/Grafana for service metrics, Sentry for errors.
- Voice input: faster-whisper, Whisper API, Google Speech-to-Text, or Azure Speech.
- Voice output: OpenAI TTS, ElevenLabs, Azure Neural Voice, XTTS, or Coqui.
- Advanced graph memory: Neo4j for people, places, events, concepts, relationships, emotions, and goals.

## Component Workflows

### 1. Agent Profile and Core Identity

Create a seed profile before conversation begins. This is the character foundation and should be treated as read-only during normal interactions.

Required profile sections:

- `agent_id`
- Identity: name, gender, age representation, origin, background, relationships.
- Personality: trait scores, speaking style, humor style, emotional tendencies, social behavior.
- Core traits: short descriptors such as curious, empathetic, playful, analytical.
- Core values: honesty, loyalty, curiosity, helping others, boundaries.
- Early experiences: childhood, formative events, education, origin story.
- Communication style: verbosity, formality, humor, warmth, directness.

Implementation direction:

- Store the canonical profile in a structured file for v0.1.
- Move it to PostgreSQL tables for v0.2.
- Create embeddings for identity and autobiographical memory entries so they can be retrieved semantically.
- Protect core identity from user overwrite. If the user contradicts the profile, the agent should answer naturally from character perspective instead of exposing database mechanics.

Testing goals:

- The agent consistently states the same identity across sessions.
- Prompt injection attempts cannot rewrite core identity.
- Retrieved identity facts do not crowd out the user message.

### 2. Input Processing

Convert raw user input into structured signals that retrieval and response generation can use.

Input types:

- Text: accept direct messages from the frontend.
- Voice: microphone -> STT -> normalized text.

Processing tasks:

- Clean and normalize the message.
- Detect intent.
- Extract entities.
- Estimate user emotion and intensity.
- Identify possible memory search queries.
- Capture explicit instructions, promises, goals, and time references.

Suggested structured output fields:

- `intent`
- `entities`
- `emotion.label`
- `emotion.intensity`
- `memory_queries`
- `possible_memory_writes`
- `safety_flags`

Implementation direction:

- Use the main LLM with structured output for early prototypes.
- Keep the schema strict with Pydantic.
- Later, replace or assist the LLM with local classifiers for cheaper repeated analysis.

Testing goals:

- Extracts correct entities from normal messages.
- Detects emotionally salient messages.
- Produces useful retrieval queries.
- Handles empty, short, messy, or slang-heavy input.

### 3. Memory Storage

Separate storage by memory behavior.

Core identity:

- v0.1: YAML or JSON seed file.
- v0.2+: PostgreSQL normalized tables.
- Update policy: immutable except through admin tools or explicit development migrations.

Long-term memory:

- v0.1: SQLite memory table.
- v0.2+: PostgreSQL plus pgvector.
- Stores stable autobiographical events, long-term user facts, relationships, preferences, repeated patterns, and consolidated summaries.

Short-term memory:

- v0.1: SQLite recent messages and session memory tables.
- v0.2+: Redis for fast working memory.
- Stores recent conversation, current emotions, active goals, temporary preferences, current user situation, and transient working context.

Every memory record should include:

- `memory_id`
- `agent_id`
- `user_id` or relationship scope if relevant
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
- `expires_at` when applicable

Testing goals:

- Core identity cannot be updated by normal memory writes.
- Short-term records can expire.
- Long-term memories keep metadata and embeddings.
- Duplicate memories can be detected or merged.

### 4. Retrieval and Ranking

Retrieve only the memories that matter for the current turn.

Retrieval sources:

- Recent conversation buffer: last N messages, usually direct fetch rather than vector search.
- Short-term memory: recent events, goals, emotions, temporary context.
- Long-term memory: autobiographical memories, stable preferences, relationship facts, repeated patterns.
- Core identity: small stable profile always included or selectively included by section.

Ranking formula:

Score = weighted combination of semantic similarity, recency, importance, emotional significance, association strength, confidence, and memory strength.

Example weights for first prototype:

- Semantic similarity: 0.50
- Recency: 0.20
- Importance: 0.15
- Emotional intensity: 0.10
- Association strength: 0.05

Retrieval limits:

- Core identity: concise always-on profile.
- Long-term memory: top 3 to 10 records.
- Short-term memory: top 5 to 10 records.
- Recent messages: last 10 to 30 messages, based on context budget.

Implementation direction:

- Start with a custom retriever and explicit scoring.
- Keep the ranker inspectable; log scores and selected memories.
- Later add graph-assisted retrieval with Neo4j.

Testing goals:

- Relevant memories are retrieved for semantically related input.
- Irrelevant memories are excluded even if old logs are large.
- Recent high-importance events beat stale low-importance events.
- Retrieval output stays under token budget.

### 5. Context Builder

The context builder is the main illusion layer. It merges system identity, relevant memories, current internal state, recent conversation, and the user message into one coherent prompt.

Context sections:

- System instruction and behavior contract.
- Immutable identity summary.
- Relevant long-term autobiographical memories.
- Relevant user relationship and preference facts.
- Current internal state.
- Relevant short-term memories.
- Recent conversation history.
- Current user message.

Rules:

- Do not label memories as database internals in the prompt.
- Format retrieved memory as natural background.
- Keep memory boundaries invisible to the final user.
- Preserve time information when preference or fact changes over time.
- Avoid dumping all memory.
- Include conflict notes when old and new facts differ.

Testing goals:

- Generated prompts are coherent and concise.
- The LLM can answer as one continuous character.
- Contradictory memory is represented with temporal nuance.
- Prompt length remains within model limits.

### 6. LLM Reasoning Core

Use the LLM to produce the conversational response from the constructed context.

Prototype options:

- Hosted API for fastest development.
- Local Qwen, Llama, Mistral, Gemma, or DeepSeek model served through vLLM.

Responsibilities:

- Generate natural dialogue.
- Respect identity and style.
- Use retrieved memory when useful.
- Avoid overexplaining memory mechanics.
- Respond to user emotion and goals.

Implementation direction:

- Keep the model backend behind an interface so hosted and local models can be swapped.
- Store prompt, retrieved memory IDs, model name, latency, token counts, and final response for debugging.
- Use structured output only for analysis tasks, not for the final conversational reply unless needed.

Testing goals:

- Replies remain in character.
- Retrieved memory influences responses naturally.
- The LLM does not claim false identity details.
- Model backend can be replaced without changing memory logic.

### 7. Post-Processing and Output

Before sending the response, apply checks and optional formatting.

Post-processing steps:

- Safety filter or moderation.
- Character consistency check.
- Tone/style adjustment.
- Contradiction check against immutable identity.
- Final text formatting.
- Optional TTS conversion for voice mode.

Regeneration triggers:

- Response contradicts core identity.
- Response reveals internal implementation in an unnatural way.
- Response ignores critical user safety requirements.
- Response is too verbose, too terse, or off-style for the configured character.

Testing goals:

- Identity contradictions are caught.
- Unsafe content is handled according to product policy.
- Voice output receives clean text.
- User-facing response has no debug metadata.

### 8. Memory Extraction and Short-Term Update

After the response is generated, analyze the interaction for memories worth storing. Do not store raw conversation forever as the primary memory strategy.

Extraction inputs:

- User message.
- Agent response.
- Current retrieved memories.
- Current state.

Extraction outputs:

- New episodic memories.
- Updated current emotion.
- Updated active goals.
- User facts or preferences.
- Relationship changes.
- Promises or commitments.
- Candidate contradictions.

Memory write policy:

- Low importance: discard or short TTL.
- Medium importance: keep in short-term memory.
- High importance: mark as consolidation candidate.
- Very high importance: promote or queue for long-term review quickly.

Testing goals:

- Important user events are captured.
- Trivial details are not over-stored.
- Current emotion updates gradually.
- Extraction does not duplicate existing memories.

### 9. Emotional State Model

Represent emotion as computational state that biases behavior, not as a claim of literal feeling.

Suggested dimensions:

- Valence: -1 to +1.
- Arousal: 0 to 1.
- Dominance: 0 to 1.
- Trust: 0 to 1.
- Attachment: 0 to 1.
- Stress: 0 to 1.
- Warmth or concern if useful for the character.

Update rule:

- Apply small deltas from each interaction.
- Clamp values to valid ranges.
- Apply decay so state returns gradually toward baseline.
- Avoid dramatic changes from one message unless an event is highly significant.

Testing goals:

- Positive interactions slowly increase trust or warmth.
- Conflict or broken promises can reduce trust.
- State changes remain bounded.
- Emotional state changes response tone without overwhelming content.

### 10. Consolidation, Decay, and Contradiction Handling

Run a periodic memory process that transforms short-term memory into durable long-term memory.

Consolidation pipeline:

Recent memories -> grouping -> summarization -> importance scoring -> duplicate detection -> contradiction detection -> promotion, merge, or discard -> long-term memory.

Promotion factors:

- Novelty.
- Emotional intensity.
- Repetition.
- User relevance.
- Agent relevance.
- Future usefulness.
- Relationship importance.

Decay:

- Reduce memory strength over time.
- Reinforce memories when accessed or repeated.
- Expire low-strength short-term memories.

Contradictions:

- Do not overwrite old facts blindly.
- Store temporal changes: previous preference, current preference, confidence, changed_at.
- Consolidate into a nuanced long-term memory when stable.

Testing goals:

- Repeated memories consolidate into summaries.
- Important one-time events are preserved.
- Trivial events fade.
- Changed preferences preserve history instead of creating incoherence.

## Build Order

### Phase 0: Documentation and Product Frame

Create the system briefs, schemas, test scenarios, and seed agent profile. Define what counts as successful continuity: identity stability, relevant recall, memory update, and believable forgetting.

### Phase 1: Minimal Chat Prototype

Build a FastAPI chat endpoint with a seed identity profile, recent message buffer, and one LLM backend. The frontend can be Flutter or a minimal client. Store messages and extracted memory in SQLite.

Acceptance criteria:

- User can chat with the agent.
- Agent uses the seed identity.
- Recent messages affect replies.
- Logs capture prompt, response, and memory analysis.

### Phase 2: Basic Memory-Augmented Generation

Add memory extraction, memory records, embeddings, retrieval, ranking, and context building.

Acceptance criteria:

- User facts can be remembered later.
- Similar topics retrieve relevant memories.
- Context contains only selected memories.
- Retrieval scores are inspectable.

### Phase 3: Real Dual-Memory Backend

Move long-term memory to PostgreSQL plus pgvector and short-term memory to Redis. Add TTLs and background cleanup.

Acceptance criteria:

- Short-term and long-term memory have separate storage and update policies.
- Recent context is fast to fetch.
- Long-term semantic retrieval works across sessions.
- Core identity remains protected.

### Phase 4: Consolidation

Add background jobs that summarize, score, merge, decay, and promote memory.

Acceptance criteria:

- Short-term memories are periodically consolidated.
- Duplicates are merged.
- Low-value memories decay or expire.
- Significant events become long-term autobiographical memories.

### Phase 5: Emotional Dynamics

Add numerical internal state and relationship state. Use it in context building and response style.

Acceptance criteria:

- State changes gradually.
- Emotional state influences tone.
- Tests verify clamping, decay, and stability.

### Phase 6: Voice and Interface Polish

Add optional STT and TTS, improve frontend conversation UX, and expose developer memory inspection tools.

Acceptance criteria:

- Text mode remains fully usable.
- Voice input/output can be enabled.
- Developer can inspect retrieved memories, scores, and state.

### Phase 7: Cognitive Map Expansion

Add graph memory for people, places, projects, topics, goals, and relationships.

Acceptance criteria:

- Memory can be retrieved through graph associations.
- Related concepts improve recall beyond vector similarity.
- Graph facts do not conflict with canonical identity or temporal memory.

## Test Strategy

Unit tests:

- Input analysis schema validation.
- Memory scoring and ranking.
- TTL and decay behavior.
- Emotion update and clamping.
- Contradiction detection.
- Context builder token budgeting.

Integration tests:

- Chat endpoint from user message to response.
- Memory extraction and storage.
- Retrieval from long-term and short-term stores.
- Consolidation job promotion and discard behavior.
- LLM backend adapter swap.

Scenario tests:

- Stable identity under user contradiction.
- Remembering a major event across sessions.
- Forgetting trivial details.
- Changing user preferences over time.
- Recalling emotionally relevant memories.
- Blending autobiographical memory with current user context.

Manual evaluation:

- Does the agent feel like one continuous character?
- Does memory improve the answer without becoming creepy or overbearing?
- Does the agent avoid exposing internal memory boundaries?
- Does it remember important things and forget boring things?
- Does it handle changed facts gracefully?

## Prompt for Future Builder

Build this as a staged prototype, not a monolith. Keep the LLM, memory manager, retriever, context builder, memory extractor, and consolidator as separate modules. Start with a minimal working text chat that demonstrates stable identity and recent memory. Then add semantic retrieval, long-term storage, short-term Redis state, consolidation, emotional dynamics, and optional voice. At every stage, write tests that prove the character remains stable, retrieves relevant memories, updates memory after interaction, and does not let normal user messages overwrite immutable identity.

