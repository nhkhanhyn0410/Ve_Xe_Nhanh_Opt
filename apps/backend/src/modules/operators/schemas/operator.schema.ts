import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OperatorStatus } from '@ve_xe_nhanh_ts/shared-types';

export type OperatorDocument = Operator & Document;

@Schema({ timestamps: true })
export class Operator {
  // ===== THONG TIN CO BAN =====

  @Prop({ required: true, trim: true })
  companyName: string;

  @Prop({ trim: true, uppercase: true, maxlength: 5 })
  employeeCodePrefix?: string;

  @Prop({
    sparse: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  username: string;

  @Prop({})
  operatorAuth: string;

  @Prop({
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop()
  phone: string;

  @Prop({ select: false })
  password: string;

  @Prop()
  logo?: string;

  @Prop({ required: true })
  businessLicense: string;

  @Prop({ required: true })
  taxCode: string;

  @Prop()
  address: string;

  @Prop()
  description?: string;

  // ===== TRANG THAI + DUYET =====

  @Prop({
    type: String,
    enum: OperatorStatus,
    default: OperatorStatus.PENDING,
    index: true,
  })
  status: OperatorStatus;

  @Prop()
  rejectionReason?: string;

  @Prop()
  suspensionReason?: string;

  @Prop({ type: [String] })
  verificationDocs?: string[];

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Admin' })
  approvedBy?: Types.ObjectId;

  // ===== CAU HINH KINH DOANH =====

  // @Prop({ type: Object })
  // bankInfo?: {
  //   bankName: string;
  //   accountNumber: string;
  //   accountHolder: string;
  //   branch: string;
  // };

  // @Prop({ type: Object })
  // settings?: {
  //   autoConfirmBooking: boolean;
  //   cancellationPolicy: {
  //     freeCancel: number; // so gio truoc gio khoi hanh
  //     lateCancelFee: number; // phan tram phi huy muon
  //   };
  // };

  // ===== THONG KE (denormalized) =====

  @Prop({ default: 0 })
  totalRoutes: number;

  @Prop({ default: 0 })
  totalBuses: number;

  @Prop({ default: 0 })
  totalTrips: number;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  // ===== SECURITY =====

  @Prop({ select: false })
  refreshToken?: string;

  @Prop({ type: Date })
  lastLoginAt?: Date;
}

export const OperatorSchema = SchemaFactory.createForClass(Operator);

// ===== INDEXES =====
OperatorSchema.index({ companyName: 'text' }); // Full-text search
OperatorSchema.index({ status: 1 });
OperatorSchema.index({ averageRating: -1 });
