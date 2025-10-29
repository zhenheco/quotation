/**
 * 測試權限系統
 * 運行: npx ts-node scripts/test-permissions.ts
 */

// 模擬 hasPermission 函式的轉換邏輯
type PermissionAction = 'read' | 'write' | 'delete' | 'read_cost' | 'write_cost' | 'assign_roles';

function getPermissionName(resource: string, action: PermissionAction): string {
  const actionMapping: Record<PermissionAction, string> = {
    read: 'view',
    write: 'edit',
    delete: 'delete',
    read_cost: 'view_cost',
    write_cost: 'edit_cost',
    assign_roles: 'assign_roles',
  };

  const actionVerb = actionMapping[action] || action;
  const permissionName = `${actionVerb}_${resource}`;

  return permissionName;
}

// 測試案例
const testCases = [
  { resource: 'contracts', action: 'read' as PermissionAction, expected: 'view_contracts' },
  { resource: 'contracts', action: 'write' as PermissionAction, expected: 'edit_contracts' },
  { resource: 'contracts', action: 'delete' as PermissionAction, expected: 'delete_contracts' },
  { resource: 'payments', action: 'read' as PermissionAction, expected: 'view_payments' },
  { resource: 'payments', action: 'write' as PermissionAction, expected: 'edit_payments' },
];

console.log('權限轉換測試：\n');

testCases.forEach(({ resource, action, expected }) => {
  const result = getPermissionName(resource, action);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | hasPermission('${resource}', '${action}') → ${result} (expected: ${expected})`);
});

console.log('\n所有測試完成！');
