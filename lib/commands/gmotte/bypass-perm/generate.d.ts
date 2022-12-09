import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { SfdxCommand, flags } from '@salesforce/command';
import { Optional } from '@salesforce/ts-types';
import { DescribeGlobalResult } from 'jsforce';
import { AllowedAutomationsType, BypassCustomPermissionsByObjects } from '../../../types';
export default class Generate extends SfdxCommand {
    static readonly description: string;
    static readonly examples: string[];
    static readonly requiresProject = true;
    static readonly requiresUsername = true;
    protected static flagsConfig: {
        apiversion: flags.Builtin;
    };
    protected getSourceApiVersion(): Promise<Optional<string>>;
    protected getFlag<T>(flagName: string, defaultVal?: unknown): T;
    protected getPackageDirs(): string[];
    protected getDefaultDir(subPath: string[]): Promise<string>;
    protected getDefaultCustomPermissionDir(): Promise<string>;
    protected getDefaultPermissionSetDir(): Promise<string>;
    protected getDefaultManifestDir(): Promise<string>;
    protected existingByPassCustomPermissions: string[];
    protected existingByPassPermissionSets: string[];
    protected allDescriptions: DescribeGlobalResult;
    protected selectedAutomations: AllowedAutomationsType[];
    protected selectedSObjects: string[];
    protected bypassCustomPermissionsToGenerate: BypassCustomPermissionsByObjects;
    protected bypassPermissionSetsToCreateOrUpdate: string[];
    private builder;
    run(): Promise<void>;
    protected getExistingByPassPermissions(): Promise<void>;
    protected getExistingByPassPermissionSets(): Promise<void>;
    protected retrieveSObjectDescriptions(): Promise<void>;
    protected promptAutomationsAndObjects(): Promise<void>;
    protected identifyBypassCustomPermissionsToCreate(): Promise<void>;
    protected identifyByPassPermissionSetsToCreateOrUpdate(): Promise<void>;
    private buildXml;
    protected generateByPassCustomPermissions(): Promise<void>;
    protected generateByPassPermissionSets(): Promise<void>;
    protected getCustomPermissionsToDeploy(): Promise<ComponentSet>;
    protected getPermissionSetsToDeploy(): Promise<ComponentSet>;
    protected generateManifest(): Promise<void>;
    protected outputResult(): Promise<void>;
}
