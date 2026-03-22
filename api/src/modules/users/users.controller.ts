import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';
import { ApiRes } from '../../common/api-response';
import { USR } from '../../common/response-codes';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'List users with filtering and pagination' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
    async findAll(@Query() dto: FilterUsersDto) {
        const { users, total } = await this.usersService.findAll(dto);
        const page = dto.page ?? 1;
        const perPage = dto.perPage ?? 20;
        const offset = (page - 1) * perPage;
        return ApiRes(USR.LIST, users, {
            limit: perPage,
            offset,
            total,
            hasNext: offset + perPage < total,
            hasPrev: offset > 0,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const data = await this.usersService.findOne(id);
        return ApiRes(USR.DETAIL, data);
    }

    @Post()
    @ApiOperation({ summary: 'Create a user' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid user data' })
    async create(@Body() dto: CreateUserDto) {
        const data = await this.usersService.create(dto);
        return ApiRes(USR.CREATED, data);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a user' })
    @ApiResponse({ status: 200, description: 'User updated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
        @Request() req: any,
    ) {
        const data = await this.usersService.update(id, dto, req.user?.id);
        return ApiRes(USR.UPDATED, data);
    }

    @Patch(':id/activate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Activate a user' })
    @ApiResponse({ status: 200, description: 'User activated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async activate(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ) {
        const data = await this.usersService.setStatus(id, true, req.user?.id);
        return ApiRes(USR.ACTIVATED, data);
    }

    @Patch(':id/deactivate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Deactivate a user' })
    @ApiResponse({ status: 200, description: 'User deactivated successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deactivate(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ) {
        const data = await this.usersService.setStatus(id, false, req.user?.id);
        return ApiRes(USR.DEACTIVATED, data);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete a user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @Request() req: any,
    ) {
        await this.usersService.remove(id, req.user?.id);
        return ApiRes(USR.DELETED, null);
    }
}
