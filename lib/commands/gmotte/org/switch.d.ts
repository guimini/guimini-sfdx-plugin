import { SfdxCommand, flags } from '@salesforce/command';
import { AnyJson } from '@salesforce/ts-types';
export default class Switch extends SfdxCommand {
    static description: string;
    static examples: string[];
    static args: any[];
    protected static flagsConfig: {
        global: flags.Discriminated<flags.Boolean<boolean>>;
    };
    run(): Promise<AnyJson>;
}
