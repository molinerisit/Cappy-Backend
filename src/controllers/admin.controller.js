const legacyAdminController = require('./admin/legacy.controller');
const pathAdminController = require('./admin/paths.controller');
const nodeAdminController = require('./admin/nodes.controller');
const userAdminController = require('./admin/users.controller');

module.exports = {
  ...legacyAdminController,
  ...pathAdminController,
  ...nodeAdminController,
  ...userAdminController,
};
