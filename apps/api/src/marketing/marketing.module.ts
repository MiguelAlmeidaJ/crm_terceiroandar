import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingLeadService } from './marketing-lead.service';
import { MarketingPublicController } from './marketing-public.controller';

@Module({
 imports:[AuthModule],
 controllers:[MarketingController,MarketingPublicController],
 providers:[MarketingService,MarketingLeadService],
})
export class MarketingModule {}
