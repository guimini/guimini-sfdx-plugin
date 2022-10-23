"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const inquirer = require("inquirer");
const command_1 = require("@salesforce/command");
const core_1 = require("@salesforce/core");
const config_1 = require("../../../config");
// Initialize Messages with the current plugin directory
core_1.Messages.importMessagesDirectory(__dirname);
// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = core_1.Messages.loadMessages(config_1.packageName, 'switch');
class Switch extends command_1.SfdxCommand {
    async run() {
        const devHubAuthInfos = await core_1.AuthInfo.getDevHubAuthInfos();
        const orgInfos = await core_1.AuthInfo.listAllAuthorizations();
        const defaultDevhubUsername = this.configAggregator.getConfigInfo().find((c) => c.key === 'defaultdevhubusername')
            ?.value;
        const defaultUsername = this.configAggregator.getConfigInfo().find((c) => c.key === 'defaultusername')?.value;
        const questions = [];
        const getAliasOrUsername = (org) => org.aliases[0] ?? org.username;
        if (devHubAuthInfos.length > 0) {
            questions.push({
                type: 'list',
                name: core_1.OrgConfigProperties.TARGET_DEV_HUB,
                message: 'Quel Devhub ?',
                default: getAliasOrUsername(devHubAuthInfos.find((devhub) => devhub.username === defaultDevhubUsername || devhub.aliases.includes(defaultDevhubUsername))),
                choices: devHubAuthInfos.map((devhub) => ({
                    name: devhub.aliases.join(', ') + '(' + devhub.username + ')',
                    value: getAliasOrUsername(devhub),
                })),
                loop: true,
            });
        }
        if (orgInfos.length > 0) {
            questions.push({
                type: 'list',
                name: core_1.OrgConfigProperties.TARGET_ORG,
                message: 'Quelle Org ?',
                default: getAliasOrUsername(orgInfos.find((org) => org.username === defaultUsername || org.aliases.includes(defaultUsername))),
                choices: orgInfos.map((org) => ({
                    name: org.aliases.join(', ') + '(' + org.username + ')',
                    value: getAliasOrUsername(org),
                })),
                loop: true,
            });
        }
        const config = await core_1.Config.create(core_1.Config.getDefaultOptions(this.flags.global));
        await config.read();
        const answers = await inquirer.prompt(questions);
        if (answers[core_1.OrgConfigProperties.TARGET_DEV_HUB])
            config.set(core_1.OrgConfigProperties.TARGET_DEV_HUB, answers[core_1.OrgConfigProperties.TARGET_DEV_HUB]);
        if (answers[core_1.OrgConfigProperties.TARGET_ORG])
            config.set(core_1.OrgConfigProperties.TARGET_ORG, answers[core_1.OrgConfigProperties.TARGET_ORG]);
        await config.write();
        return config.getContents();
    }
}
exports.default = Switch;
Switch.description = messages.getMessage('commandDescription');
Switch.examples = messages.getMessage('examples').split(os.EOL);
Switch.args = [];
Switch.flagsConfig = {
    global: command_1.flags.boolean({
        char: 'g',
        description: messages.getMessage('flags.global.summary'),
    }),
};
//# sourceMappingURL=switch.js.map