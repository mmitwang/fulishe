INSERT INTO sys_tenant (id, tenant_name, tenant_code, contact_person, contact_phone, contact_email, address, status, create_time, update_time, deleted) VALUES
(1, '福礼社平台', 'FULISHE', '管理员', '13800138000', 'admin@fulishe.com', '北京市朝阳区', 1, NOW(), NOW(), 0);

INSERT INTO sys_dept (id, dept_name, dept_code, parent_id, sort, status, create_time, update_time, deleted, tenant_id) VALUES
(1, '总部', 'HQ', NULL, 0, 1, NOW(), NOW(), 0, 1),
(2, '技术部', 'TECH', 1, 1, 1, NOW(), NOW(), 0, 1),
(3, '运营部', 'OPS', 1, 2, 1, NOW(), NOW(), 0, 1);

INSERT INTO sys_user (id, username, password, nickname, real_name, mobile, email, gender, status, dept_id, position, avatar, create_time, update_time, deleted, tenant_id) VALUES
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', '管理员', '系统管理员', '13800138000', 'admin@fulishe.com', 1, 1, 1, '系统管理员', NULL, NOW(), NOW(), 0, 1);

INSERT INTO sys_menu (id, menu_name, menu_type, path, component, icon, permission, parent_id, sort, visible, status, create_time, update_time, deleted, tenant_id) VALUES
(1, '系统管理', 'C', '/system', NULL, 'Setting', NULL, NULL, 1, 1, 1, NOW(), NOW(), 0, 1),
(2, '用户管理', 'M', '/system/user', 'system/user/index', 'User', 'sys:user:list', 1, 1, 1, 1, NOW(), NOW(), 0, 1),
(3, '租户管理', 'M', '/system/tenant', 'system/tenant/index', 'OfficeBuilding', 'sys:tenant:list', 1, 2, 1, 1, NOW(), NOW(), 0, 1),
(4, '部门管理', 'M', '/system/dept', 'system/dept/index', 'Location', 'sys:dept:list', 1, 3, 1, 1, NOW(), NOW(), 0, 1),
(5, '角色管理', 'M', '/system/role', 'system/role/index', 'UserFilled', 'sys:role:list', 1, 4, 1, 1, NOW(), NOW(), 0, 1),
(6, '菜单管理', 'M', '/system/menu', 'system/menu/index', 'Menu', 'sys:menu:list', 1, 5, 1, 1, NOW(), NOW(), 0, 1),
(7, '用户新增', 'B', NULL, NULL, NULL, 'sys:user:add', 2, 1, 0, 1, NOW(), NOW(), 0, 1),
(8, '用户编辑', 'B', NULL, NULL, NULL, 'sys:user:edit', 2, 2, 0, 1, NOW(), NOW(), 0, 1),
(9, '用户删除', 'B', NULL, NULL, NULL, 'sys:user:delete', 2, 3, 0, 1, NOW(), NOW(), 0, 1);

INSERT INTO sys_role (id, role_name, role_code, description, status, create_time, update_time, deleted, tenant_id) VALUES
(1, '超级管理员', 'SUPER_ADMIN', '系统超级管理员', 1, NOW(), NOW(), 0, 1),
(2, '管理员', 'ADMIN', '普通管理员', 1, NOW(), NOW(), 0, 1);

INSERT INTO sys_user_role (user_id, role_id, tenant_id) VALUES
(1, 1, 1);

INSERT INTO sys_role_menu (role_id, menu_id, tenant_id) VALUES
(1, 1, 1),
(1, 2, 1),
(1, 3, 1),
(1, 4, 1),
(1, 5, 1),
(1, 6, 1),
(1, 7, 1),
(1, 8, 1),
(1, 9, 1);
