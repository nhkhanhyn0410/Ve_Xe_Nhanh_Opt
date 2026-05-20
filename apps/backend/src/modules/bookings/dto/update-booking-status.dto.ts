import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@ve_xe_nhanh_ts/shared-types';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' })
  @IsNotEmpty()
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
