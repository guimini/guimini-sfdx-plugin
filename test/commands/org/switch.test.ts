import { expect, test } from '@salesforce/command/lib/test';
import { Org } from '@salesforce/core';
// import { ensureJsonMap, ensureString } from '@salesforce/ts-types';

describe('org:switch', () => {
  // test
  //   .withOrg({ username: 'test@org.com' }, true)
  //   .withConnectionRequest((request) => {
  //     const requestMap = ensureJsonMap(request);
  //     if (/Organization/.exec(ensureString(requestMap.url))) {
  //       return Promise.resolve({
  //         records: [
  //           {
  //             Name: 'Super Awesome Org',
  //             TrialExpirationDate: '2018-03-20T23:24:11.000+0000',
  //           },
  //         ],
  //       });
  //     }
  //     return Promise.resolve({ records: [] });
  //   })
  //   .stdout()
  //   .command(['hello:org', '--targetusername', 'test@org.com'])
  //   .it('runs hello:org --targetusername test@org.com', (ctx) => {
  //     expect(ctx.stdout).to.contain(
  //       'Hello world! This is org: Super Awesome Org and I will be around until Tue Mar 20 2018!'
  //     );
  //   });

    test
    .stdout()
    .withOrg({[Org.Fields.IS_DEV_HUB]:true, username:"some@email.com"})
    .withOrg({[Org.Fields.IS_DEV_HUB]:true, username:"another@email.com"})
    .withOrg({[Org.Fields.IS_DEV_HUB]:true, username:"third@email.com"})
      .command(['org:switch'])
      .it('should fail to set local config in non project folder', (ctx) => {
        console.log(ctx.stdout);
        expect(ctx.stdout).to.include("This directory does not contain a valid Salesforce DX project.");
      });
});
