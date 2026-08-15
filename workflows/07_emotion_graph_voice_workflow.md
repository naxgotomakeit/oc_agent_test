# Workflow 07: Emotional State, Cognitive Map, and Voice Extensions

## Mission

Extend the prototype beyond basic memory by adding persistent emotional dynamics, graph-based cognitive maps, and optional voice input/output.

## Emotional State

Represent emotion as numerical state:

- Valence: -1 to +1.
- Arousal: 0 to 1.
- Dominance: 0 to 1.
- Trust: 0 to 1.
- Attachment: 0 to 1.
- Stress: 0 to 1.
- Warmth or concern where useful.

Update rules:

- Apply small deltas from each interaction.
- Clamp all values to valid ranges.
- Decay toward baseline over time.
- Use emotional state to influence tone, not to override task usefulness.

## Cognitive Map

Use graph memory when vector retrieval is not enough.

Graph nodes:

- Agent.
- User.
- People.
- Places.
- Projects.
- Events.
- Concepts.
- Goals.
- Emotions.
- Preferences.

Graph relationships:

- knows.
- works_on.
- studies_at.
- likes.
- worried_about.
- presented_at.
- related_to.
- promised.
- changed_preference_to.

Recommended stack:

- Neo4j for advanced prototype.
- Keep graph retrieval optional and additive.
- Do not let graph facts overwrite immutable identity.

## Voice Extension

Input:

- Microphone -> STT -> text.
- Options: faster-whisper, OpenAI Whisper, Google Speech-to-Text, Azure Speech.

Output:

- Final text -> TTS -> audio.
- Options: OpenAI TTS, ElevenLabs, Azure Neural Voice, XTTS, Coqui.

Requirements:

- Text chat must remain the source of truth.
- Voice should call the same backend chat pipeline.
- Store transcripts, not only audio blobs.
- Clean text before TTS.

## Test Plan

- Emotion values update slowly and remain bounded.
- Emotional state changes tone subtly.
- Graph associations improve recall for related concepts.
- Graph retrieval does not create false facts.
- STT produces usable text for the normal pipeline.
- TTS receives final user-safe text only.

## Builder Prompt

Add advanced extensions to the dual-memory AI companion. Implement numerical emotional state with bounded deltas, decay, and tone influence. Add optional Neo4j graph memory for people, places, projects, events, concepts, relationships, emotions, and goals. Add optional voice input through STT and voice output through TTS while keeping text chat as the canonical pipeline. Write tests for emotion stability, graph-assisted recall, graph safety, transcript handling, and voice pipeline integration.

