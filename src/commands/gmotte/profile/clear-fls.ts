import * as os from 'os';
// import * as path from 'path';
// import { promises as fs } from 'fs';
// import * as inquirer from 'inquirer';
// import * as inquirerCheckboxPlusPrompt from 'inquirer-checkbox-plus-prompt';
// import * as fuzzy from 'fuzzy';
// import * as xml2js from 'xml2js';

import { SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { Optional, getString, get } from '@salesforce/ts-types';

import { packageName } from '../../../config';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(packageName, 'clear-fls');

export default class ClearFls extends SfdxCommand {
  public static readonly description = messages.getMessage('commandDescription');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;

  protected static flagsConfig = {};
  protected existingProfiles: string[];

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

  public async run(): Promise<void> {
    // get the list of profiles and their FLS
    await this.getExistingProfiles();
    // delete the FLS
    await this.deleteFLSForProfile();
  }

  protected async getExistingProfiles(): Promise<void> {
    this.existingProfiles = await (
      await this.org.getConnection().metadata.list({ type: 'Profile' })
    ).map((profile) => profile.fullName);
  }

  protected async deleteFLSForProfile(): Promise<void> {
    const profile = await this.org.getConnection().metadata.read('Profile', 'CH - Minimum Access');

    profile.fieldPermissions = profile.fieldPermissions.map((fieldPermission) => ({
      ...fieldPermission,
      readable: false,
      editable: false,
    }));
    profile.tabVisibilities = [];
    const result = await this.org.getConnection().metadata.update('Profile', profile);
    this.ux.logJson(result);
  }

  protected async outputResult() {}
}
