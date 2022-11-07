import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as inquirer from 'inquirer';
import * as inquirerCheckboxPlusPrompt from 'inquirer-checkbox-plus-prompt';
import * as fuzzy from 'fuzzy';
import * as xml2js from 'xml2js';

import { ComponentSet, ComponentSetBuilder } from '@salesforce/source-deploy-retrieve';
import { SfdxCommand, flags } from '@salesforce/command';
import { Connection, Messages } from '@salesforce/core';
import { Optional, getString, get } from '@salesforce/ts-types';
import { DescribeGlobalResult } from 'jsforce';

import { allowedAutomations, AllowedAutomationsType, BypassCustomPermissionsByObjects } from '../../../types';
import {
  getByPassCustomPermissionName,
  getByPassPermissionSetName,
  isByPassCustomPermissionName,
  isByPassPermissionSetName,
} from '../../../util';

import { packageName } from '../../../config';
import { ApiSchemaTypes, CustomPermission, Metadata, PermissionSet } from 'jsforce/lib/api/metadata';
const packageXmlName = 'NewByPassCustomPermissions.xml';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(packageName, 'generate');

export default class Generate extends SfdxCommand {
  public static readonly description = messages.getMessage('commandDescription');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;

  protected static flagsConfig = {
    apiversion: flags.builtin({
      // @ts-ignore force char override for backward compat
      char: 'a',
    }),
  };

  // Those comme from sourceCommands. https://github.com/salesforcecli/plugin-source/blob/main/src/sourceCommand.ts
  // Consider inheriting
  protected async getSourceApiVersion(): Promise<Optional<string>> {
    const projectConfig = await this.project.resolveProjectConfig();
    return getString(projectConfig, 'sourceApiVersion');
  }

  protected getFlag<T>(flagName: string, defaultVal?: unknown): T {
    return get(this.flags, flagName, defaultVal) as T;
  }

  protected getPackageDirs(): string[] {
    return this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
  }

  protected async getDefaultDir(subPath: string[]): Promise<string> {
    while (subPath.length > 0) {
      const pathToCheck = path.join(this.project.getDefaultPackage().fullPath, ...subPath);
      try {
        await fs.access(pathToCheck);
        return pathToCheck;
      } catch (_) {
        subPath.pop();
      }
    }
    return this.project.getDefaultPackage().fullPath;
  }

  protected async getDefaultCustomPermissionDir(): Promise<string> {
    return this.getDefaultDir(['main', 'default', 'customPermissions']);
  }

  protected async getDefaultPermissionSetDir(): Promise<string> {
    return this.getDefaultDir(['main', 'default', 'permissionSets']);
  }

  protected async getDefaultManifestDir(): Promise<string> {
    return this.getDefaultDir(['manifest']);
  }

  protected existingByPassCustomPermissions: string[];
  protected existingByPassPermissionSets: string[];
  protected allDescriptions: DescribeGlobalResult;

  protected selectedAutomations: AllowedAutomationsType[];
  protected selectedSObjects: string[];

  protected bypassCustomPermissionsToGenerate: BypassCustomPermissionsByObjects;
  protected bypassPermissionSetsToCreateOrUpdate: string[];

  private builder = new xml2js.Builder();

  public async run(): Promise<void> {
    // get the list of existing Bypass Permissions
    await this.getExistingByPassPermissions();
    await this.getExistingByPassPermissionSets();

    // get list of sobjects
    await this.retrieveSObjectDescriptions();

    // Prompt to select what automation deserve a BypPass custom permission
    // Prompt to select what objects deserve a ByPass custom permission
    await this.promptAutomationsAndObjects();

    // Identify which BypassPermissions need to be created
    await this.identifyBypassCustomPermissionsToCreate();
    await this.identifyByPassPermissionSetsToCreateOrUpdate();

    // generate them
    await this.generateByPassCustomPermissions();

    // identify which ByPassPermissionSet need to be created or updated
    await this.generateByPassPermissionSets();

    // Generate manifest
    await this.generateManifest();

    await this.outputResult();
  }

  protected async getExistingByPassPermissions(): Promise<void> {
    const existingCustomPermissions = await this.org.getConnection().metadata.list({ type: 'CustomPermission' });
    this.existingByPassCustomPermissions = existingCustomPermissions
      .map((fileProperty) => fileProperty.fullName)
      .filter(isByPassCustomPermissionName);
  }

