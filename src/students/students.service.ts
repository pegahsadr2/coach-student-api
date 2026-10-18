import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  async create(dto: CreateStudentDto, coachId: number): Promise<Student> {
    const existingStudent = await this.studentsRepository.findOne({
      where: { studentCode: dto.studentCode },
    });

    if (existingStudent) {
      throw new ConflictException(
        'A student with this student code already exists',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const student = this.studentsRepository.create({
      studentCode: dto.studentCode,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      fatherName: dto.fatherName,
      idCardNumber: dto.idCardNumber,
      birthDate: dto.birthDate,
      description: dto.description,
      createdBy: coachId,
    });

    return this.studentsRepository.save(student);
  }
  async findByStudentCodeForLogin(
    studentCode: string,
  ): Promise<Student | null> {
    return this.studentsRepository
      .createQueryBuilder('student')
      .addSelect('student.passwordHash')
      .where('student.studentCode = :studentCode', { studentCode })
      .getOne();
  }
  async findAll(): Promise<Student[]> {
    return this.studentsRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Student | null> {
    return this.studentsRepository.findOne({
      where: { id },
    });
  }
}
