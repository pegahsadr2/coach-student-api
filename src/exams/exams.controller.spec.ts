import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';

describe('ExamsController', () => {
  let controller: ExamsController;

  beforeEach(() => {
    controller = new ExamsController({} as ExamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
