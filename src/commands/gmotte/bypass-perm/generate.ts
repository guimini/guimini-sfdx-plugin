import * as os from 'os';
// import * as inquirer from 'inquirer';

import { ComponentSet, ComponentSetBuilder, RetrieveResult } from '@salesforce/source-deploy-retrieve';
import { Duration } from '@salesforce/kit';
import { SfdxCommand, flags } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson, Optional, getString, get } from '@salesforce/ts-types';

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

  public async run(): Promise<AnyJson> {
    // Obtain a valid org from cli default or flag
    // https://github.com/salesforcecli/plugin-source/blob/main/src/commands/force/source/retrieve.ts

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

    return {};
    // Retrieve Custom Permissions metadata
    // get list of sobjects
    // Prompt to select what automation deserve a Bypass custom permission
    // Prompt to select what objects deserve a ByPAss custom permission
    // generate them
    // Generate manifest
  }
}
