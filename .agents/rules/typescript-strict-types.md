# Strict TypeScript Type Safety & No `any` Types Rule

## Objective
Enforce robust compile-time type safety across all client application components, utilities, state engines, and hooks, preventing runtime `ReferenceError` and `TypeError` defects from escaping into production.

---

## 🛡️ Mandatory Typing Standards

**NEVER use the `any` keyword or type assertions using `as any` in TypeScript source files (`.ts`, `.tsx`).**

1. **No Explicit `any`**:
   - Forbidden: `const data: any = ...;`
   - Forbidden: `(osmd as any).Zoom = ...;`
   - Forbidden: `catch (err: any)`
   - Forbidden: `Record<string, any>`

2. **Use `unknown` with Defensive Narrowing**:
   - For unvalidated external input (API responses, `localStorage`, `JSON.parse()`), type variables as `unknown` and perform explicit runtime guards:
     ```typescript
     const raw: unknown = JSON.parse(saved);
     if (raw && typeof raw === 'object' && 'zoom' in raw && typeof (raw as Record<string, unknown>).zoom === 'number') {
       // Safely narrowed
     }
     ```

3. **Type Error Catch Blocks Defensively**:
   - In `catch` blocks, use `catch (err: unknown)`:
     ```typescript
     catch (err: unknown) {
       const message = err instanceof Error ? err.message : String(err);
       console.error("Operation failed:", message);
     }
     ```

4. **Augment Incomplete Third-Party Typings**:
   - When external libraries (e.g. OpenSheetMusicDisplay) omit certain properties from their published `@types` definitions, augment or extend the interface rather than casting to `any`:
     ```typescript
     interface ExtendedOSMD extends OpenSheetMusicDisplay {
       Zoom?: number;
     }
     ```

5. **Type Records and Dictionaries Strongly**:
   - Use `Record<string, unknown>` or specific union values rather than `Record<string, any>`.

---

## Scope & Applicability

This rule applies universally across:
1. All client TypeScript application files under `src/`.
2. All custom React hooks (`src/hooks/`, `src/songbook/useWebAudio.ts`).
3. All shared data contracts and types in `src/types/`.
4. All code modifications authored by AI agents or developers.
