import {
  Injectable,
  NotFoundException,
  // ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { OperatorStatus } from '@ve_xe_nhanh_ts/shared-types';
import { Operator, OperatorDocument } from './schemas/operator.schema';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { UpdateBankInfoDto } from './dto/update-bank-info.dto';

@Injectable()
export class OperatorsService {
  constructor(
    @InjectModel(Operator.name)
    private operatorModel: Model<OperatorDocument>,
  ) {}

  // ===== CRUD CO BAN =====

  /**
   * Dang ky nha xe moi
   * - Check email trung
   * - Hash password
   * - Status mac dinh = PENDING (cho admin duyet)
   */
  async create(CreateOperatorDto: CreateOperatorDto): Promise<Operator> {
    // Check email da ton tai
    // const existing = await this.operatorModel.findOne({
    //   email: CreateOperatorDto.email,
    // });
    // if (existing) {
    //   throw new ConflictException('Email da duoc su dung');
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(CreateOperatorDto.password, 10);

    return this.operatorModel.create({
      ...CreateOperatorDto,
      password: hashedPassword,
      status: OperatorStatus.PENDING,
    });
  }

  /**
   * Lấy danh sách nhà xe với phân trang, lọc theo trạng thái và tìm kiếm
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    status?: OperatorStatus;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const [data, total] = await Promise.all([
      this.operatorModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.operatorModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy thông tin nhà xe theo ID
   */
  async findById(id: string): Promise<Operator> {
    const operator = await this.operatorModel.findById(id);
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    return operator;
  }

  /**
   * Tìm nhà xe theo email
   */
  async findByEmail(email: string): Promise<OperatorDocument | null> {
    return this.operatorModel.findOne({ email }).select('+password').exec();
  }

  async findByUsername(username: string): Promise<OperatorDocument | null> {
    return this.operatorModel.findOne({ username }).select('+password').exec();
  }

  async findByIdWithRefreshToken(id: string): Promise<OperatorDocument | null> {
    return this.operatorModel.findById(id).select('+refreshToken').exec();
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, 12)
      : null;
    await this.operatorModel.findByIdAndUpdate(id, {
      refreshToken: hashedToken,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.operatorModel.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  }

  /**
   * Câp nhật thông tin nhà xe
   */
  async update(id: string, dto: UpdateOperatorDto): Promise<Operator> {
    const operator = await this.operatorModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    return operator;
  }

  /**
   * Xóa nhà xe
   */
  async remove(id: string): Promise<void> {
    const operator = await this.operatorModel.findById(id);
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    if (operator.status === OperatorStatus.APPROVED) {
      throw new BadRequestException(
        'Không thể xóa nhà xe đã được duyệt. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.',
      );
    }
    await this.operatorModel.findByIdAndDelete(id);
  }

  // ===== (Admin operations) =====

  /**
   * Duyệt nhà xe
   */
  async approve(id: string, approvedBy: string): Promise<Operator> {
    const operator = await this.operatorModel.findById(id);
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    if (operator.status !== OperatorStatus.PENDING) {
      throw new BadRequestException(
        `Không thể duyệt nhà xe đã có trạng thái: "${operator.status}".Chỉ duyệt khi có trạng thái là "pending".`,
      );
    }

    operator.status = OperatorStatus.APPROVED;
    operator.approvedAt = new Date();
    operator.approvedBy = approvedBy
      ? new Types.ObjectId(approvedBy)
      : undefined;
    return operator.save();
  }

  /**
   * Tu chối nhà xe với lý do (chỉ áp dụng khi đang ở trạng thái PENDING)
   */
  async reject(id: string, reason: string): Promise<Operator> {
    const operator = await this.operatorModel.findById(id);
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    if (operator.status !== OperatorStatus.PENDING) {
      throw new BadRequestException(
        `Không thể từ chối nhà xe đã có trạng thái "${operator.status}"`,
      );
    }

    operator.status = OperatorStatus.REJECTED;
    operator.rejectionReason = reason;
    return operator.save();
  }

  /**
   * Tạm ngưng nhà xe với lý do (chỉ áp dụng khi đang ở trạng thái APPROVED)
   */
  async suspend(id: string, reason: string): Promise<Operator> {
    const operator = await this.operatorModel.findById(id);
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    if (operator.status !== OperatorStatus.APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể tạm ngưng nhà xe đang ở trạng thái "approved"',
      );
    }

    operator.status = OperatorStatus.SUSPENDED;
    operator.suspensionReason = reason;
    return operator.save();
  }

  /**
   * Mở lại nhà xe (chỉ áp dụng khi đang ở trạng thái SUSPENDED)
   */
  async resume(id: string): Promise<Operator> {
    const operator = await this.operatorModel.findById(id);
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    if (operator.status !== OperatorStatus.SUSPENDED) {
      throw new BadRequestException(
        'Chỉ có thể mở lại nhà xe đang ở trạng thái "suspended"',
      );
    }

    operator.status = OperatorStatus.APPROVED;
    operator.suspensionReason = undefined;
    return operator.save();
  }

  // ===== BANK INFO =====

  /**
   * Cập nhât thông tin ngân hàng của nhà xe
   */
  async updateBankInfo(id: string, dto: UpdateBankInfoDto): Promise<Operator> {
    const operator = await this.operatorModel.findByIdAndUpdate(
      id,
      { bankInfo: dto },
      { new: true },
    );
    if (!operator) {
      throw new NotFoundException('Nhà xe không tồn tại');
    }
    return operator;
  }
}
