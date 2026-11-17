import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from "class-validator";

export class SubmitIdentifiedErrorsDto {
  @ApiProperty({
    type: [Number],
    example: [4, 7],
    description:
      "IDs of errors identified by the student. Send an empty array if no errors were identified.",
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  errorTypeIds: number[];
}
