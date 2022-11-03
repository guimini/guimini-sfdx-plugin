import { AllowedAutomationsType } from './types';
declare const getByPassCustomPermissionName: (sobject: string, automation: AllowedAutomationsType) => string;
declare const isByPassCustomPermissionName: (name: string) => boolean;
export { getByPassCustomPermissionName, isByPassCustomPermissionName };
