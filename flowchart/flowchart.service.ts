import * as fs from 'fs';
import * as path from 'path';

import { Module, Injectable, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { ModuleRef, ModulesContainer } from '@nestjs/core';

@Injectable()
export class FlowchartService implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional()
    private readonly config: {
      outputPath: string;
      modulesToIgnore: string[];
      displayAppModule: boolean;
    },
  ) {
    // set defaults if none provided
    this.config = config || {
      outputPath: path.join(__dirname, '..', '..', '..', 'modules-flowchart.md'),
      modulesToIgnore: [
        'FlowchartModule',
      ],
      displayAppModule: false,
    };

    this.modulesToIgnore = new Set<string>(this.config.modulesToIgnore || []);
  }

  private visitedModules = new Set<string>();
  private moduleImportConnections: Array<[string, string]> = [];
  private modulesToIgnore = new Set<string>();

  onModuleInit() {
    this.generateFlowchart();
  }

  generateFlowchart() {
    const moduleContainer = this.moduleRef.get(ModulesContainer, { strict: false });
    const appModuleEntry = Array.from(moduleContainer.values()).find((module) => module.metatype.name === 'AppModule');
    if (!appModuleEntry) throw new Error('AppModule not found');

    this.processModule(appModuleEntry, moduleContainer);

    const flowchartLines = ['flowchart TD'];
    this.moduleImportConnections.forEach(([source, target]) => {
      flowchartLines.push(`${source} --> ${target};`);
    });
    const flowchart = flowchartLines.join('\n');

    // write to file on the root of the project
    if (this.config.outputPath) {
      fs.writeFileSync(this.config.outputPath, flowchart);
    }

    return flowchart;
  }

  private processModule(module: any, moduleContainer: ModulesContainer) {
    const moduleName = module.metatype.name;

    // did i already process this module?
    if (this.visitedModules.has(moduleName)) {
      return;
    }

    // mark this module as visited
    this.visitedModules.add(moduleName);

    // get the imports of the module
    const imports = Array.from<typeof Module>(module.imports);

    imports.forEach((importModule) => {
      if (this.modulesToIgnore.has(importModule.name)) return;

      const shouldAddConnection =
        (this.config.displayAppModule && moduleName === 'AppModule') || moduleName != 'AppModule';

      if (shouldAddConnection) {
        this.moduleImportConnections.push([moduleName, importModule.name]);
      }

      this.processModule(importModule, moduleContainer);
    });
  }
}
