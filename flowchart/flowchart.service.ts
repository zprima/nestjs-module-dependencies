import * as fs from 'fs';
import * as path from 'path';

import { Logger, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ModuleRef, ModulesContainer } from '@nestjs/core';
import { Module } from '@nestjs/core/injector/module';

@Injectable()
export class FlowchartService implements OnModuleInit {
  private readonly logger = new Logger(FlowchartService.name);
  private visitedModules = new Set<string>();
  private moduleImportConnections: Array<[string, string]> = [];
  private modulesToIgnore = new Set<string>();

  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional()
    private readonly config: {
      fileName?: string;
      outputPath?: string;
      modulesToIgnore?: string[];
      displayAppModule?: boolean;
    },
  ) {
    // set defaults if none provided
    this.config = config || {};
    this.config.fileName ||= 'modules-flowchart.md';

    // Get the project root directory using Node's built-in functionality
    const projectRoot = process.cwd();

    // Set the output path to the project root
    this.config.outputPath ||= path.join(projectRoot, this.config.fileName);
    this.config.modulesToIgnore ||= ['FlowchartModule', 'InternalCoreModule'];
    this.config.displayAppModule ||= true;

    this.modulesToIgnore = new Set<string>(this.config.modulesToIgnore || []);
  }

  onModuleInit() {
    this.generateFlowchart();
  }

  /**
   * Generate a flowchart syntex of the modules in the project
   */
  generateFlowchart() {
    const moduleContainer = this.moduleRef.get(ModulesContainer, {
      strict: false,
    });
    const appModuleEntry = Array.from(moduleContainer.values()).find(
      (module) => module.metatype.name === 'AppModule',
    );
    if (!appModuleEntry) throw new Error('AppModule not found');

    this.processModule(appModuleEntry, moduleContainer);

    const flowchartLines = ['```mermaid', 'flowchart TD'];
    this.moduleImportConnections.forEach(([source, target]) => {
      flowchartLines.push(`${source} --> ${target};`);
    });
    flowchartLines.push('```');
    const flowchart = flowchartLines.join('\n');

    if (this.config.outputPath) {
      fs.writeFileSync(this.config.outputPath, flowchart);
      this.logger.log(`Flowchart saved to ${this.config.outputPath}`);
    }

    return flowchart;
  }

  /**
   * Process a module and its imports
   * @param module - The module to process
   * @param moduleContainer - The container of all modules
   */
  private processModule(module: Module, moduleContainer: ModulesContainer) {
    const moduleName = module.name;

    if (this.visitedModules.has(moduleName)) {
      return;
    }

    this.visitedModules.add(moduleName);

    const imports = Array.from<Module>(module.imports);

    imports.forEach((importModule) => {
      if (this.modulesToIgnore.has(importModule.name)) return;

      const shouldAddConnection =
        (this.config.displayAppModule && moduleName === 'AppModule') ||
        moduleName != 'AppModule';

      if (shouldAddConnection) {
        this.moduleImportConnections.push([moduleName, importModule.name]);
      }

      this.processModule(importModule, moduleContainer);
    });
  }
}
