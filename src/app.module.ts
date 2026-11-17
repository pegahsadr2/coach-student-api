import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoursesModule } from "./courses/courses.module";
import { SessionsModule } from "./sessions/sessions.module";
import { StudentsModule } from "./students/students.module";
import { ExamsModule } from "./exams/exams.module";
import { ErrorTypesModule } from "./error-types/error-types.module";
import { ExamAreasModule } from "./exam-areas/exam-areas.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { GuestPracticeModule } from "./guest-practice/guest-practice.module";
import { AddAuthSchema1761560000000 } from "./database/migrations/1761560000000-AddAuthSchema";
import { AddExamLifecycle1761560100000 } from "./database/migrations/1761560100000-AddExamLifecycle";
import { AddExamReportCardSnapshot1793520000000 } from "./database/migrations/1793520000000-AddExamReportCardSnapshot";
import { AddSessionStudentExamSettings1795000000000 } from "./database/migrations/1795000000000-AddSessionStudentExamSettings";
import { AddExamErrorReview1793560000000 } from "./database/migrations/1793560000000-AddExamErrorReview";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.get<string>("DB_DATABASE", "coach_student_db");

        console.log(`[TypeORM] Connecting to database: ${database}`);

        return {
          type: "postgres" as const,
          host: config.get<string>("DB_HOST", "localhost"),
          port: config.get<number>("DB_PORT", 5432),
          username: config.get<string>("DB_USERNAME", "coach_user"),
          password: config.get<string>("DB_PASSWORD"),
          database,

          autoLoadEntities: true,
          synchronize: false,
          migrations: [
            AddAuthSchema1761560000000,
            AddExamLifecycle1761560100000,
            AddExamReportCardSnapshot1793520000000,
            AddExamErrorReview1793560000000,
            AddSessionStudentExamSettings1795000000000,
          ],
          migrationsRun: true,
        };
      },
    }),

    CoursesModule,
    SessionsModule,
    StudentsModule,
    UsersModule,
    AuthModule,
    ExamsModule,
    ErrorTypesModule,
    ExamAreasModule,
    DashboardModule,
    GuestPracticeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
