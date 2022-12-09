# @guimini/guimini-sfdx-plugin

[![Version](https://img.shields.io/npm/v/@guimini/guimini-sfdx-plugin.svg)](https://npmjs.org/package/@guimini/guimini-sfdx-plugin)
[![CircleCI](https://circleci.com/gh/guimini/guimini-sfdx-plugin/tree/main.svg?style=shield)](https://circleci.com/gh/guimini/guimini-sfdx-plugin/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/@guimini/guimini-sfdx-plugin.svg)](https://npmjs.org/package/@guimini/guimini-sfdx-plugin)
[![License](https://img.shields.io/npm/l/@guimini/guimini-sfdx-plugin.svg)](https://github.com/guimini/guimini-sfdx-plugin/blob/main/package.json)

Personal sfdx plugin to ease my everyday life

<!-- toc -->
* [@guimini/guimini-sfdx-plugin](#guiminiguimini-sfdx-plugin)
* [Installation](#installation)
* [Commands](#commands)
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->

# Installation

## Recommanded : use direct installer or brew formula to benefit from auto-autpdates

```
brew install --cask sfdx
sfdx plugins:install @guimini/guimini-sfdx-plugin
```

## Early adopter ? use @alpha tag at your own risks :)

```
brew install --cask sfdx
sfdx plugins:install @guimini/guimini-sfdx-plugin@alpha
```

# Commands

<!-- commands -->
* [`sfdx guimini:bypass-perm:generate [-u <string>] [-a <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-guiminibypass-permgenerate--u-string--a-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx guimini:org:switch [-g] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-guiminiorgswitch--g---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx guimini:bypass-perm:generate [-u <string>] [-a <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Interractively generate custom permissions to bypass VR, Flows and Triggers

```
USAGE
  $ sfdx guimini:bypass-perm:generate [-u <string>] [-a <string>] [--json] [--loglevel
    trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

FLAGS
  -a, --apiversion=<value>                                                          override the api version used for
                                                                                    api requests made by this command
  -u, --targetusername=<value>                                                      username or alias for the target
                                                                                    org; overrides default target org
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Interractively generate custom permissions to bypass VR, Flows and Triggers

EXAMPLES
  $ sfdx guimini:bypass-perm:generate
```

_See code: [src/commands/guimini/bypass-perm/generate.ts](https://github.com/guimini/guimini-sfdx-plugin/blob/v0.6.0-alpha.3/src/commands/guimini/bypass-perm/generate.ts)_

## `sfdx guimini:org:switch [-g] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Interractively switch default username and default devhub

```
USAGE
  $ sfdx guimini:org:switch [-g] [--json] [--loglevel
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
  $ sfdx guimini:org:switch

  $ sfdx guimini:org:switch -g
```

_See code: [src/commands/guimini/org/switch.ts](https://github.com/guimini/guimini-sfdx-plugin/blob/v0.6.0-alpha.3/src/commands/guimini/org/switch.ts)_
<!-- commandsstop -->

# Debugging your plugin

We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `guimini:org:switch` command:

1. Start the inspector

If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch:

```sh-session
$ sfdx guimini:org:switch --dev-suspend
```

Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:

```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run guimini:org:switch
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program.
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
   <br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
   Congrats, you are debugging!
