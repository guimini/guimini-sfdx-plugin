"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isByPassCustomPermissionName = exports.getByPassCustomPermissionName = void 0;
const types_1 = require("./types");
const ByPassCustomPermissionRegexString = `^ByPass_(.*)_(${types_1.allowedAutomations.join('|')})$`;
const getByPassCustomPermissionName = (sobject, automation) => `ByPass_${sobject}_${automation}`;
exports.getByPassCustomPermissionName = getByPassCustomPermissionName;
// needs to instanciate a new regex each time otherwise i get flack results. unexplained so far
const isByPassCustomPermissionName = (name) => new RegExp(ByPassCustomPermissionRegexString, 'g').test(name);
exports.isByPassCustomPermissionName = isByPassCustomPermissionName;
//# sourceMappingURL=util.js.map