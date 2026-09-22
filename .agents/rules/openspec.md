# OpenSpec Spec-Driven Development Rules

These rules govern how AI agents must interact with and maintain OpenSpec specifications and changes in this repository.

## 0. Mandatory Spec-First Rule: Spec Before Code
- **Never implement code before the specification is defined and verified.**
- For every feature addition, modification, or removal, the agent MUST first author or update the corresponding OpenSpec specification in [`openspec/specs/`](file:///home/chuck/Projects/www/MVET_Songbook/openspec/specs/).
- The agent MUST execute and verify `openspec validate --specs` BEFORE writing or modifying any implementation code.

---

## 1. Specification Ground Truth
- The living specifications in [`openspec/specs/`](file:///home/chuck/Projects/www/MVET_Songbook/openspec/specs/) represent the authoritative ground truth for system architecture, authentication, score rendering, audio sync, and catalog ingestion.
- Before modifying core platform behavior, agents MUST check the relevant specification under `openspec/specs/`.

---

## 2. Specification Authoring Standards
When creating or editing specifications in `openspec/specs/`:

1. **Mandatory Sections**:
   - The document MUST contain a `## Purpose` section followed by a `## Requirements` section.
2. **RFC 2119 Requirement Language**:
   - Every requirement under `### Requirement: <Name>` MUST contain either the uppercase keyword **SHALL** or **MUST**. (Lower-case or missing keywords will cause `openspec validate` to fail).
3. **Scenario Formatting**:
   - Scenarios MUST use `#### Scenario: <Name>` followed by bulleted conditions:
     - `- **GIVEN** [precondition]` (optional)
     - `- **WHEN** [action or trigger]`
     - `- **THEN** [expected result]`

---

## 3. Mandatory Validation Gate
- Whenever any specification in `openspec/specs/` or change proposal in `openspec/changes/` is modified, the agent MUST execute:
  ```bash
  openspec validate --specs
  ```
- No task is complete if `openspec validate` reports errors.

---

## 4. Change Proposals for Non-Trivial Features
- For new features, architectural modifications, or breaking changes, use the OpenSpec change workflow:
  - Generate proposal: `/opsx:propose "<feature-name>"`
  - Apply tasks: `/opsx:apply`
  - Merge and archive: `/opsx:archive "<feature-name>"`
