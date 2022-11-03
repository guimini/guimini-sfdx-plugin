declare const allowedAutomations: readonly ["VR", "Flow", "Trigger"];
declare type AllowedAutomationsType = typeof allowedAutomations[number];
declare type BypassCustomPermissionsByObjects = {
    [sobjectName: string]: Array<AllowedAutomationsType>;
};
export { allowedAutomations, AllowedAutomationsType, BypassCustomPermissionsByObjects };
