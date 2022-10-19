import * as os from 'os';
import * as inquirer from 'inquirer';
import { SfdxCommand } from '@salesforce/command';
import { Messages, AuthInfo } from '@salesforce/core';
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

  };

  public async run(): Promise<AnyJson> {
    
    const devHubAuthInfos = await AuthInfo.getDevHubAuthInfos();
    const orgInfos = await AuthInfo.listAllAuthorizations();

    const defaultDevhubUsername = this.configAggregator.getConfigInfo().find(c=>c.key === 'defaultdevhubusername')?.value;
    const defaultUsername = this.configAggregator.getConfigInfo().find(c=>c.key === 'defaultdevhubusername')?.value;

    const questions: any[] = [];
    if(devHubAuthInfos.length > 1){
      questions.push({
        type:'list',
        name:'defaultDevhubUsername',
        message:'Quel Devhub ?',
        default:devHubAuthInfos.find(devhub=>devhub.username === defaultDevhubUsername),
        choices:devHubAuthInfos.map(devhub=>devhub.username),
        loop:true
      })
    }

    if(orgInfos.length > 1){
      questions.push({
        type:'list',
        name:'defaultUsername',
        message:'Quelle Org ?',
        default:orgInfos.find(org=>org.username === defaultUsername),
        choices:orgInfos.map(org=>org.username),
        loop:true
      })
    }

    //@ts-ignore
   inquirer.prompt(questions).then(answers=>this.ux.log(JSON.stringify(answers)));

    // Return an object to be displayed with --json
    return { defaultDevhubUsername, defaultUsername };
  }
}
