---
name: openspec-spec-management
description: Manage, author, update, and validate living OpenSpec specifications in openspec/specs/. Use when creating or editing domain specs, checking schema compliance with openspec validate, or verifying code implementations against formal requirements.
---

# Skill: OpenSpec Specification Authoring & Validation

This skill provides step-by-step procedures for authoring, editing, navigating, and validating living specifications in the `openspec/specs/` directory using the OpenSpec CLI.

---

## 1. Directory Structure

Living specifications reside in dedicated subdirectories under `openspec/specs/`:

```text
openspec/specs/
├── architecture/
│   └── spec.md
├── auth/
│   └── spec.md
├── score-rendering/
│   └── spec.md
├── audio-sync/
│   └── spec.md
└── catalog/
    └── spec.md
```

Each domain directory contains a single `spec.md` file.

---

## 2. Specification Anatomy & Strict Schema Rules

The OpenSpec CLI strictly parses specification files against its schema. To pass validation, every `spec.md` MUST conform to this exact layout:

```markdown
# <Domain Name> Specification

## Purpose
[A concise description of the purpose, scope, and objectives of this specification domain.]

## Requirements

### Requirement: <Descriptive Requirement Name>
The system SHALL [concise, testable statement using uppercase SHALL or MUST].

#### Scenario: <Scenario Name>
- **GIVEN** [Initial context or precondition]
- **WHEN** [Action or triggering condition]
- **THEN** [Expected observable outcome using SHALL or MUST]
```

### Critical Validation Constraints:
1. **Header Hierarchy**: Must have top-level `# Title`, followed by `## Purpose`, followed by `## Requirements`.
2. **RFC 2119 Keywords**: Every `### Requirement:` body **MUST** contain uppercase **`SHALL`** or **`MUST`**. Lowercase or synonyms (e.g. "will", "should", "shall") fail schema validation.
3. **Scenario Bullets**: Use bolded `- **GIVEN**`, `- **WHEN**`, and `- **THEN**` keywords.

---

## 3. CLI Commands Reference

### List All Specifications
```bash
openspec list --specs
```

### Inspect a Specific Specification
```bash
openspec show <spec-id>
# Example:
openspec show score-rendering
```

### Validate Specifications
Always run validation after modifying any spec file:
```bash
# Validate all living specs:
openspec validate --specs

# Non-interactive with JSON output (safe for scripted automation):
openspec validate --specs --json --no-interactive
```

---

## 4. Authoring Procedure for New Specifications

1. **Identify the Domain**: Choose a concise kebab-case ID (e.g. `video-playback`).
2. **Create the Spec Directory**:
   ```bash
   mkdir -p openspec/specs/<domain-id>
   ```
3. **Draft the Specification**: Create `openspec/specs/<domain-id>/spec.md` following the template in Section 2.
4. **Validate Immediately**:
   ```bash
   openspec validate --specs <domain-id>
   ```
5. **Update the Master Index**: Add the new specification entry to [`OPENSPEC.md`](file:///home/chuck/Projects/www/MVET_Songbook/OPENSPEC.md).
