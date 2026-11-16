import { test } from '../../main/api/fixtures/api';
import {
  EmployeeListResponseSchema,
  EmployeeResponseSchema,
  DeleteEmployeeResponseSchema,
} from '../../main/api/models/employee.schema';
import { annotate, parameter, Severity } from '../../main/shared/reporting/reporting';

/**
 * Contract / schema validation.
 *
 * These don't re-check status codes or business behavior (the functional
 * specs in employee.spec.ts already own that) — they verify the response
 * BODY actually matches the shape the rest of the framework assumes it has.
 * A status-code-only check would happily pass even if the server silently
 * renamed `empNumber` to `id` or changed `terminationId` from a number to a
 * string; assertMatchesSchema catches that class of regression immediately.
 */
test.describe('OrangeHRM API - Contract Validation', () => {
  test.beforeEach(async () => {
    await annotate({
      epic: 'OrangeHRM API',
      feature: 'Contract Validation',
      owner: 'QA Team',
      layer: 'api',
    });
  });

  test('employee list response matches contract',
    { tag: ['@contract', '@smoke'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees — schema', severity: Severity.CRITICAL });
      const response = await employeeApi.getEmployees({ limit: 5 });

      employeeApi.assertOk(response);
      const parsed = employeeApi.assertMatchesSchema(response, EmployeeListResponseSchema);
      await parameter('employeeCount', String(parsed.data.length));
    });

  test('employee by id response matches contract',
    { tag: ['@contract', '@smoke'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees/{id} — schema', severity: Severity.CRITICAL });
      const list = await employeeApi.getEmployees({ limit: 1 });
      const empNumber = list.data.data[0].empNumber;
      await parameter('empNumber', String(empNumber));

      const response = await employeeApi.getEmployeeById(empNumber);
      employeeApi.assertOk(response);
      employeeApi.assertMatchesSchema(response, EmployeeResponseSchema);
    });

  test('create employee response matches contract',
    { tag: '@contract' },
    async ({ employeeApi }) => {
      await annotate({ story: 'POST /pim/employees — schema', severity: Severity.NORMAL });
      const response = await employeeApi.createEmployee({
        firstName: 'ContractTest',
        lastName: 'SchemaUser',
      });

      employeeApi.assertOk(response);
      const parsed = employeeApi.assertMatchesSchema(response, EmployeeResponseSchema);
      await parameter('empNumber', String(parsed.data.empNumber));
    });

  test('delete employee response matches contract',
    { tag: '@contract' },
    async ({ employeeApi }) => {
      await annotate({ story: 'DELETE /pim/employees — schema', severity: Severity.NORMAL });
      const created = await employeeApi.createEmployee({
        firstName: 'DeleteContract',
        lastName: 'SchemaUser',
      });
      const empNumber = created.data.data.empNumber;
      await parameter('empNumber', String(empNumber));

      const response = await employeeApi.deleteEmployee(empNumber);
      employeeApi.assertOk(response);
      employeeApi.assertMatchesSchema(response, DeleteEmployeeResponseSchema);
    });
});
