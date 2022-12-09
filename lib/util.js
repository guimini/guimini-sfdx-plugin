"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getByPassPermissionSetName = exports.isByPassPermissionSetName = exports.isByPassCustomPermissionName = exports.getByPassCustomPermissionName = void 0;
const types_1 = require("./types");
const ByPassCustomPermissionRegexString = `^ByPass_(.*)_(${types_1.allowedAutomations.join('|')})$`;
const ByPassPermissionSetRegexString = '^ByPass_.*$';
const getByPassCustomPermissionName = (sobject, automation) => `ByPass_${sobject}_${automation}`;
exports.getByPassCustomPermissionName = getByPassCustomPermissionName;
const getByPassPermissionSetName = (sobject) => `ByPass_${sobject}`;
exports.getByPassPermissionSetName = getByPassPermissionSetName;
// needs to instanciate a new regex each time otherwise i get flack results. unexplained so far
const isByPassCustomPermissionName = (name) => new RegExp(ByPassCustomPermissionRegexString, 'g').test(name);
exports.isByPassCustomPermissionName = isByPassCustomPermissionName;
const isByPassPermissionSetName = (name) => new RegExp(ByPassPermissionSetRegexString, 'g').test(name);
exports.isByPassPermissionSetName = isByPassPermissionSetName;
//# sourceMappingURL=util.js.map