  protected async getExistingByPassPermissionSets(): Promise<void> {
    const existingPermissionSets = await this.org.getConnection().metadata.list({ type: 'PermissionSet' });
    this.existingByPassPermissionSets = existingPermissionSets
      .map((fileProperty) => fileProperty.fullName)
      .filter(isByPassPermissionSetName);
  }

  // https://github.com/salesforcecli/plugin-schema/blob/main/src/commands/force/schema/sobject/list.ts
  protected async retrieveSObjectDescriptions(): Promise<void> {
    const conn: Connection = this.org.getConnection();
    this.allDescriptions = await conn.describeGlobal();
  }

  protected async promptAutomationsAndObjects(): Promise<void> {
    inquirer.registerPrompt('checkbox-plus', inquirerCheckboxPlusPrompt);

    const questions: inquirer.DistinctQuestion[] = [];
    questions.push({
      type: 'checkbox',
      name: 'automations',
      message: messages.getMessage('prompt.whatAutomations'),
      default: allowedAutomations,
      choices: allowedAutomations,
    });
    questions.push({
      //@ts-ignore No typing provided by plugin
      type: 'checkbox-plus',
      name: 'sobjects',
      message: messages.getMessage('prompt.whatSobjects'),
      pageSize: 10,
      highlight: true,
      searchable: true,
      source: (_, input: string = '') => {
        return new Promise((resolve) => {
          const sObjectsLabelsAndApiNames = this.allDescriptions.sobjects.map(
            (sobject) => `${sobject.label}(${sobject.name})`,
          );
          // pre and post options allow the manipulation of shell display color
          const fuzzyResult = fuzzy.filter(input, sObjectsLabelsAndApiNames, { pre: '\x1b[92m', post: '\x1b[39m' });
          const data = fuzzyResult.map(function (element) {
            return {
              name: element.string,
              value: element.original.replace(/^.*\((.*)\)$/g, '$1'),
              short: element.original,
            };
          });

          resolve(data);
        });
      },
    });

    const { automations, sobjects } = await inquirer.prompt(questions);

    this.selectedSObjects = sobjects;
    this.selectedAutomations = automations;
  }

  protected async identifyBypassCustomPermissionsToCreate(): Promise<void> {
    // for each selectedObject
    // for each selectedAUtomation
    // search if bypass custom perm already exists
    this.bypassCustomPermissionsToGenerate = this.selectedSObjects.reduce<BypassCustomPermissionsByObjects>(
      (acc: BypassCustomPermissionsByObjects, sobject) => {
        const automationsForSObject = this.selectedAutomations.filter((automation) => {
          const bpName = getByPassCustomPermissionName(sobject, automation);
          return !this.existingByPassCustomPermissions.includes(bpName);
        });
        if (automationsForSObject.length > 0) acc[sobject] = automationsForSObject;
        return acc;
      },
      {},
    );
  }

  protected async identifyByPassPermissionSetsToCreateOrUpdate(): Promise<void> {
    this.bypassPermissionSetsToCreateOrUpdate = this.selectedSObjects;
  }

