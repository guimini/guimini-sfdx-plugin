import { ComponentSet, RetrieveResult } from '@salesforce/source-deploy-retrieve';
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
    protected getDefaultCustomMetadataDir(): Promise<string>;
    protected getDefaultManifestDir(): Promise<string>;
    protected retrievedComponentSet?: ComponentSet;
    protected retrieveResult: RetrieveResult;
    protected allDescriptions: DescribeGlobalResult;
    protected selectedAutomations: AllowedAutomationsType[];
    protected selectedSObjects: string[];
    protected bypassCustomPermissionsToGenerate: BypassCustomPermissionsByObjects;
    run(): Promise<void>;
    protected retrieveCustomPermissions(): Promise<void>;
    protected retrieveSObjectDescriptions(): Promise<void>;
    protected promptAutomationsAndObjects(): Promise<void>;
    protected identifyBypassCustomPermissionsToCreate(): Promise<void>;
    protected generateCustomPermissions(): Promise<void>;
    protected getCustomPermissionsToDeploy(): Promise<ComponentSet>;
    protected generateManifest(): Promise<void>;
    protected outputResult(): Promise<void>;
}
