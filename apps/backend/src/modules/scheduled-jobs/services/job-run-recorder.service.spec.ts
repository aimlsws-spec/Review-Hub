import { JobExecutionLogRepository, ScheduledJobRepository } from '../repositories';

import { JobRunRecorder } from './job-run-recorder.service';

describe('JobRunRecorder', () => {
  const jobRepository = { findByName: jest.fn(), create: jest.fn(), update: jest.fn() };
  const logRepository = { create: jest.fn() };
  const recorder = new JobRunRecorder(
    jobRepository as unknown as ScheduledJobRepository,
    logRepository as unknown as JobExecutionLogRepository,
  );
  const definition = { jobName: 'top-earner-badges', jobType: 'CUSTOM' as const, cronExpression: '30 0 1 * *' };

  beforeEach(() => jest.clearAllMocks());

  it('creates the job row the first time, runs the work and logs the result', async () => {
    jobRepository.findByName.mockResolvedValue(null);
    jobRepository.create.mockResolvedValue({ id: 'job-1', enabled: true });

    const outcome = await recorder.run(definition, async () => ({ awarded: 3 }));

    expect(jobRepository.create).toHaveBeenCalledWith({ ...definition, enabled: true });
    expect(outcome).toEqual({ status: 'done', result: { awarded: 3 } });
    expect(logRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ job: { connect: { id: 'job-1' } }, success: true, logs: { awarded: 3 } }),
    );
    expect(jobRepository.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ retries: 0 }));
  });

  it('skips a job switched off on the Scheduled Jobs page', async () => {
    jobRepository.findByName.mockResolvedValue({ id: 'job-1', enabled: false });
    const work = jest.fn();

    await expect(recorder.run(definition, work)).resolves.toEqual({ status: 'skipped' });
    expect(work).not.toHaveBeenCalled();
    expect(logRepository.create).not.toHaveBeenCalled();
  });

  it('logs a failure and re-throws it so the queue can retry', async () => {
    jobRepository.findByName.mockResolvedValue({ id: 'job-1', enabled: true });

    await expect(
      recorder.run(definition, async () => {
        throw new Error('database down');
      }),
    ).rejects.toThrow('database down');
    expect(logRepository.create).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorMessage: expect.stringContaining('database down') }));
    expect(jobRepository.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ retries: { increment: 1 } }));
  });
});
