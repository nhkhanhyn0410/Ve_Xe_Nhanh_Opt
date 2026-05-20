import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsDate,
  MinLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@ve_xe_nhanh_ts/shared-types';

export class CreateUserDto {
  @ApiProperty({ minLength: 3 })
  @IsNotEmpty()
  @MinLength(3, { message: 'Họ và tên tối thiểu 3 ký tự' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  @IsNotEmpty({ message: 'Giới tính không được để trống' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: Date;

  @ApiProperty()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty()
  @Matches(/^(0|\+84)\d{9}$/, { message: 'Số điện thoại không hợp lệ' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({ minLength: 6 })
  @IsNotEmpty()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;
}
