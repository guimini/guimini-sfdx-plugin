import { AllowedAutomationsType } from './types';
declare const getByPassCustomPermissionName: (sobject: string, automation: AllowedAutomationsType) => string;
declare const getByPassPermissionSetName: (sobject: string) => string;
declare const isByPassCustomPermissionName: (name: string) => boolean;
declare const isByPassPermissionSetName: (name: string) => boolean;
export { getByPassCustomPermissionName, isByPassCustomPermissionName, isByPassPermissionSetName, getByPassPermissionSetName, };
