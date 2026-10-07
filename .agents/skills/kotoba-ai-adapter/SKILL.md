---
name: kotoba-ai-adapter
description: Implement provider-agnostic AI generation, free-response grading, onboarding note normalization, structured validation, and observability for KotobaHub.
---

# AI adapter

Use for `IMP-08`, AI parts of `IMP-09`/`IMP-10`, or review of those paths.

- Read [MVP plan](../../../docs/mvp-plan.md), [AI observability ERD](../../../docs/erd/ai-support-and-observability.md), [practice contract](../../../docs/api-contract/practice.md), and [personalization contract](../../../docs/api-contract/user-profile-and-personalization.md).
- Keep provider calls behind an application port with operations for practice generation, answer grading, placement summary, and study recommendations. Validate structured provider output before mapping it to domain results; reject or retry malformed output through bounded, observable behavior.
- Build the context bundle from authorized user data, syllabus, recent mistakes, weak/mastered skills, current unit, allowed question types, and lesson understanding. Avoid general RAG in MVP and do not place secrets or unrelated user data in prompts.
- Log request/trace IDs, provider/model, latency, usage/cost estimate, parse result, retry count, and failure reason without logging secrets or unnecessary learner text.
- Canonical lesson post-study questions and deterministic objective grading do not depend on AI. User confirmation remains required before AI-derived known-skill claims become learner-profile truth.
- Consult current [OpenAI Responses documentation](https://platform.openai.com/docs/api-reference/responses) when implementing the default provider because SDK and API details can change.
- Follow the DDD class and port conventions in [backend boundaries](../kotoba-backend-boundaries/SKILL.md) for domain models, services, and repository implementations; provider ports remain interfaces and external payloads remain validated plain data.
- Apply the request/response DTO mapping in [backend boundaries](../kotoba-backend-boundaries/SKILL.md) at API endpoints; keep provider payload schemas separate from public HTTP DTOs.
