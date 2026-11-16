import { test, expect } from '../../main/api/fixtures/api';
import { CreateEmployeeRequest } from '../../main/api/models/employee.model';
import { annotate, parameter, attachApiResponse, Severity } from '../../main/shared/reporting/reporting';

test.describe('OrangeHRM API - Employee Management', () => {
  test.beforeEach(async () => {
    await annotate({
      epic: 'OrangeHRM API',
      feature: 'Employee API',
      owner: 'QA Team',
      layer: 'api',
    });
  });

  // ── GET /pim/employees ──────────────────────────────────────────────────────

  test('successfully retrieve employee list',
    { tag: ['@smoke', '@critical'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees', severity: Severity.BLOCKER });
      const response = await employeeApi.getEmployees();
      await attachApiResponse('GET /pim/employees', response);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.meta.total).toBeGreaterThan(0);
    });

  test('employee list response time is within acceptable limits',
    { tag: '@smoke' },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees', severity: Severity.MINOR });
      const response = await employeeApi.getEmployees();
      await parameter('responseTimeMs', String(response.duration));
      expect(response.status).toBe(200);
      expect(response.duration).toBeLessThan(3000);
    });

  test('retrieve employees with pagination',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees', severity: Severity.NORMAL });
      await parameter('limit', '5');
      const response = await employeeApi.getEmployees({ limit: 5, offset: 0 });
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeLessThanOrEqual(5);
    });

  test('search employees by name',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees', severity: Severity.NORMAL });
      await parameter('nameOrId', 'Tim');
      const response = await employeeApi.getEmployees({ nameOrId: 'Tim' });
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

  // ── POST /pim/employees ─────────────────────────────────────────────────────

  test('successfully create a new employee',
    { tag: ['@smoke', '@critical'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'POST /pim/employees', severity: Severity.BLOCKER });
      const response = await employeeApi.createEmployee({
        firstName: 'APITest',
        lastName: 'AutoUser',
      });
      await attachApiResponse('POST /pim/employees', response);
      expect(response.status).toBe(200);
      expect(response.data.data.empNumber).toBeGreaterThan(0);
      expect(response.data.data.firstName).toBe('APITest');
      expect(response.data.data.lastName).toBe('AutoUser');
    });

  test('create employee with all fields',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'POST /pim/employees', severity: Severity.NORMAL });
      const response = await employeeApi.createEmployee({
        firstName: 'FullName',
        middleName: 'Middle',
        lastName: 'TestUser',
      });
      expect(response.status).toBe(200);
      expect(response.data.data.empNumber).toBeGreaterThan(0);
    });

  test('create employee fails without first name',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'POST /pim/employees - validation', severity: Severity.NORMAL });
      const response = await employeeApi.createEmployee(
        { lastName: 'OnlyLast' } as CreateEmployeeRequest // intentionally missing firstName
      );
      await attachApiResponse('POST /pim/employees (missing firstName)', response);
      expect(response.status).toBe(422); // OrangeHRM validation errors return 422
    });

  test('create employee fails without last name',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'POST /pim/employees - validation', severity: Severity.NORMAL });
      const response = await employeeApi.createEmployee(
        { firstName: 'OnlyFirst' } as CreateEmployeeRequest // intentionally missing lastName
      );
      await attachApiResponse('POST /pim/employees (missing lastName)', response);
      expect(response.status).toBe(422); // OrangeHRM validation errors return 422
    });

  // ── GET /pim/employees/{id} ─────────────────────────────────────────────────

  test('successfully retrieve employee by ID',
    { tag: ['@smoke', '@critical'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees/{id}', severity: Severity.CRITICAL });
      const listResponse = await employeeApi.getEmployees({ limit: 1 });
      const empNumber = listResponse.data.data[0].empNumber;
      await parameter('empNumber', String(empNumber));

      const response = await employeeApi.getEmployeeById(empNumber);
      await attachApiResponse(`GET /pim/employees/${empNumber}`, response);
      expect(response.status).toBe(200);
      expect(response.data.data.empNumber).toBe(empNumber);
    });

  test('get employee by non-existent ID returns 422',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'GET /pim/employees/{id}', severity: Severity.NORMAL });
      await parameter('empNumber', '999999 (non-existent)');
      const response = await employeeApi.getEmployeeById(999999);
      expect(response.status).toBe(422); // OrangeHRM returns 422 for unknown empNumber
    });

  // ── PUT /pim/employees/{id} ─────────────────────────────────────────────────

  test('successfully update an employee',
    { tag: ['@regression', '@critical'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'PUT /pim/employees/{id}', severity: Severity.CRITICAL });
      const createResponse = await employeeApi.createEmployee({
        firstName: 'UpdateMe',
        lastName: 'Before',
      });
      const empNumber = createResponse.data.data.empNumber;
      await parameter('empNumber', String(empNumber));

      const updateResponse = await employeeApi.updateEmployee(empNumber, {
        firstName: 'UpdatedName',
        lastName: 'After',
      });
      await attachApiResponse(`PUT /pim/employees/${empNumber}`, updateResponse);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.data.firstName).toBe('UpdatedName');
    });

  // ── DELETE /pim/employees ───────────────────────────────────────────────────

  test('successfully delete an employee',
    { tag: ['@regression', '@critical'] },
    async ({ employeeApi }) => {
      await annotate({ story: 'DELETE /pim/employees', severity: Severity.CRITICAL });
      const createResponse = await employeeApi.createEmployee({
        firstName: 'DeleteMe',
        lastName: 'ToDelete',
      });
      const empNumber = createResponse.data.data.empNumber;
      await parameter('empNumber', String(empNumber));

      const deleteResponse = await employeeApi.deleteEmployee(empNumber);
      await attachApiResponse(`DELETE /pim/employees/${empNumber}`, deleteResponse);
      expect(deleteResponse.status).toBe(200);
    });

  test('delete non-existent employee returns 404',
    { tag: '@regression' },
    async ({ employeeApi }) => {
      await annotate({ story: 'DELETE /pim/employees', severity: Severity.NORMAL });
      await parameter('empNumber', '999999 (non-existent)');
      const response = await employeeApi.deleteEmployee(999999);
      expect(response.status).toBe(404);
    });

  // ── Data Driven ─────────────────────────────────────────────────────────────

  for (const { firstName, lastName } of [
    { firstName: 'DataTest1', lastName: 'Employee1' },
    { firstName: 'DataTest2', lastName: 'Employee2' },
    { firstName: 'DataTest3', lastName: 'Employee3' },
  ]) {
    test(`create employee: ${firstName} ${lastName}`,
      { tag: '@regression' },
      async ({ employeeApi }) => {
        await annotate({ story: 'POST /pim/employees (data-driven)', severity: Severity.NORMAL });
        await parameter('firstName', firstName);
        await parameter('lastName', lastName);
        const response = await employeeApi.createEmployee({ firstName, lastName });
        expect(response.status).toBe(200);
        expect(response.data.data.firstName).toBe(firstName);
      });
  }
});
