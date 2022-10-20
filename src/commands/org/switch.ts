import * as os from 'os';
import * as inquirer from 'inquirer';
import { SfdxCommand, flags } from '@salesforce/command';
import { Messages, AuthInfo, Config, SfError} from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';


// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('gmotte', 'switch');

export default class Switch extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  public static args = [];

  protected static flagsConfig = {
    global: flags.boolean({
      char: 'g',
      description: messages.getMessage('flags.global.summary'),
    }),
  };

  public async run(): Promise<AnyJson> {


    const { flags } = await this.parse(Switch);
    console.log(flags);
    
    const devHubAuthInfos = await AuthInfo.getDevHubAuthInfos();
    const orgInfos = await AuthInfo.listAllAuthorizations();

    const defaultDevhubUsername = this.configAggregator.getConfigInfo().find(c=>c.key === 'defaultdevhubusername')?.value;
    const defaultUsername = this.configAggregator.getConfigInfo().find(c=>c.key === 'defaultdevhubusername')?.value;

    const questions: inquirer.DistinctQuestion[] = [];
    if(devHubAuthInfos.length > 0){
      questions.push({
        type:'list',
        name:'defaultdevhubusername',
        message:'Quel Devhub ?',
        default:devHubAuthInfos.find(devhub=>devhub.username === defaultDevhubUsername),
        choices:devHubAuthInfos.map(devhub=>({
          name: devhub.aliases.join(", ")+"("+devhub.username+")",
          value: devhub.username
        })),
        loop:true
      })
    }
    if(orgInfos.length > 0){
      questions.push({
        type:'list',
        name:'defaultusername',
        message:'Quelle Org ?',
        default:orgInfos.find(org=>org.username === defaultUsername),
        choices:orgInfos.map(org=>({
          name: org.aliases.join(", ")+"("+org.username+")",
          value: org.username
        })),
        loop:true
      })
    }

    const config: Config = await loadConfig(flags.global);

    inquirer.prompt(questions).then(answers=>{
      this.ux.log(answers);
      if(answers.defaultdevhubusername) config.set("defaultdevhubusername", answers.defaultdevhubusername);
      if(answers.defaultusername) config.set("defaultusername", answers.defaultusername);
    } );

    // Return an object to be displayed with --json
    return { defaultDevhubUsername, defaultUsername };
  }


}


// grabbed from https://github.com/salesforcecli/plugin-settings/blob/main/src/commands/config/set.ts
const loadConfig = async (global: boolean): Promise<Config> => {
  try {
    const config = await Config.create(Config.getDefaultOptions(global));
    await config.read();
    return config;
  } catch (error) {
    if (error instanceof SfError) {
      error.actions = error.actions || [];
      error.actions.push('Run with --global to set for your entire workspace.');
    }
    throw error;
  }
};
  
