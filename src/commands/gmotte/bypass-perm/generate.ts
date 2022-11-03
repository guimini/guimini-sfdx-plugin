import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as inquirer from 'inquirer';
import * as inquirerCheckboxPlusPrompt from 'inquirer-checkbox-plus-prompt';
import * as fuzzy from 'fuzzy';
import * as xml2js from 'xml2js';

import { ComponentSet, ComponentSetBuilder, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { SfdxCommand, flags } from '@salesforce/command';
import { Connection, Messages } from '@salesforce/core';
import { AnyJson, Optional, getString, get } from '@salesforce/ts-types';
import { DescribeGlobalResult } from 'jsforce';

import { allowedAutomations, AllowedAutomationsType, BypassCustomPermissionsByObjects } from '../../../types';
import { getByPassCustomPermissionName, isByPassCustomPermissionName } from '../../../util';

import { packageName } from '../../../config';
const packageXmlName = 'NewByPassCustomPermissions.xml';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(packageName, 'generate');
const spinnerMessages = Messages.loadMessages(packageName, 'spinner');

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

  protected async getDefaultCustomMetadataDir(): Promise<string> {
    const subPath = ['main', 'default', 'customPermissions'];
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

  protected async getDefaultManifestDir(): Promise<string> {
    const subPath = ['manifest'];
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

  protected retrievedComponentSet?: ComponentSet;
  protected retrieveResult: RetrieveResult;
  protected allDescriptions: DescribeGlobalResult;

  protected selectedAutomations: AllowedAutomationsType[];
  protected selectedSObjects: string[];

  protected bypassCustomPermissionsToGenerate: BypassCustomPermissionsByObjects;

  public async run(): Promise<void> {
    // Retrieve Custom Permissions metadata
    await this.retrieveCustomPermissions();

    // get list of sobjects
    await this.retrieveSObjectDescriptions();

    // Prompt to select what automation deserve a BypPass custom permission
    // Prompt to select what objects deserve a ByPass custom permission
    await this.promptAutomationsAndObjects();

    // Identify which BypassPermissions need to be created
    await this.identifyBypassCustomPermissionsToCreate();

    // generate them
    await this.generateCustomPermissions();

    // Generate manifest
    await this.generateManifest();

    await this.outputResult();
  }

  // https://github.com/salesforcecli/plugin-source/blob/main/src/commands/force/source/retrieve.ts
  protected async retrieveCustomPermissions(): Promise<void> {
    this.ux.startSpinner(spinnerMessages.getMessage('retrieve.componentSetBuild'));
    this.retrievedComponentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      metadata: {
        metadataEntries: ['CustomPermission'],
        directoryPaths: [], // this.getPackageDirs(),
      },
    });

    this.ux.setSpinnerStatus(
      spinnerMessages.getMessage('retrieve.sendingRequest', [
        this.retrievedComponentSet.sourceApiVersion || this.retrievedComponentSet.apiVersion,
      ]),
    );
    const mdapiRetrieve = await this.retrievedComponentSet.retrieve({
      usernameOrConnection: this.org.getUsername(),
      merge: true,
      output: this.project.getDefaultPackage().fullPath,
    });

    this.ux.setSpinnerStatus(spinnerMessages.getMessage('retrieve.polling'));
    this.retrieveResult = await mdapiRetrieve.pollStatus({ timeout: Duration.minutes(2) });

    this.ux.stopSpinner();
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
    // search in  custom permission already exists in componentSet
    this.bypassCustomPermissionsToGenerate = this.selectedSObjects.reduce<BypassCustomPermissionsByObjects>(
      (acc: BypassCustomPermissionsByObjects, sobject) => {
        const automationsForSObject = this.selectedAutomations.filter((automation) => {
          const bpName = getByPassCustomPermissionName(sobject, automation);
          if (this.retrievedComponentSet.find((component) => component.fullName === bpName)) return false;
          return true;
        });
        if (automationsForSObject.length > 0) acc[sobject] = automationsForSObject;
        return acc;
      },
      {},
    );
  }

  protected async generateCustomPermissions(): Promise<void> {
    // TODO prompt for output dir
    // default : default packagedir, if it exists, ./main/default
    const builder = new xml2js.Builder();
    const promises: Promise<void>[] = [];

    const outputdir = await this.getDefaultCustomMetadataDir();

    for (const [sobject, automations] of Object.entries(this.bypassCustomPermissionsToGenerate)) {
      automations.forEach((automation) => {
        const label = getByPassCustomPermissionName(sobject, automation);
        const customPermission: AnyJson = {
          CustomPermission: {
            $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' },
            isLicensed: false,
            label,
          },
        };
        const xmlFile = builder.buildObject(customPermission);
        const outputFilePath = path.join(outputdir, `${label}.customPermission-meta.xml`);
        promises.push(fs.writeFile(outputFilePath, xmlFile, 'utf8'));
      });
    }
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
      const alreadyExists = !!this.retrieveResult.components.find(
        (retrievedCustomPermission) => retrievedCustomPermission.fullName === customPermission.fullName,
      );
      return isByPassCustomPermission && !alreadyExists;
    });
  }

  protected async generateManifest(): Promise<void> {
    const customPermissionsToAddToPackage = await this.getCustomPermissionsToDeploy();
    if (customPermissionsToAddToPackage.size > 0) {
      await fs.writeFile(
        path.join(await this.getDefaultManifestDir(), packageXmlName),
        await customPermissionsToAddToPackage.getPackageXml(),
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
