import { ExamsService } from "./exams.service";

describe("ExamsService", () => {
  let service: ExamsService;

  beforeEach(() => {
    service = new ExamsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
