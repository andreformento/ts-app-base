import { IsString, MaxLength, MinLength } from 'class-validator';
import { DESCRIPTION_MAX, NAME_MAX } from '../../lib/space.rules';

export class SpaceFormDto {
  @IsString()
  @MinLength(1, { message: 'Name is required.' })
  @MaxLength(NAME_MAX, {
    message: `Name must be at most ${String(NAME_MAX)} characters.`,
  })
  name!: string;

  @IsString()
  @MaxLength(DESCRIPTION_MAX, {
    message: `Description must be at most ${String(DESCRIPTION_MAX)} characters.`,
  })
  description!: string;
}
