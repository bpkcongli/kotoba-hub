---
name: kotoba-vocabulary-curriculum-mapping
description: Propose standalone vocabulary skill groups and auditable pending-item membership for KotobaHub flashcards.
---

# Vocabulary group mapping

Follow the [task breakdown](../../../docs/task-breakdown.md) and [vocabulary guide](../../../docs/syllabus/flashcards/vocabulary-authoring-guide.md), especially candidate/runtime boundaries and the curation handoff.

- Group words around a narrow, assessable objective with equivalent English/Indonesian title and objective. Five to ten words is a useful starting point, not a fixed rule; deck segmentation and skill-group size are separate decisions. Explain level/prerequisite fit from the evidence.
- Candidate vocabulary skills may stand independently of lessons. Use ownerType FLASHCARD_VOCABULARY_GROUP, stable proposedSkillCode, lessonSlug null, skillId null and isPublished false. Link explicit member item IDs; a proposed group code must not replace lexical item identity.
- Record one proposed primary group per item in the batch; retain additional themes as context. Preserve existing official ownership in runtimeMapping. Reassignment or a newly proposed skill is an integration proposal, not a permission to mutate syllabus or active seed.
- Current runtime cannot give official progress to lesson-less skills or skills in unpublished lessons. Until VOC-02 provides support, pending items stay pending with null official attribution. Do not create dummy lessons or change publication flags to hide this dependency.
- Account for every assigned item in accepted or held scope. Keep ambiguous sense/group assignments held with a concrete reason. Promotion must preserve item IDs, Leitner/history and session snapshots; current importer rejects skillId changes and ordinary regeneration may create new IDs.
- Call out grouped mastery requirements: repeated success on one word does not prove coverage of the group. Do not claim current last-20-attempt mastery measures vocabulary breadth.

Return curation membership, objective rationale and unresolved runtime dependencies to the parent. This skill does not implement owner-model migrations or edit existing lessons.
