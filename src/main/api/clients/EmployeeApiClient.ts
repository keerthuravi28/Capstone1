import { ApiResponse } from '../base/ApiClient';
import { ApiAssertions } from '../base/ApiAssertions';
import {
  Employee,
  EmployeeListResponse,
  EmployeeResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  DeleteEmployeeRequest,
  DeleteEmployeeResponse,
  EmployeeSearchParams,
} from '../models/employee.model';
import { aiLogger as apiLogger } from '../../shared/utils/logger';

/**
 * EmployeeApiClient
 * ──────────────────
 * Covers the OrangeHRM PIM Employee REST API.
 *
 * Base path : /api/v2/pim/employees
 *
 * Endpoints:
 *   GET    /pim/employees                                → list employees
 *   POST   /pim/employees                                → create employee
 *   GET    /pim/employees/{empNumber}                    → get by ID
 *   PUT    /pim/employees/{empNumber}/personal-details   → update employee
 *   DELETE /pim/employees                                → delete (bulk by IDs)
 *
 * Note: validation errors and unknown empNumbers return HTTP 422.
 */
export class EmployeeApiClient extends ApiAssertions {

  private readonly basePath = '/pim/employees';

  // ─── GET /pim/employees ──────────────────────────────────────────────────

  /**
   * Retrieve a paginated list of employees.
   * @param params Optional search/filter/pagination params
   */
  async getEmployees(
    params?: EmployeeSearchParams
  ): Promise<ApiResponse<EmployeeListResponse>> {
    apiLogger.info('Fetching employee list', { params });
    return this.get<EmployeeListResponse>(this.basePath, { params });
  }

  /**
   * Convenience: return just the Employee array from the response.
   */
  async getEmployeeList(params?: EmployeeSearchParams): Promise<Employee[]> {
    const response = await this.getEmployees(params);
    return response.data.data;
  }

  // ─── GET /pim/employees/{empNumber} ──────────────────────────────────────

  /**
   * Retrieve a single employee by their empNumber.
   */
  async getEmployeeById(
    empNumber: number
  ): Promise<ApiResponse<EmployeeResponse>> {
    apiLogger.info(`Fetching employee: ${empNumber}`);
    return this.get<EmployeeResponse>(`${this.basePath}/${empNumber}`);
  }

  // ─── POST /pim/employees ─────────────────────────────────────────────────

  /**
   * Create a new employee.
   */
  async createEmployee(
    payload: CreateEmployeeRequest
  ): Promise<ApiResponse<EmployeeResponse>> {
    apiLogger.info(`Creating employee: ${payload.firstName} ${payload.lastName}`);
    return this.post<EmployeeResponse>(this.basePath, payload);
  }

  // ─── PUT /pim/employees/{empNumber}/personal-details ─────────────────────

  /**
   * Update an existing employee's personal details.
   * (A bare PUT on /pim/employees/{empNumber} returns 403 — OrangeHRM exposes
   * updates via the personal-details sub-resource.)
   */
  async updateEmployee(
    empNumber: number,
    payload: UpdateEmployeeRequest
  ): Promise<ApiResponse<EmployeeResponse>> {
    apiLogger.info(`Updating employee: ${empNumber}`, { payload });
    return this.put<EmployeeResponse>(
      `${this.basePath}/${empNumber}/personal-details`,
      payload
    );
  }

  // ─── DELETE /pim/employees ────────────────────────────────────────────────

  /**
   * Delete one or more employees by their empNumber IDs.
   */
  async deleteEmployees(
    ids: number[]
  ): Promise<ApiResponse<DeleteEmployeeResponse>> {
    apiLogger.info(`Deleting employees: [${ids.join(', ')}]`);
    const payload: DeleteEmployeeRequest = { ids };
    return this.delete<DeleteEmployeeResponse>(this.basePath, { data: payload });
  }

  /**
   * Delete a single employee by empNumber.
   */
  async deleteEmployee(empNumber: number): Promise<ApiResponse<DeleteEmployeeResponse>> {
    return this.deleteEmployees([empNumber]);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Search employees by name fragment.
   * Returns matching Employee records.
   */
  async searchByName(nameOrId: string): Promise<Employee[]> {
    const response = await this.getEmployees({ nameOrId });
    return response.data.data;
  }

  /**
   * Get total count of employees.
   */
  async getTotalCount(): Promise<number> {
    const response = await this.getEmployees({ limit: 1 });
    return response.data.meta.total;
  }
}
