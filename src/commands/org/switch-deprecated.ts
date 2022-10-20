import * as os from 'os';
import * as inquirer from 'inquirer';
import { SfdxCommand, flags } from '@salesforce/command';
import { Messages, AuthInfo, Config, SfdxPropertyKeys} from '@salesforce/core';
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

    const devHubAuthInfos = await AuthInfo.getDevHubAuthInfos();
    const orgInfos = await AuthInfo.listAllAuthorizations();

    const defaultDevhubUsername = this.configAggregator.getConfigInfo().find(c=>c.key === 'defaultdevhubusername')?.value;
    const defaultUsername = this.configAggregator.getConfigInfo().find(c=>c.key === 'defaultdevhubusername')?.value;

    const questions: inquirer.DistinctQuestion[] = [];
    if(devHubAuthInfos.length > 0){
      questions.push({
        type:'list',
        name: SfdxPropertyKeys.DEFAULT_DEV_HUB_USERNAME,
        message:'Quel Devhub ?',
        default:devHubAuthInfos.find(devhub=>devhub.username === defaultDevhubUsername),
        choices:devHubAuthInfos.map(devhub=>({
          name: devhub.aliases.join(", ")+"("+devhub.username+")",
          value: devhub.aliases[0] ?? devhub.username
        })),
        loop:true
      })
    }
    if(orgInfos.length > 0){
      questions.push({
        type:'list',
        name: SfdxPropertyKeys.DEFAULT_USERNAME,
        message:'Quelle Org ?',
        default:orgInfos.find(org=>org.username === defaultUsername),
        choices:orgInfos.map(org=>({
          name: org.aliases.join(", ")+"("+org.username+")",
          value: org.aliases[0] ?? org.username
        })),
        loop:true
      })
    }

    const config = await Config.create(Config.getDefaultOptions(this.flags.global as boolean));

    await config.read();

    const answers = await inquirer.prompt(questions);
      
    if(answers[SfdxPropertyKeys.DEFAULT_DEV_HUB_USERNAME ]) config.set(Config.getPropertyConfigMeta(SfdxPropertyKeys.DEFAULT_DEV_HUB_USERNAME)?.key || SfdxPropertyKeys.DEFAULT_DEV_HUB_USERNAME , answers[SfdxPropertyKeys.DEFAULT_DEV_HUB_USERNAME]);
    if(answers[SfdxPropertyKeys.DEFAULT_USERNAME]) config.set(Config.getPropertyConfigMeta(SfdxPropertyKeys.DEFAULT_USERNAME)?.key || SfdxPropertyKeys.DEFAULT_USERNAME , answers[SfdxPropertyKeys.DEFAULT_USERNAME]);
    
    await config.write();
    return config.getContents();
  }


}


  
