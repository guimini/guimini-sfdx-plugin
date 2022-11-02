import { allowedAutomations, AllowedAutomationsType } from './types';

const ByPassCustomPermissionRegexString = `^ByPass_(.*)_(${allowedAutomations.join('|')})$`;

const getByPassCustomPermissionName = (sobject: string, automation: AllowedAutomationsType) =>
  `ByPass_${sobject}_${automation}`;

// needs to instanciate a new regex each time otherwise i get flack results. unexplained so far
const isByPassCustomPermissionName = (name: string) => new RegExp(ByPassCustomPermissionRegexString, 'g').test(name);

export { getByPassCustomPermissionName, isByPassCustomPermissionName };
