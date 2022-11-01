import * as os from 'os';
import * as inquirer from 'inquirer';
import * as inquirerCheckboxPlusPrompt from 'inquirer-checkbox-plus-prompt';
import * as fuzzy from 'fuzzy';

import { ComponentSet, ComponentSetBuilder, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { SfdxCommand, flags } from '@salesforce/command';
import { Connection, Messages } from '@salesforce/core';
import { AnyJson, Optional, getString, get } from '@salesforce/ts-types';
import { DescribeGlobalResult } from 'jsforce';

import { packageName } from '../../../config';
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
    manifest: flags.filepath({
      char: 'x',
      description: messages.getMessage('flags.manifest'),
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

  protected componentSet?: ComponentSet;
  protected retrieveResult: RetrieveResult;
  protected allDescriptions: DescribeGlobalResult;

  protected automationsByPassToGenerate: string[];
  protected sobjectsByPassToGenerate: string[];

  public async run(): Promise<AnyJson> {
    // Retrieve Custom Permissions metadata
    await this.retrieveCustomPermissions();

    // get list of sobjects
    await this.retrieveSObjectDescriptions();

    // Prompt to select what automation deserve a BypPass custom permission
    // Prompt to select what objects deserve a ByPass custom permission
    await this.promptAutomationsAndObjects();
    // generate them
    // Generate manifest
    return {};
  }

  // https://github.com/salesforcecli/plugin-source/blob/main/src/commands/force/source/retrieve.ts
  protected async retrieveCustomPermissions(): Promise<void> {
    this.ux.startSpinner(spinnerMessages.getMessage('retrieve.componentSetBuild'));
    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>('apiversion'),
      sourceapiversion: await this.getSourceApiVersion(),
      metadata: {
        metadataEntries: ['CustomPermission'],
        directoryPaths: this.getPackageDirs(),
      },
    });

    this.ux.setSpinnerStatus(
      spinnerMessages.getMessage('retrieve.sendingRequest', [
        this.componentSet.sourceApiVersion || this.componentSet.apiVersion,
      ]),
    );
    const mdapiRetrieve = await this.componentSet.retrieve({
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
      message: 'What automations need a ByPass Custom Permission?',
      default: ['VR', 'Flow', 'Trigger'],
      choices: ['VR', 'Flow', 'Trigger'],
    });
    questions.push({
      //@ts-ignore No typing provided by plugin
      type: 'checkbox-plus',
      name: 'sobjects',
      message: 'What objects need a ByPass Custom Permission?',
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

    this.sobjectsByPassToGenerate = sobjects;
    this.automationsByPassToGenerate = automations;
  }
}
