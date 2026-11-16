// ─── Common ───────────────────────────────────────────────────────────────────

export interface ApiMeta {
  total: number;
  href: string;
}

export interface ApiLinks {
  self: string;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface EmployeeName {
  firstName: string;
  middleName: string;
  lastName: string;
}

export interface Employee {
  empNumber: number;
  lastName: string;
  firstName: string;
  middleName: string;
  employeeId: string;
  terminationId: number | null;
}

// ─── Employee List Response ───────────────────────────────────────────────────

export interface EmployeeListResponse {
  data: Employee[];
  meta: ApiMeta;
  rels: unknown[];
}

// ─── Single Employee Response ─────────────────────────────────────────────────

export interface EmployeeResponse {
  data: Employee;
  meta: ApiMeta;
  rels: unknown[];
}

// ─── Create Employee Request ──────────────────────────────────────────────────

export interface CreateEmployeeRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  employeeId?: string;
}

// ─── Update Employee Request ──────────────────────────────────────────────────

export interface UpdateEmployeeRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  employeeId?: string;
}

// ─── Delete Employee Request ──────────────────────────────────────────────────

export interface DeleteEmployeeRequest {
  ids: number[];
}

export interface DeleteEmployeeResponse {
  data: number[];
  meta: ApiMeta;
  rels: unknown[];
}

// ─── Employee Search Params ───────────────────────────────────────────────────

// Type alias (not interface) so it is assignable to the RequestOptions params record
export type EmployeeSearchParams = {
  nameOrId?: string;
  employeeId?: string;
  limit?: number;
  offset?: number;
};
