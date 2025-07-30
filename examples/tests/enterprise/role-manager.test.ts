/**
 * RoleManager Unit Tests
 * 
 * Tests for enterprise role management, authentication, and permission validation.
 */

import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { RoleManager, RoleConfig, EndpointDefinition } from '../../../src/core/enterprise';

describe('RoleManager', function() {
  let roleManager: RoleManager;

  beforeEach(function() {
    roleManager = new RoleManager();
    // Clear default roles for clean testing
    roleManager['roles'].clear();
  });

  describe('Role Management', function() {
    it('should create a role with required fields', function() {
      const roleConfig: RoleConfig = {
        name: 'test-admin',
        description: 'Test administrator role',
        permissions: ['admin.*', 'users.*'],
        auth: {
          type: 'bearer',
          token: 'test-token-123'
        }
      };

      roleManager.createRole(roleConfig);
      
      const retrievedRole = roleManager.getRole('test-admin');
      expect(retrievedRole).to.not.be.undefined;
      expect(retrievedRole!.name).to.equal('test-admin');
      expect(retrievedRole!.description).to.equal('Test administrator role');
      expect(retrievedRole!.permissions).to.deep.equal(['admin.*', 'users.*']);
      expect(retrievedRole!.auth.type).to.equal('bearer');
      expect(retrievedRole!.auth.token).to.equal('test-token-123');
    });

    it('should create a role with application-controlled permissions (optional)', function() {
      const roleConfig: RoleConfig = {
        name: 'app-controlled',
        description: 'Role with application-controlled permissions',
        auth: {
          type: 'apikey',
          apiKey: 'api-key-456',
          headerName: 'X-API-Key'
        },
        metadata: {
          level: 'external',
          source: 'application'
        }
      };

      roleManager.createRole(roleConfig);
      
      const role = roleManager.getRole('app-controlled');
      expect(role).to.not.be.undefined;
      expect(role!.permissions).to.be.undefined;
      expect(role!.auth.type).to.equal('apikey');
      expect(role!.auth.apiKey).to.equal('api-key-456');
      expect(role!.auth.headerName).to.equal('X-API-Key');
      expect(role!.metadata).to.deep.equal({ level: 'external', source: 'application' });
    });

    it('should prevent creating duplicate roles', function() {
      const roleConfig: RoleConfig = {
        name: 'duplicate-role',
        auth: { type: 'bearer', token: 'token' }
      };

      roleManager.createRole(roleConfig);
      
      expect(() => {
        roleManager.createRole(roleConfig);
      }).to.throw('Role \'duplicate-role\' already exists');
    });

    it('should update existing roles', function() {
      roleManager.createRole({
        name: 'updatable-role',
        description: 'Original description',
        permissions: ['read'],
        auth: { type: 'bearer', token: 'original-token' }
      });

      roleManager.updateRole('updatable-role', {
        description: 'Updated description',
        permissions: ['read', 'write'],
        auth: { type: 'bearer', token: 'updated-token' }
      });

      const updated = roleManager.getRole('updatable-role');
      expect(updated!.description).to.equal('Updated description');
      expect(updated!.permissions).to.deep.equal(['read', 'write']);
      expect(updated!.auth.token).to.equal('updated-token');
    });

    it('should remove roles', function() {
      roleManager.createRole({
        name: 'removable-role',
        auth: { type: 'bearer', token: 'token' }
      });

      expect(roleManager.getRole('removable-role')).to.not.be.undefined;
      
      const removed = roleManager.removeRole('removable-role');
      expect(removed).to.be.true;
      expect(roleManager.getRole('removable-role')).to.be.undefined;
    });

    it('should list all roles', function() {
      roleManager.createRole({ name: 'role1', auth: { type: 'bearer', token: 'token1' } });
      roleManager.createRole({ name: 'role2', auth: { type: 'bearer', token: 'token2' } });
      roleManager.createRole({ name: 'role3', auth: { type: 'bearer', token: 'token3' } });

      const roles = roleManager.listRoles();
      expect(roles).to.have.length(3);
      expect(roles.map(r => r.name)).to.include.members(['role1', 'role2', 'role3']);
    });
  });

  describe('Authentication Provider Creation', function() {
    it('should create Bearer auth provider', function() {
      roleManager.createRole({
        name: 'bearer-role',
        auth: {
          type: 'bearer',
          token: 'bearer-token-123'
        }
      });

      const authProvider = roleManager.getAuthProvider('bearer-role');
      expect(authProvider).to.not.be.undefined;
      // Note: In a real implementation, we'd test the auth provider interface
    });

    it('should create Basic auth provider', function() {
      roleManager.createRole({
        name: 'basic-role',
        auth: {
          type: 'basic',
          username: 'testuser',
          password: 'testpass'
        }
      });

      const authProvider = roleManager.getAuthProvider('basic-role');
      expect(authProvider).to.not.be.undefined;
    });

    it('should create API Key auth provider', function() {
      roleManager.createRole({
        name: 'apikey-role',
        auth: {
          type: 'apikey',
          apiKey: 'api-key-789',
          headerName: 'X-Custom-API-Key'
        }
      });

      const authProvider = roleManager.getAuthProvider('apikey-role');
      expect(authProvider).to.not.be.undefined;
    });

    it('should handle custom auth provider', function() {
      const customAuth = {
        authenticate: async (config: any) => config
      };

      roleManager.createRole({
        name: 'custom-role',
        auth: {
          type: 'custom',
          customAuth
        }
      });

      const authProvider = roleManager.getAuthProvider('custom-role');
      expect(authProvider).to.equal(customAuth);
    });

    it('should throw error for missing auth provider', function() {
      expect(() => {
        roleManager.getAuthProvider('non-existent-role');
      }).to.throw('Role \'non-existent-role\' not found');
    });
  });

  describe('Permission Validation', function() {
    beforeEach(function() {
      // Setup test roles with different permission patterns
      roleManager.createRole({
        name: 'admin',
        permissions: ['*'],
        auth: { type: 'bearer', token: 'admin-token' }
      });

      roleManager.createRole({
        name: 'user-manager',
        permissions: ['users.*', 'reports.read'],
        auth: { type: 'bearer', token: 'manager-token' }
      });

      roleManager.createRole({
        name: 'reader',
        permissions: ['read'],
        auth: { type: 'bearer', token: 'reader-token' }
      });

      roleManager.createRole({
        name: 'app-controlled',
        // No permissions - application controls access
        auth: { type: 'bearer', token: 'app-token' }
      });
    });

    it('should validate wildcard permissions', function() {
      expect(roleManager.hasPermission('admin', 'any.permission')).to.be.true;
      expect(roleManager.hasPermission('admin', 'users.create')).to.be.true;
      expect(roleManager.hasPermission('admin', 'system.admin')).to.be.true;
    });

    it('should validate pattern-based permissions', function() {
      expect(roleManager.hasPermission('user-manager', 'users.create')).to.be.true;
      expect(roleManager.hasPermission('user-manager', 'users.read')).to.be.true;
      expect(roleManager.hasPermission('user-manager', 'users.update')).to.be.true;
      expect(roleManager.hasPermission('user-manager', 'users.delete')).to.be.true;
      
      expect(roleManager.hasPermission('user-manager', 'reports.read')).to.be.true;
      expect(roleManager.hasPermission('user-manager', 'reports.write')).to.be.false;
      expect(roleManager.hasPermission('user-manager', 'system.admin')).to.be.false;
    });

    it('should validate exact permissions', function() {
      expect(roleManager.hasPermission('reader', 'read')).to.be.true;
      expect(roleManager.hasPermission('reader', 'write')).to.be.false;
      expect(roleManager.hasPermission('reader', 'read.users')).to.be.false;
    });

    it('should handle roles without configured permissions', function() {
      // Application-controlled permissions should return false for hasPermission
      // since the application decides access, not the configuration
      expect(roleManager.hasPermission('app-controlled', 'any.permission')).to.be.false;
    });

    it('should return false for non-existent roles', function() {
      expect(roleManager.hasPermission('non-existent', 'any.permission')).to.be.false;
    });
  });

  describe('Active Role Management', function() {
    beforeEach(function() {
      roleManager.createRole({
        name: 'test-role',
        auth: { type: 'bearer', token: 'token' }
      });
    });

    it('should set and get active role', function() {
      expect(roleManager.getActiveRole()).to.be.null;

      roleManager.setActiveRole('test-role');
      const activeRole = roleManager.getActiveRole();
      
      expect(activeRole).to.not.be.null;
      expect(activeRole!.name).to.equal('test-role');
    });

    it('should clear active role when role is removed', function() {
      roleManager.setActiveRole('test-role');
      expect(roleManager.getActiveRole()).to.not.be.null;

      roleManager.removeRole('test-role');
      expect(roleManager.getActiveRole()).to.be.null;
    });

    it('should throw error when setting non-existent active role', function() {
      expect(() => {
        roleManager.setActiveRole('non-existent-role');
      }).to.throw('Role \'non-existent-role\' not found');
    });
  });

  describe('Test Matrix Generation', function() {
    beforeEach(function() {
      roleManager.createRole({
        name: 'admin',
        permissions: ['*'],
        auth: { type: 'bearer', token: 'admin-token' }
      });

      roleManager.createRole({
        name: 'user',
        permissions: ['profile.*'],
        auth: { type: 'bearer', token: 'user-token' }
      });

      roleManager.createRole({
        name: 'app-controlled',
        // No permissions - application controlled
        auth: { type: 'bearer', token: 'app-token' }
      });
    });

    it('should generate test matrix with config-based permissions', function() {
      const endpoints: EndpointDefinition[] = [
        {
          service: 'userService',
          path: '/api/v1/users',
          method: 'GET',
          requiredPermissions: ['users.read']
        },
        {
          service: 'userService',
          path: '/api/v1/profile',
          method: 'GET',
          requiredPermissions: ['profile.read']
        }
      ];

      const matrix = roleManager.generateTestMatrix(
        ['userService'],
        endpoints,
        ['admin', 'user'],
        {
          permissionModel: 'config-based'
        }
      );

      expect(matrix.services).to.deep.equal(['userService']);
      expect(matrix.endpoints).to.have.length(2);
      expect(matrix.roles).to.deep.equal(['admin', 'user']);
      expect(matrix.permissionModel).to.equal('config-based');
      expect(matrix.expectedResults).to.not.be.undefined;

      // Admin should have access to all endpoints
      const adminResults = matrix.expectedResults!['admin'];
      expect(adminResults['GET /api/v1/users']).to.include(200);
      expect(adminResults['GET /api/v1/profile']).to.include(200);

      // User should have access to profile but not users
      const userResults = matrix.expectedResults!['user'];
      expect(userResults['GET /api/v1/users']).to.include(403);
      expect(userResults['GET /api/v1/profile']).to.include(200);
    });

    it('should generate test matrix with application-controlled permissions', function() {
      const endpoints: EndpointDefinition[] = [
        {
          service: 'userService',
          path: '/api/v1/users',
          method: 'GET'
        }
      ];

      const matrix = roleManager.generateTestMatrix(
        ['userService'],
        endpoints,
        ['admin', 'app-controlled'],
        {
          permissionModel: 'application-controlled'
        }
      );

      expect(matrix.permissionModel).to.equal('application-controlled');
      expect(matrix.expectedResults).to.be.undefined;
    });

    it('should use all roles when none specified', function() {
      const matrix = roleManager.generateTestMatrix(
        ['userService'],
        [],
        undefined,
        { permissionModel: 'application-controlled' }
      );

      expect(matrix.roles).to.have.length(3);
      expect(matrix.roles).to.include.members(['admin', 'user', 'app-controlled']);
    });
  });

  describe('Role Testing Statistics', function() {
    it('should track testing statistics', function() {
      roleManager.createRole({
        name: 'test-role',
        auth: { type: 'bearer', token: 'token' }
      });

      // Simulate some test results
      roleManager['roleTestHistory'] = [
        {
          roleName: 'test-role',
          endpoint: '/api/test1',
          method: 'GET',
          statusCode: 200,
          success: true,
          hasAccess: true,
          duration: 100,
          metadata: { expectedBehavior: 'access', permissionSource: 'config' }
        },
        {
          roleName: 'test-role',
          endpoint: '/api/test2',
          method: 'POST',
          statusCode: 403,
          success: false,
          hasAccess: false,
          duration: 50,
          metadata: { expectedBehavior: 'denied', permissionSource: 'application' }
        }
      ];

      const stats = roleManager.getTestingStatistics();

      expect(stats.totalTests).to.equal(2);
      expect(stats.successfulTests).to.equal(1);
      expect(stats.failedTests).to.equal(1);
      expect(stats.accessGranted).to.equal(1);
      expect(stats.accessDenied).to.equal(1);

      expect(stats.roleBreakdown['test-role']).to.deep.equal({
        total: 2,
        success: 1,
        failed: 1,
        accessGranted: 1,
        accessDenied: 1
      });

      expect(stats.permissionAnalysis.configBased).to.equal(1);
      expect(stats.permissionAnalysis.applicationControlled).to.equal(1);
      expect(stats.permissionAnalysis.unknown).to.equal(0);
    });

    it('should clear testing history', function() {
      roleManager['roleTestHistory'] = [
        {
          roleName: 'test',
          endpoint: '/test',
          method: 'GET',
          statusCode: 200,
          success: true,
          hasAccess: true,
          duration: 100
        }
      ];

      expect(roleManager.getTestingStatistics().totalTests).to.equal(1);

      roleManager.clearTestingHistory();
      expect(roleManager.getTestingStatistics().totalTests).to.equal(0);
    });
  });

  describe('Role Import/Export', function() {
    it('should export roles configuration', function() {
      roleManager.createRole({
        name: 'export-role1',
        permissions: ['read'],
        auth: { type: 'bearer', token: 'token1' }
      });

      roleManager.createRole({
        name: 'export-role2',
        permissions: ['write'],
        auth: { type: 'bearer', token: 'token2' }
      });

      const exported = roleManager.exportRoles();

      expect(exported).to.have.property('export-role1');
      expect(exported).to.have.property('export-role2');
      expect(exported['export-role1'].permissions).to.deep.equal(['read']);
      expect(exported['export-role2'].permissions).to.deep.equal(['write']);
    });

    it('should import roles configuration', function() {
      const rolesConfig = {
        'imported-role1': {
          name: 'imported-role1',
          permissions: ['admin.*'],
          auth: { type: 'bearer', token: 'imported-token1' }
        },
        'imported-role2': {
          name: 'imported-role2',
          auth: { type: 'apikey', apiKey: 'imported-key', headerName: 'X-API-Key' }
        }
      };

      roleManager.importRoles(rolesConfig);

      const role1 = roleManager.getRole('imported-role1');
      const role2 = roleManager.getRole('imported-role2');

      expect(role1).to.not.be.undefined;
      expect(role1!.permissions).to.deep.equal(['admin.*']);
      expect(role1!.auth.token).to.equal('imported-token1');

      expect(role2).to.not.be.undefined;
      expect(role2!.auth.type).to.equal('apikey');
      expect(role2!.auth.apiKey).to.equal('imported-key');
    });
  });

  describe('Role Validation', function() {
    it('should validate role configuration on creation', function() {
      expect(() => {
        roleManager.createRole({
          name: '',
          auth: { type: 'bearer', token: 'token' }
        });
      }).to.throw('Role name is required and must be a string');

      expect(() => {
        roleManager.createRole({
          name: 'test',
          permissions: 'invalid' as any,
          auth: { type: 'bearer', token: 'token' }
        });
      }).to.throw('Role permissions must be an array when provided');

      expect(() => {
        roleManager.createRole({
          name: 'test',
          auth: undefined as any
        });
      }).to.throw('Role auth configuration is required');

      expect(() => {
        roleManager.createRole({
          name: 'test',
          auth: { type: 'invalid' as any }
        });
      }).to.throw('Invalid auth type: invalid');
    });

    it('should accept valid role configurations', function() {
      // Valid with permissions
      expect(() => {
        roleManager.createRole({
          name: 'valid-with-permissions',
          permissions: ['read', 'write'],
          auth: { type: 'bearer', token: 'token' }
        });
      }).to.not.throw();

      // Valid without permissions (application-controlled)
      expect(() => {
        roleManager.createRole({
          name: 'valid-without-permissions',
          auth: { type: 'bearer', token: 'token' }
        });
      }).to.not.throw();
    });
  });
});