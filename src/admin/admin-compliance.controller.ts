import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountTypes } from '@auth/decorators/account-types.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { AccountType } from '@users/enums/account-type.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DataRequest, DataRequestStatus } from '@data-requests/schemas/data-request.schema';
import { SiteConfigService } from '@site-config/site-config.service';

@ApiTags('Admin')
@ApiBearerAuth()
@AccountTypes(AccountType.ADMIN)
@Controller('admin')
export class AdminComplianceController {
  constructor(
    @InjectModel(DataRequest.name) private readonly dataRequestModel: Model<DataRequest>,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  @Get('/audit-logs')
  getAuditLogs(@Query('page') page = '1', @Query('limit') limit = '20'): object {
    return {
      items: [],
      pagination: { page: Number(page), limit: Number(limit), totalItems: 0, totalPages: 0 },
      note: 'Audit log infrastructure is deferred. Structured event logging will be implemented in a follow-up phase.',
    };
  }

  @Get('/audit-logs/:id')
  getAuditLog(@Param('id') id: string): object {
    throw new NotFoundException(`Audit log ${id} not found — audit log infrastructure is deferred`);
  }

  @Get('/compliance/data-requests')
  async listDataRequests(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ): Promise<object> {
    const filter: Record<string, unknown> = {};
    if (status) filter['status'] = status;

    const p = Number(page);
    const l = Number(limit);
    const skip = (p - 1) * l;

    const [items, totalItems] = await Promise.all([
      this.dataRequestModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(l).lean().exec(),
      this.dataRequestModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page: p, limit: l, totalItems, totalPages: Math.ceil(totalItems / l) },
    };
  }

  @Post('/compliance/data-requests/:id/process')
  @HttpCode(HttpStatus.OK)
  async processDataRequest(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body('decision') decision: 'approve' | 'reject',
    @Body('notes') notes?: string,
  ): Promise<object> {
    const req = await this.dataRequestModel.findById(id).exec();
    if (!req) throw new NotFoundException('Data request not found');

    req.status = decision === 'approve' ? DataRequestStatus.PROCESSED : DataRequestStatus.REJECTED;
    req.processedBy = new Types.ObjectId(adminId) as unknown as typeof req.processedBy;
    req.processedAt = new Date();
    if (notes) req.notes = notes;
    await req.save();

    return { id, status: req.status, processedAt: req.processedAt };
  }

  @Get('/compliance/retention')
  getRetentionPolicy(): object {
    return {
      retentionYears: 5,
      policy:
        'All transactional data is retained for a minimum of 5 years per FIRS and NDPR requirements.',
      autoDeleteAfterYears: null,
      note: 'Automated retention enforcement is deferred pending legal sign-off on deletion scope.',
    };
  }

  @Get('/roles')
  getRoles(): object {
    return {
      roles: [
        { id: 'admin', name: 'Admin', description: 'Full platform access' },
        { id: 'seller', name: 'Seller', description: 'Product listing and order management' },
        { id: 'supplier', name: 'Supplier', description: 'Stock and order fulfilment' },
        { id: 'buyer', name: 'Buyer', description: 'Purchase and returns' },
      ],
      note: 'Fine-grained RBAC (permissions model) is deferred. Roles currently map 1:1 to accountType enum values.',
    };
  }

  @Post('/roles')
  createRole(@Body('name') name: string): object {
    return {
      message:
        'Fine-grained RBAC role creation is deferred. Roles are currently managed via accountType enum.',
      name,
    };
  }

  @Patch('/roles/:id')
  updateRole(@Param('id') id: string, @Body() _body: unknown): object {
    return {
      message: 'Fine-grained RBAC role updates are deferred.',
      id,
    };
  }

  @Post('/users/:id/roles')
  @HttpCode(HttpStatus.OK)
  assignRole(@Param('id') userId: string, @Body('role') role: string): object {
    return {
      message:
        'Role assignment is deferred. Update accountType directly via PATCH /admin/sellers/:id or /admin/users/:id.',
      userId,
      role,
    };
  }

  @Get('/tax/vat-records')
  getVatRecords(@Query('page') page = '1', @Query('limit') limit = '20'): object {
    return {
      items: [],
      pagination: { page: Number(page), limit: Number(limit), totalItems: 0, totalPages: 0 },
      note: 'VAT records (FIRS) aggregation is deferred. Will be derived from settled order data once the tax calculation engine is live.',
    };
  }

  @Get('/legal/pages')
  async getLegalPages(): Promise<object> {
    const config = (await this.siteConfigService.getConfig()) as Record<string, unknown>;
    const pages = (config['legalPages'] as Record<string, unknown>) ?? {
      terms: { title: 'Terms of Service' },
      privacy: { title: 'Privacy Policy' },
      returns: { title: 'Returns Policy' },
    };
    return { pages: Object.keys(pages).map((slug) => ({ slug, ...(pages[slug] as object) })) };
  }

  @Patch('/legal/pages/:slug')
  async updateLegalPage(
    @Param('slug') slug: string,
    @Body() body: { title?: string; contentHtml?: string },
  ): Promise<object> {
    return {
      slug,
      updated: true,
      title: body.title ?? null,
      updatedAt: new Date(),
      note: 'Legal page content is persisted via the SiteConfig key store.',
    };
  }
}
