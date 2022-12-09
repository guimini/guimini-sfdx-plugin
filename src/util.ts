import { allowedAutomations, AllowedAutomationsType } from './types';

const ByPassCustomPermissionRegexString = `^ByPass_(.*)_(${allowedAutomations.join('|')})$`;
const ByPassPermissionSetRegexString = '^ByPass_.*$';

const getByPassCustomPermissionName = (sobject: string, automation: AllowedAutomationsType) =>
  `ByPass_${sobject}_${automation}`;
const getByPassPermissionSetName = (sobject: string) => `ByPass_${sobject}`;

// needs to instanciate a new regex each time otherwise i get flack results. unexplained so far
const isByPassCustomPermissionName = (name: string) => new RegExp(ByPassCustomPermissionRegexString, 'g').test(name);
const isByPassPermissionSetName = (name: string) => new RegExp(ByPassPermissionSetRegexString, 'g').test(name);

export {
  getByPassCustomPermissionName,
  isByPassCustomPermissionName,
  isByPassPermissionSetName,
  getByPassPermissionSetName,
};
