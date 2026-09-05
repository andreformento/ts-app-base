import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DESCRIPTION_MAX, NAME_MAX } from '../space.rules';
import { blankToNull, trimmed } from '../space.transforms';

export class CreateSpaceDto {
  @Transform(trimmed)
  @IsString()
  @MinLength(1, { message: 'Name is required.' })
  @MaxLength(NAME_MAX)
  name!: string;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(DESCRIPTION_MAX)
  description?: string | null;
}