  private buildXml<T extends Metadata>(metadata: T, metadataType: keyof ApiSchemaTypes) {
    const metadataContent = {
      [metadataType]: { ...metadata, $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' } },
    };
    return this.builder.buildObject(metadataContent);
  }

  protected async generateByPassCustomPermissions(): Promise<void> {
    const promises: Promise<void>[] = [];

    const outputdir = await this.getDefaultCustomPermissionDir();

    for (const [sobject, automations] of Object.entries(this.bypassCustomPermissionsToGenerate)) {
      automations.forEach((automation) => {
        const label = getByPassCustomPermissionName(sobject, automation);
        const customPermission: CustomPermission = {
          label,
          requiredPermission: [],
        };
        const xmlFile = this.buildXml(customPermission, 'CustomPermission');
        const outputFilePath = path.join(outputdir, `${label}.customPermission-meta.xml`);
        promises.push(fs.writeFile(outputFilePath, xmlFile, 'utf8'));
      });
    }
    await Promise.all(promises);
  }

  protected async generateByPassPermissionSets(): Promise<void> {
    // find out if it already exists
    // if so, read it, upate it, write it
    // if not, create it

    const outputdir = await this.getDefaultPermissionSetDir();
    const customPermissionsToAddToPackage = await this.getCustomPermissionsToDeploy();
    const existingByPassPermissionSetsMetadatas = await this.org
      .getConnection()
      .metadata.read('PermissionSet', this.existingByPassPermissionSets);

    const promises: Promise<void>[] = this.bypassPermissionSetsToCreateOrUpdate.map((sobject) => {
      const permissionSet: PermissionSet = existingByPassPermissionSetsMetadatas.find(
        (ps) => ps.fullName === getByPassPermissionSetName(sobject),
      ) ?? {
        fullName: getByPassPermissionSetName(sobject),
        customPermissions: [],
        hasActivationRequired: false,
        label: getByPassPermissionSetName(sobject),
        applicationVisibilities: [],
        classAccesses: [],
        customMetadataTypeAccesses: [],
        externalDataSourceAccesses: [],
        fieldPermissions: [],
        flowAccesses: [],
        objectPermissions: [],
        pageAccesses: [],
        recordTypeVisibilities: [],
        tabSettings: [],
        userPermissions: [],
      };

      customPermissionsToAddToPackage
        .filter((customPermission) => customPermission.fullName.includes(sobject))
        .toArray()
        .forEach((customPermission) =>
          permissionSet.customPermissions.push({ enabled: true, name: customPermission.fullName }),
        );
      this.existingByPassCustomPermissions
        .filter((customPermissionName) => customPermissionName.includes(sobject))
        .forEach((customPermissionName) =>
          permissionSet.customPermissions.push({ enabled: true, name: customPermissionName }),
        );

      const outputFilePath = path.join(outputdir, `${getByPassPermissionSetName(sobject)}.permissionset-meta.xml`);
      return fs.writeFile(outputFilePath, this.buildXml(permissionSet, 'PermissionSet'), 'utf8');
    });

    await Promise.all(promises);
  }

  protected async getCustomPermissionsToDeploy(): Promise<ComponentSet> {
    const allCustomPermissionsComponentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      metadata: {
        metadataEntries: ['CustomPermission'],
        directoryPaths: [this.project.getDefaultPackage().fullPath],
      },
    });

    return allCustomPermissionsComponentSet.filter((customPermission) => {
      const isByPassCustomPermission = isByPassCustomPermissionName(customPermission.fullName);
      const alreadyExists = this.existingByPassCustomPermissions.includes(customPermission.fullName);
      return isByPassCustomPermission && !alreadyExists;
    });
  }

  protected async getPermissionSetsToDeploy(): Promise<ComponentSet> {
    const allPermissionSetsComponentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      metadata: {
        metadataEntries: ['PermissionSet'],
        directoryPaths: [this.project.getDefaultPackage().fullPath],
      },
    });

    return allPermissionSetsComponentSet.filter((permissionSet) => {
      const isByPassPermissionSet = isByPassPermissionSetName(permissionSet.fullName);
      const alreadyExists = this.existingByPassPermissionSets.includes(permissionSet.fullName);
      return isByPassPermissionSet && !alreadyExists;
    });
  }

  protected async generateManifest(): Promise<void> {
    const customPermissionsToAddToPackage = await this.getCustomPermissionsToDeploy();
    const permissionSetsToAddToPackage = await this.getPermissionSetsToDeploy();
    const componentsToDeploy = new ComponentSet([...customPermissionsToAddToPackage, ...permissionSetsToAddToPackage]);
    if (componentsToDeploy.size > 0) {
      await fs.writeFile(
        path.join(await this.getDefaultManifestDir(), packageXmlName),
        await componentsToDeploy.getPackageXml(),
      );
    } else {
      await fs.rm(path.join(await this.getDefaultManifestDir(), packageXmlName), { force: true });
    }
  }

  protected async outputResult() {
    // suggest to deploy or push depending of org.isScratch
    if ((await this.getCustomPermissionsToDeploy()).size > 0) {
      if (await this.org.tracksSource()) {
        this.ux.log(messages.getMessage('outputs.push'));
      } else {
        this.ux.log(
          messages.getMessage('outputs.deploy', [path.join(await this.getDefaultManifestDir(), packageXmlName)]),
        );
      }
    } else {
      this.ux.log(messages.getMessage('outputs.upToDate'));
    }
  }
}
