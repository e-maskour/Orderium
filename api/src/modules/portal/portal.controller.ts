import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  Request,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { PortalService } from './portal.service';
import { LoginDto, RegisterDto } from './dto/portal.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiRes } from '../../common/api-response';
import { PRT } from '../../common/response-codes';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';
import { QuotesService } from '../quotes/quotes.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { PartnersService } from '../partners/partners.service';
import { CategoriesService } from '../categories/categories.service';

@ApiTags('Portal')
@Controller('portal')
@PortalRoute()
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly jwtService: JwtService,
    private readonly ordersService: OrdersService,
    private readonly invoicesService: InvoicesService,
    private readonly quotesService: QuotesService,
    private readonly configurationsService: ConfigurationsService,
    private readonly partnersService: PartnersService,
    private readonly categoriesService: CategoriesService,
  ) { }

  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Portal login' })
  async login(@Body() body: LoginDto) {
    const emailOrPhone = body.email || body.phoneNumber;
    if (!emailOrPhone) {
      throw new BadRequestException('Email or phone number required');
    }
    const user = await this.portalService.validateUser(
      emailOrPhone,
      body.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'pending') {
      throw new ForbiddenException('Account is pending admin approval');
    }
    if (user.status === 'rejected') {
      throw new ForbiddenException('Account registration has been rejected');
    }
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      isAdmin: user.isAdmin,
      isCustomer: user.isCustomer,
      isDelivery: user.isDelivery,
      // admin users (isAdmin) get an 'admin' scope so they can access backoffice resources
      scope: user.isAdmin ? 'admin' : 'portal',
      roleId: user.roleId ?? null,
      isSuperAdmin: user.role?.isSuperAdmin ?? false,
      permissions: user.role?.permissions?.map((p) => p.key) ?? [],
    };
    const token = this.jwtService.sign(payload);
    return ApiRes(PRT.LOGIN, {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        customerId: user.customerId,
        customerName: user.name,
        isAdmin: user.isAdmin,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
        deliveryId: user.deliveryId,
        roleId: user.roleId,
        isSuperAdmin: user.role?.isSuperAdmin ?? false,
        permissions: user.role?.permissions?.map((p) => p.key) ?? [],
      },
      token,
    });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Portal registration' })
  async register(@Body() body: RegisterDto) {
    const existingUser = await this.portalService.findByPhoneNumber(
      body.phoneNumber,
    );
    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    const user = await this.portalService.create({
      phoneNumber: body.phoneNumber,
      password: body.password,
      name: body.fullName,
      customerId: body.customerId,
      isCustomer: body.isCustomer ?? true,
      isDelivery: body.isDelivery ?? false,
      isAdmin: false, // Never allow self-registration as admin
      status: 'pending',
    });

    return ApiRes(PRT.REGISTERED, {
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        customerId: user.customerId,
        isCustomer: user.isCustomer,
        isDelivery: user.isDelivery,
        isAdmin: user.isAdmin,
        status: user.status,
      },
      message: 'Your account has been created and is pending admin approval.',
    });
  }

  @Public()
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @Get('user/:phoneNumber')
  @ApiOperation({ summary: 'Check if a portal user exists by phone number (public, limited info)' })
  async getUserByPhone(
    @Param('phoneNumber') phoneNumber: string,
  ) {
    const user = await this.portalService.findByPhoneNumber(phoneNumber);

    if (user) {
      // User exists in Portal — return portal info + partner name if linked
      let customerName: string | null = null;
      if (user.customerId) {
        try {
          const partner = await this.partnersService.findOne(user.customerId);
          customerName = partner?.name ?? null;
        } catch { /* partner may have been deleted */ }
      }
      return ApiRes(PRT.USER_DETAIL, {
        exists: true,
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        status: user.status,
        customerId: user.customerId,
        customerName,
      });
    }

    // Not in Portal — check if phone exists as a partner (for auto-linking on registration)
    try {
      const partner = await this.partnersService.findByPhone(phoneNumber);
      return ApiRes(PRT.USER_DETAIL, {
        exists: false,
        phoneNumber,
        customerId: partner.id,
        customerName: partner.name,
      });
    } catch {
      // Not found anywhere
      return ApiRes(PRT.USER_DETAIL, {
        exists: false,
        phoneNumber,
      });
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async getMe(@Request() req: { user: { id: number; sub: number } }) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    let customerName: string | null = null;
    if (user.customerId) {
      try {
        const partner = await this.partnersService.findOne(user.customerId);
        customerName = partner?.name ?? null;
      } catch { /* partner may have been deleted */ }
    }
    return ApiRes(PRT.USER_DETAIL, {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      status: user.status,
      customerId: user.customerId,
      customerName,
      isAdmin: user.isAdmin,
      isCustomer: user.isCustomer,
      isDelivery: user.isDelivery,
      deliveryId: user.deliveryId,
    });
  }

  @Get('me/data-export')
  @ApiOperation({ summary: 'Export own personal data (GDPR)' })
  async exportMyData(@Request() req: { user: { id: number; sub: number } }) {
    const userId = req.user.sub ?? req.user.id;
    const data = await this.portalService.exportUserData(userId);
    if (!data) {
      throw new NotFoundException('User not found');
    }
    return ApiRes(PRT.USER_DETAIL, data);
  }

  @Delete('me/account')
  @ApiOperation({ summary: 'Delete own account and personal data (GDPR)' })
  async deleteMyAccount(@Request() req: { user: { id: number; sub: number } }) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.portalService.deleteUserData(userId);
    return ApiRes(PRT.USER_DETAIL, { deleted: true });
  }

  // ─── Achats (purchases) ───────────────────────────────────────────────────

  @Get('me/orders')
  @ApiOperation({ summary: "List authenticated customer's orders" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'orderNumber', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getMyOrders(
    @Request() req: { user: { id: number; sub: number } },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('orderNumber') orderNumber?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user?.customerId) {
      throw new ForbiddenException('Portal account is not linked to a customer');
    }
    const result = await this.ordersService.getCustomerOrders(
      user.customerId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      orderNumber,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return ApiRes(PRT.ORDERS_LIST, result);
  }

  @Get('me/orders/:id')
  @ApiOperation({ summary: "Get a specific order by ID (must belong to authenticated customer)" })
  async getMyOrder(
    @Request() req: { user: { id: number; sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user?.customerId) {
      throw new ForbiddenException('Portal account is not linked to a customer');
    }
    const order = await this.ordersService.getOrderById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    // Ensure the order belongs to the authenticated customer
    const orderCustomer = order.customer as { id: number } | undefined;
    if (orderCustomer?.id !== user.customerId) {
      throw new ForbiddenException('Access denied');
    }
    return ApiRes(PRT.ORDER_DETAIL, order);
  }

  @Get('me/invoices')
  @ApiOperation({ summary: "List authenticated customer's sales invoices" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getMyInvoices(
    @Request() req: { user: { id: number; sub: number } },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user?.customerId) {
      throw new ForbiddenException('Portal account is not linked to a customer');
    }
    const result = await this.invoicesService.findAll(
      undefined,
      status,
      user.customerId,
      undefined,
      dateFrom,
      dateTo,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      'VENTE',
    );
    return ApiRes(PRT.INVOICES_LIST, result);
  }

  @Get('me/invoices/:id')
  @ApiOperation({ summary: "Get a specific invoice by ID (must belong to authenticated customer)" })
  async getMyInvoice(
    @Request() req: { user: { id: number; sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user?.customerId) {
      throw new ForbiddenException('Portal account is not linked to a customer');
    }
    const invoice = await this.invoicesService.findOne(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.customerId !== user.customerId) {
      throw new ForbiddenException('Access denied');
    }
    return ApiRes(PRT.INVOICE_DETAIL, invoice);
  }

  @Get('me/quotes')
  @ApiOperation({ summary: "List authenticated customer's quotes (devis)" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async getMyQuotes(
    @Request() req: { user: { id: number; sub: number } },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user?.customerId) {
      throw new ForbiddenException('Portal account is not linked to a customer');
    }
    const result = await this.quotesService.findAll(
      undefined,
      status,
      user.customerId,
      dateFrom,
      dateTo,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      undefined,
      'VENTE',
    );
    return ApiRes(PRT.QUOTES_LIST, result);
  }

  @Get('me/quotes/:id')
  @ApiOperation({ summary: "Get a specific quote by ID (must belong to authenticated customer)" })
  async getMyQuote(
    @Request() req: { user: { id: number; sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.sub ?? req.user.id;
    const user = await this.portalService.findById(userId);
    if (!user?.customerId) {
      throw new ForbiddenException('Portal account is not linked to a customer');
    }
    const quote = await this.quotesService.findOne(id);
    if (!quote) {
      throw new NotFoundException('Quote not found');
    }
    if (quote.customerId !== user.customerId) {
      throw new ForbiddenException('Access denied');
    }
    return ApiRes(PRT.QUOTE_DETAIL, quote);
  }

  // ─── Admin: portal user management ───────────────────────────────────────

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('isAdmin')
  @ApiOperation({ summary: 'List portal users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async adminListUsers(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.portalService.findAllUsers(
      parseInt(page, 10),
      parseInt(pageSize, 10),
      status,
      search,
    );
    return ApiRes(PRT.ADMIN_USERS_LIST, result);
  }

  @Patch('admin/users/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('isAdmin')
  @ApiOperation({ summary: 'Approve a portal user account (admin only)' })
  async adminApproveUser(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.portalService.updateStatus(id, 'approved');
    if (!user) {
      throw new NotFoundException('Portal user not found');
    }
    return ApiRes(PRT.USER_APPROVED, { id: user.id, status: user.status });
  }

  @Patch('admin/users/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('isAdmin')
  @ApiOperation({ summary: 'Reject a portal user account (admin only)' })
  async adminRejectUser(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = await this.portalService.updateStatus(id, 'rejected');
    if (!user) {
      throw new NotFoundException('Portal user not found');
    }
    return ApiRes(PRT.USER_REJECTED, { id: user.id, status: user.status });
  }

  // ─── Paramètres (public configuration) ───────────────────────────────────

  // Allowed entities that portal clients may read — never expose internal ones
  private static readonly ALLOWED_CONFIG_ENTITIES = new Set([
    'my_company', 'taxes', 'currencies', 'uom', 'payment_terms',
  ]);

  @Public()
  @Get('config/company')
  @ApiOperation({ summary: 'Get public company information' })
  async getCompanyConfig() {
    const config = await this.configurationsService.findByEntity('my_company');
    return ApiRes(PRT.CONFIG_COMPANY, config);
  }

  @Public()
  @Get('config/:entity')
  @ApiOperation({ summary: 'Get a specific public configuration (taxes, currencies, uom, payment_terms)' })
  async getConfig(@Param('entity') entity: string) {
    if (!PortalController.ALLOWED_CONFIG_ENTITIES.has(entity)) {
      throw new BadRequestException(
        `Unknown or restricted config entity. Allowed: ${[...PortalController.ALLOWED_CONFIG_ENTITIES].join(', ')}`,
      );
    }
    const config = await this.configurationsService.findByEntity(entity);
    return ApiRes(PRT.CONFIG_ENTITY, config);
  }

  // ─── Catalogue ────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List product categories (portal)' })
  async getCategories() {
    const categories = await this.categoriesService.findAll('product');
    return ApiRes(PRT.CATEGORIES_LIST, categories);
  }
}
