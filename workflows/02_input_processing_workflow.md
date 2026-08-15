# Workflow 02: Input Processing

## Mission

Turn raw user input into clean text plus structured signals for retrieval, memory writing, emotion tracking, and response generation.

## Scope

Build the analyzer for text input first. Voice can be added later through STT.

## Pipeline

User message -> cleaning -> intent detection -> entity extraction -> emotion estimation -> memory query generation -> candidate memory write detection.

## Technical Stack

- Backend: Python, FastAPI.
- Schemas: Pydantic.
- Analyzer: LLM structured output for v0.1.
- Optional STT: faster-whisper, OpenAI Whisper, Google Speech-to-Text, or Azure Speech.

## Structured Output

The analyzer should return:

- `clean_text`
- `intent`
- `entities`
- `emotion.label`
- `emotion.intensity`
- `memory_queries`
- `candidate_memories`
- `active_goal_candidates`
- `safety_flags`

## Implementation Requirements

- Keep raw input and normalized input separate.
- Validate all analyzer output with Pydantic.
- Retry or fall back safely if the LLM returns malformed structured output.
- Include time references as explicit extracted values where possible.
- Log analyzer output for debugging retrieval quality.

## Test Plan

- Extract entities from project, person, place, and date references.
- Detect emotional tone such as anxiety, excitement, frustration, or sadness.
- Generate useful memory queries for semantically related recall.
- Handle very short messages.
- Handle slang, typos, and informal phrasing.
- Return safe defaults when analysis fails.

## Builder Prompt

Build an input analyzer for a memory-augmented AI companion. Accept a user message, normalize it, and produce strict structured output containing intent, entities, emotion estimate, memory search queries, candidate memory writes, possible goals, and safety flags. Use an LLM with structured output for the first prototype, wrap it with schema validation and retry behavior, and write tests covering normal, emotional, ambiguous, and malformed inputs.

