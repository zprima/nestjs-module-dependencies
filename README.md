# nestjs-module-dependencies
On module init, it creates a flowchart of which modesl are imported where

## Usage

Copy paste the folder where you have your other modules in your Nestjs application.

Modify the `FlowchartService` config.

On app startup it will generate a file `modules-flowchart.md` where ever you specified the output path.
