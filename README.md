# gmotte

Personal sfdx plugin to ease my everyday life

[![Version](https://img.shields.io/npm/v/gmotte.svg)](https://npmjs.org/package/gmotte)
[![CircleCI](https://circleci.com/gh/gaelmotte/gmotte-sfdx-plugin/tree/master.svg?style=shield)](https://circleci.com/gh/gaelmotte/gmotte-sfdx-plugin/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/gaelmotte/gmotte-sfdx-plugin?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/gmotte-sfdx-plugin/branch/master)
[![Greenkeeper](https://badges.greenkeeper.io/gaelmotte/gmotte-sfdx-plugin.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/gaelmotte/gmotte-sfdx-plugin/badge.svg)](https://snyk.io/test/github/gaelmotte/gmotte-sfdx-plugin)
[![Downloads/week](https://img.shields.io/npm/dw/gmotte.svg)](https://npmjs.org/package/gmotte)
[![License](https://img.shields.io/npm/l/gmotte.svg)](https://github.com/gaelmotte/gmotte-sfdx-plugin/blob/master/package.json)

<!-- toc -->
* [gmotte](#gmotte)
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g @gaelmotte/gmotte-sfdx-plugin
$ sfdx COMMAND
running command...
$ sfdx (--version)
@gaelmotte/gmotte-sfdx-plugin/0.2.0-alpha.3 linux-x64 node-v19.0.0
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx org:switch [-g] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-orgswitch--g---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx org:switch [-g] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Interractively switch default username and default devhub

```
USAGE
  $ sfdx org:switch [-g] [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -g, --global                                                                      Set the configuration variables
                                                                                    globally, so they can be used from
                                                                                    any Salesforce DX project.
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Interractively switch default username and default devhub

EXAMPLES
  $ sfdx gmotte:org:switch

  $ sfdx gmotte:org:switch -g
```

_See code: [src/commands/org/switch.ts](https://github.com/gaelmotte/gmotte-sfdx-plugin/blob/v0.2.0-alpha.3/src/commands/org/switch.ts)_
<!-- commandsstop -->
<!-- debugging-your-plugin -->

# Debugging your plugin

We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `hello:org` command:

1. Start the inspector

If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch:

```sh-session
$ sfdx hello:org -u myOrg@example.com --dev-suspend
```

Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:

```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run hello:org -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program.
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
   <br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
   Congrats, you are debugging!
