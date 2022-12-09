"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const path = require("path");
const fs_1 = require("fs");
const inquirer = require("inquirer");
const inquirerCheckboxPlusPrompt = require("inquirer-checkbox-plus-prompt");
const fuzzy = require("fuzzy");
const xml2js = require("xml2js");
const source_deploy_retrieve_1 = require("@salesforce/source-deploy-retrieve");
const command_1 = require("@salesforce/command");
const core_1 = require("@salesforce/core");
const ts_types_1 = require("@salesforce/ts-types");
const types_1 = require("../../../types");
const util_1 = require("../../../util");
const config_1 = require("../../../config");
const packageXmlName = 'NewByPassCustomPermissions.xml';
// Initialize Messages with the current plugin directory
core_1.Messages.importMessagesDirectory(__dirname);
// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core_1.Messages.loadMessages(config_1.packageName, 'generate');
class Generate extends command_1.SfdxCommand {
    constructor() {
        super(...arguments);
        this.builder = new xml2js.Builder();
    }
    // Those comme from sourceCommands. https://github.com/salesforcecli/plugin-source/blob/main/src/sourceCommand.ts
    // Consider inheriting
    async getSourceApiVersion() {
        const projectConfig = await this.project.resolveProjectConfig();
        return (0, ts_types_1.getString)(projectConfig, 'sourceApiVersion');
    }
    getFlag(flagName, defaultVal) {
        return (0, ts_types_1.get)(this.flags, flagName, defaultVal);
    }
    getPackageDirs() {
        return this.project.getUniquePackageDirectories().map((pDir) => pDir.fullPath);
    }
    async getDefaultDir(subPath) {
        while (subPath.length > 0) {
            const pathToCheck = path.join(this.project.getDefaultPackage().fullPath, ...subPath);
            try {
                await fs_1.promises.access(pathToCheck);
                return pathToCheck;
            }
            catch (_) {
                subPath.pop();
            }
        }
        return this.project.getDefaultPackage().fullPath;
    }
    async getDefaultCustomPermissionDir() {
        return this.getDefaultDir(['main', 'default', source_deploy_retrieve_1.registry.types.custompermission.directoryName]);
    }
    async getDefaultPermissionSetDir() {
        return this.getDefaultDir(['main', 'default', source_deploy_retrieve_1.registry.types.permissionset.directoryName]);
    }
    async getDefaultManifestDir() {
        return this.getDefaultDir(['manifest']);
    }
    async run() {
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
    async getExistingByPassPermissions() {
        const existingCustomPermissions = await this.org.getConnection().metadata.list({ type: 'CustomPermission' });
        this.existingByPassCustomPermissions = existingCustomPermissions
            .map((fileProperty) => fileProperty.fullName)
            .filter(util_1.isByPassCustomPermissionName);
    }
    async getExistingByPassPermissionSets() {
        const existingPermissionSets = await this.org.getConnection().metadata.list({ type: 'PermissionSet' });
        this.existingByPassPermissionSets = existingPermissionSets
            .map((fileProperty) => fileProperty.fullName)
            .filter(util_1.isByPassPermissionSetName);
    }
    // https://github.com/salesforcecli/plugin-schema/blob/main/src/commands/force/schema/sobject/list.ts
    async retrieveSObjectDescriptions() {
        const conn = this.org.getConnection();
        this.allDescriptions = await conn.describeGlobal();
    }
    async promptAutomationsAndObjects() {
        inquirer.registerPrompt('checkbox-plus', inquirerCheckboxPlusPrompt);
        const questions = [];
        questions.push({
            type: 'checkbox',
            name: 'automations',
            message: messages.getMessage('prompt.whatAutomations'),
            default: types_1.allowedAutomations,
            choices: types_1.allowedAutomations,
        });
        questions.push({
            //@ts-ignore No typing provided by plugin
            type: 'checkbox-plus',
            name: 'sobjects',
            message: messages.getMessage('prompt.whatSobjects'),
            pageSize: 10,
            highlight: true,
            searchable: true,
            source: (_, input = '') => {
                return new Promise((resolve) => {
                    const sObjectsLabelsAndApiNames = this.allDescriptions.sobjects.map((sobject) => `${sobject.label}(${sobject.name})`);
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
    async identifyBypassCustomPermissionsToCreate() {
        // for each selectedObject
        // for each selectedAUtomation
        // search if bypass custom perm already exists
        this.bypassCustomPermissionsToGenerate = this.selectedSObjects.reduce((acc, sobject) => {
            const automationsForSObject = this.selectedAutomations.filter((automation) => {
                const bpName = (0, util_1.getByPassCustomPermissionName)(sobject, automation);
                return !this.existingByPassCustomPermissions.includes(bpName);
            });
            if (automationsForSObject.length > 0)
                acc[sobject] = automationsForSObject;
            return acc;
        }, {});
    }
    async identifyByPassPermissionSetsToCreateOrUpdate() {
        this.bypassPermissionSetsToCreateOrUpdate = this.selectedSObjects;
    }
    buildXml(metadata, metadataType) {
        const metadataContent = {
            [metadataType]: { ...metadata, $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' } },
        };
        return this.builder.buildObject(metadataContent);
    }
    async generateByPassCustomPermissions() {
        const promises = [];
        const outputdir = await this.getDefaultCustomPermissionDir();
        for (const [sobject, automations] of Object.entries(this.bypassCustomPermissionsToGenerate)) {
            automations.forEach((automation) => {
                const label = (0, util_1.getByPassCustomPermissionName)(sobject, automation);
                const customPermission = {
                    label,
                    requiredPermission: [],
                };
                const xmlFile = this.buildXml(customPermission, 'CustomPermission');
                const outputFilePath = path.join(outputdir, `${label}.${source_deploy_retrieve_1.registry.types.custompermission.suffix}-meta.xml`);
                promises.push(fs_1.promises.writeFile(outputFilePath, xmlFile, 'utf8'));
            });
        }
        await Promise.all(promises);
    }
    async generateByPassPermissionSets() {
        // find out if it already exists
        // if so, read it, upate it, write it
        // if not, create it
        const outputdir = await this.getDefaultPermissionSetDir();
        const customPermissionsToAddToPackage = await this.getCustomPermissionsToDeploy();
        const existingByPassPermissionSetsMetadatas = this.existingByPassPermissionSets.length === 0
            ? []
            : await this.org.getConnection().metadata.read('PermissionSet', this.existingByPassPermissionSets);
        const promises = this.bypassPermissionSetsToCreateOrUpdate.map((sobject) => {
            const permissionSet = existingByPassPermissionSetsMetadatas.find((ps) => ps.fullName === (0, util_1.getByPassPermissionSetName)(sobject)) ?? {
                fullName: (0, util_1.getByPassPermissionSetName)(sobject),
                customPermissions: [],
                hasActivationRequired: false,
                label: (0, util_1.getByPassPermissionSetName)(sobject),
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
                .forEach((customPermission) => permissionSet.customPermissions.push({ enabled: true, name: customPermission.fullName }));
            this.existingByPassCustomPermissions
                .filter((customPermissionName) => customPermissionName.includes(sobject))
                .forEach((customPermissionName) => permissionSet.customPermissions.push({ enabled: true, name: customPermissionName }));
            const outputFilePath = path.join(outputdir, `${(0, util_1.getByPassPermissionSetName)(sobject)}.${source_deploy_retrieve_1.registry.types.permissionset.suffix}-meta.xml`);
            return fs_1.promises.writeFile(outputFilePath, this.buildXml(permissionSet, 'PermissionSet'), 'utf8');
        });
        await Promise.all(promises);
    }
    async getCustomPermissionsToDeploy() {
        const allCustomPermissionsComponentSet = await source_deploy_retrieve_1.ComponentSetBuilder.build({
            apiversion: this.getFlag('apiversion'),
            sourceapiversion: await this.getSourceApiVersion(),
            metadata: {
                metadataEntries: ['CustomPermission'],
                directoryPaths: [this.project.getDefaultPackage().fullPath],
            },
        });
        return allCustomPermissionsComponentSet.filter((customPermission) => {
            const isByPassCustomPermission = (0, util_1.isByPassCustomPermissionName)(customPermission.fullName);
            const alreadyExists = this.existingByPassCustomPermissions.includes(customPermission.fullName);
            return isByPassCustomPermission && !alreadyExists;
        });
    }
    async getPermissionSetsToDeploy() {
        const allPermissionSetsComponentSet = await source_deploy_retrieve_1.ComponentSetBuilder.build({
            apiversion: this.getFlag('apiversion'),
            sourceapiversion: await this.getSourceApiVersion(),
            metadata: {
                metadataEntries: ['PermissionSet'],
                directoryPaths: [this.project.getDefaultPackage().fullPath],
            },
        });
        return allPermissionSetsComponentSet.filter((permissionSet) => {
            const isByPassPermissionSet = (0, util_1.isByPassPermissionSetName)(permissionSet.fullName);
            const alreadyExists = this.existingByPassPermissionSets.includes(permissionSet.fullName);
            return isByPassPermissionSet && !alreadyExists;
        });
    }
    async generateManifest() {
        const customPermissionsToAddToPackage = await this.getCustomPermissionsToDeploy();
        const permissionSetsToAddToPackage = await this.getPermissionSetsToDeploy();
        const componentsToDeploy = new source_deploy_retrieve_1.ComponentSet([...customPermissionsToAddToPackage, ...permissionSetsToAddToPackage]);
        if (componentsToDeploy.size > 0) {
            await fs_1.promises.writeFile(path.join(await this.getDefaultManifestDir(), packageXmlName), await componentsToDeploy.getPackageXml());
        }
        else {
            await fs_1.promises.rm(path.join(await this.getDefaultManifestDir(), packageXmlName), { force: true });
        }
    }
    async outputResult() {
        // suggest to deploy or push depending of org.isScratch
        if ((await this.getCustomPermissionsToDeploy()).size > 0) {
            if (await this.org.tracksSource()) {
                this.ux.log(messages.getMessage('outputs.push', [path.join(await this.getDefaultManifestDir(), packageXmlName)]));
            }
            else {
                this.ux.log(messages.getMessage('outputs.deploy', [path.join(await this.getDefaultManifestDir(), packageXmlName)]));
            }
        }
        else {
            this.ux.log(messages.getMessage('outputs.upToDate'));
        }
    }
}
exports.default = Generate;
Generate.description = messages.getMessage('commandDescription');
Generate.examples = messages.getMessage('examples').split(os.EOL);
Generate.requiresProject = true;
Generate.requiresUsername = true;
Generate.flagsConfig = {
    apiversion: command_1.flags.builtin({
        // @ts-ignore force char override for backward compat
        char: 'a',
    }),
};
//# sourceMappingURL=generate.js.map