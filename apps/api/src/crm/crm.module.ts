import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { ContactsImportService } from './contacts-import.service';

@Module({
  imports: [AuthModule],
  controllers: [CrmController],
  providers: [CrmService, ContactsImportService],
})
export class CrmModule {}
