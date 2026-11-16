import { z } from 'zod';

/**
 * Runtime contract schemas for the Employee API — the runtime counterpart to
 * the compile-time types in employee.model.ts. TypeScript interfaces only
 * describe the shape you *expect*; they don't verify what the server
 * actually sent. These schemas do, via ApiAssertions.assertMatchesSchema(),
 * catching API drift (a field renamed, removed, or retyped server-side)
 * that plain status-code/shape-key checks would miss.
 */

// ─── Common ───────────────────────────────────────────────────────────────────

export const ApiMetaSchema = z.object({
  total: z.number(),
  href: z.string(),
});

// ─── Employee ─────────────────────────────────────────────────────────────────

export const EmployeeSchema = z.object({
  empNumber: z.number(),
  lastName: z.string(),
  firstName: z.string(),
  middleName: z.string(),
  employeeId: z.string(),
  terminationId: z.number().nullable(),
});

// ─── Employee List Response ───────────────────────────────────────────────────

export const EmployeeListResponseSchema = z.object({
  data: z.array(EmployeeSchema),
  meta: ApiMetaSchema,
  rels: z.array(z.unknown()),
});

// ─── Single Employee Response ─────────────────────────────────────────────────

export const EmployeeResponseSchema = z.object({
  data: EmployeeSchema,
  meta: ApiMetaSchema,
  rels: z.array(z.unknown()),
});

// ─── Delete Employee Response ─────────────────────────────────────────────────

export const DeleteEmployeeResponseSchema = z.object({
  data: z.array(z.number()),
  meta: ApiMetaSchema,
  rels: z.array(z.unknown()),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
// Available if you want the Zod-validated type instead of the hand-written
// interface from employee.model.ts — they should always agree.

export type EmployeeParsed = z.infer<typeof EmployeeSchema>;
export type EmployeeListResponseParsed = z.infer<typeof EmployeeListResponseSchema>;
export type EmployeeResponseParsed = z.infer<typeof EmployeeResponseSchema>;
export type DeleteEmployeeResponseParsed = z.infer<typeof DeleteEmployeeResponseSchema>;
