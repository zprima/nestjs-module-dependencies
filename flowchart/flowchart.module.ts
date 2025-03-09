import { Module } from '@nestjs/common';

import { FlowchartService } from './flowchart.service';

@Module({
  providers: [FlowchartService],
})
export class FlowchartModule {}
