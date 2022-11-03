const allowedAutomations = ['VR', 'Flow', 'Trigger'] as const;
type AllowedAutomationsType = typeof allowedAutomations[number];
type BypassCustomPermissionsByObjects = { [sobjectName: string]: Array<AllowedAutomationsType> };

export { allowedAutomations, AllowedAutomationsType, BypassCustomPermissionsByObjects };
