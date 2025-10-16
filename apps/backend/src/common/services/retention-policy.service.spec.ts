import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RetentionPolicyService } from './retention-policy.service';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

describe('RetentionPolicyService', () => {
  let service: RetentionPolicyService;
  let prisma: PrismaService;
  let auditService: AuditService;

  const mockPrismaService: any = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    recording: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionPolicyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<RetentionPolicyService>(RetentionPolicyService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateScheduledDeletion', () => {
    const createdAt = new Date('2025-01-01');

    it('should use recording override if set', () => {
      const result = service.calculateScheduledDeletion({
        createdAt,
        organizationRetentionDays: 180,
        recordingRetentionOverrideDays: 90,
      });

      const expected = new Date('2025-04-01'); // 90 days after Jan 1
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it('should use organization default if no override', () => {
      const result = service.calculateScheduledDeletion({
        createdAt,
        organizationRetentionDays: 365,
      });

      const expected = new Date('2026-01-01'); // 365 days after Jan 1
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it('should default to 180 days if no retention set', () => {
      const result = service.calculateScheduledDeletion({
        createdAt,
      });

      const expected = new Date('2025-06-30'); // 180 days after Jan 1
      expect(result.toDateString()).toBe(expected.toDateString());
    });
  });

  describe('updateOrganizationRetention', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const retentionDays = 365;

    const mockOrganization = {
      id: 'org-123',
      tenantId,
      name: 'Test Corp',
      defaultRetentionDays: 180,
    };

    it('should successfully update organization retention', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrganization,
        defaultRetentionDays: retentionDays,
      });
      mockAuditService.log.mockResolvedValue(undefined);

      await service.updateOrganizationRetention(tenantId, retentionDays, userId);

      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { tenantId },
        data: { defaultRetentionDays: retentionDays },
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        tenantId,
        userId,
        action: 'UPDATE',
        resourceType: 'ORGANIZATION',
        resourceId: mockOrganization.id,
        oldValue: { defaultRetentionDays: 180 },
        newValue: { defaultRetentionDays: retentionDays },
        metadata: { field: 'defaultRetentionDays' },
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrganizationRetention(tenantId, retentionDays, userId)
      ).rejects.toThrow(new NotFoundException('Organization not found'));
    });
  });

  describe('setRecordingRetentionOverride', () => {
    const recordingId = 'recording-123';
    const userId = 'user-123';
    const retentionDays = 90;

    const mockRecording = {
      id: recordingId,
      tenantId: 'tenant-123',
      createdAt: new Date('2025-01-01'),
      retentionOverrideDays: null,
      scheduledDeletionAt: new Date('2025-06-30'),
    };

    it('should successfully set retention override', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(mockRecording);
      mockPrismaService.recording.update.mockResolvedValue({
        ...mockRecording,
        retentionOverrideDays: retentionDays,
      });
      mockAuditService.log.mockResolvedValue(undefined);

      await service.setRecordingRetentionOverride(recordingId, retentionDays, userId);

      expect(mockPrismaService.recording.update).toHaveBeenCalledWith({
        where: { id: recordingId },
        data: {
          retentionOverrideDays: retentionDays,
          scheduledDeletionAt: expect.any(Date),
        },
      });

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if recording not found', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(null);

      await expect(
        service.setRecordingRetentionOverride(recordingId, retentionDays, userId)
      ).rejects.toThrow(new NotFoundException('Recording not found'));
    });
  });

  describe('applyLegalHold', () => {
    const recordingId = 'recording-123';
    const options = {
      reason: 'Legal investigation',
      appliedBy: 'user-123',
    };

    const mockRecording = {
      id: recordingId,
      tenantId: 'tenant-123',
      legalHold: false,
      legalHoldReason: null,
    };

    it('should successfully apply legal hold', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(mockRecording);
      mockPrismaService.recording.update.mockResolvedValue({
        ...mockRecording,
        legalHold: true,
      });
      mockAuditService.log.mockResolvedValue(undefined);

      await service.applyLegalHold(recordingId, options);

      expect(mockPrismaService.recording.update).toHaveBeenCalledWith({
        where: { id: recordingId },
        data: {
          legalHold: true,
          legalHoldReason: options.reason,
          legalHoldBy: options.appliedBy,
          legalHoldAt: expect.any(Date),
        },
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resourceType: 'RECORDING',
          metadata: { action: 'legal_hold_applied' },
        })
      );
    });

    it('should throw NotFoundException if recording not found', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(null);

      await expect(
        service.applyLegalHold(recordingId, options)
      ).rejects.toThrow(new NotFoundException('Recording not found'));
    });

    it('should throw ForbiddenException if legal hold already applied', async () => {
      const recordingWithHold = { ...mockRecording, legalHold: true };
      mockPrismaService.recording.findUnique.mockResolvedValue(recordingWithHold);

      await expect(
        service.applyLegalHold(recordingId, options)
      ).rejects.toThrow(new ForbiddenException('Recording already has legal hold applied'));
    });
  });

  describe('removeLegalHold', () => {
    const recordingId = 'recording-123';
    const userId = 'user-123';

    const mockRecording = {
      id: recordingId,
      tenantId: 'tenant-123',
      legalHold: true,
      legalHoldReason: 'Legal investigation',
    };

    it('should successfully remove legal hold', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(mockRecording);
      mockPrismaService.recording.update.mockResolvedValue({
        ...mockRecording,
        legalHold: false,
      });
      mockAuditService.log.mockResolvedValue(undefined);

      await service.removeLegalHold(recordingId, userId);

      expect(mockPrismaService.recording.update).toHaveBeenCalledWith({
        where: { id: recordingId },
        data: {
          legalHold: false,
          legalHoldReason: null,
          legalHoldBy: null,
          legalHoldAt: null,
        },
      });

      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if recording not found', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(null);

      await expect(
        service.removeLegalHold(recordingId, userId)
      ).rejects.toThrow(new NotFoundException('Recording not found'));
    });

    it('should throw ForbiddenException if no legal hold applied', async () => {
      const recordingWithoutHold = { ...mockRecording, legalHold: false };
      mockPrismaService.recording.findUnique.mockResolvedValue(recordingWithoutHold);

      await expect(
        service.removeLegalHold(recordingId, userId)
      ).rejects.toThrow(new ForbiddenException('Recording does not have legal hold applied'));
    });
  });

  describe('findRecordingsEligibleForDeletion', () => {
    it('should return eligible recordings', async () => {
      const mockRecordings = [
        { id: 'recording-1' },
        { id: 'recording-2' },
      ];

      mockPrismaService.recording.findMany.mockResolvedValue(mockRecordings);

      const result = await service.findRecordingsEligibleForDeletion();

      expect(result).toEqual(['recording-1', 'recording-2']);
      expect(mockPrismaService.recording.findMany).toHaveBeenCalledWith({
        where: {
          scheduledDeletionAt: { lte: expect.any(Date) },
          legalHold: false,
        },
        select: { id: true },
        take: 100,
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.recording.findMany.mockResolvedValue([]);

      await service.findRecordingsEligibleForDeletion(50);

      expect(mockPrismaService.recording.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });
  });

  describe('deleteRecording', () => {
    const recordingId = 'recording-123';
    const userId = 'user-123';

    const mockRecording = {
      id: recordingId,
      tenantId: 'tenant-123',
      s3Key: 'recordings/test.webm',
      scheduledDeletionAt: new Date('2025-01-01'),
      legalHold: false,
    };

    it('should successfully delete eligible recording', async () => {
      const pastDate = new Date('2024-12-01');
      const eligibleRecording = { ...mockRecording, scheduledDeletionAt: pastDate };

      mockPrismaService.recording.findUnique.mockResolvedValue(eligibleRecording);
      mockPrismaService.recording.delete.mockResolvedValue(eligibleRecording);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.deleteRecording(recordingId, userId);

      expect(mockPrismaService.recording.delete).toHaveBeenCalledWith({
        where: { id: recordingId },
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resourceType: 'RECORDING',
        })
      );
    });

    it('should throw NotFoundException if recording not found', async () => {
      mockPrismaService.recording.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteRecording(recordingId, userId)
      ).rejects.toThrow(new NotFoundException('Recording not found'));
    });

    it('should throw ForbiddenException if legal hold applied', async () => {
      const holdRecording = { ...mockRecording, legalHold: true };
      mockPrismaService.recording.findUnique.mockResolvedValue(holdRecording);

      await expect(
        service.deleteRecording(recordingId, userId)
      ).rejects.toThrow(new ForbiddenException('Cannot delete recording with legal hold'));
    });

    it('should throw ForbiddenException if not eligible', async () => {
      const futureDate = new Date('2026-01-01');
      const notEligible = { ...mockRecording, scheduledDeletionAt: futureDate };
      mockPrismaService.recording.findUnique.mockResolvedValue(notEligible);

      await expect(
        service.deleteRecording(recordingId, userId)
      ).rejects.toThrow(new ForbiddenException('Recording is not yet eligible for deletion based on retention policy'));
    });

    it('should allow force delete', async () => {
      const futureDate = new Date('2026-01-01');
      const notEligible = { ...mockRecording, scheduledDeletionAt: futureDate };

      mockPrismaService.recording.findUnique.mockResolvedValue(notEligible);
      mockPrismaService.recording.delete.mockResolvedValue(notEligible);
      mockAuditService.log.mockResolvedValue(undefined);

      await service.deleteRecording(recordingId, userId, true);

      expect(mockPrismaService.recording.delete).toHaveBeenCalledWith({
        where: { id: recordingId },
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { force: true },
        })
      );
    });
  });

  describe('recalculateScheduledDeletions', () => {
    const tenantId = 'tenant-123';

    const mockOrganization = {
      id: 'org-123',
      tenantId,
      defaultRetentionDays: 180,
    };

    it('should recalculate scheduled deletions for all recordings', async () => {
      const mockRecordings = [
        {
          id: 'recording-1',
          tenantId,
          createdAt: new Date('2025-01-01'),
          retentionOverrideDays: null,
          legalHold: false,
        },
        {
          id: 'recording-2',
          tenantId,
          createdAt: new Date('2025-01-02'),
          retentionOverrideDays: 90,
          legalHold: false,
        },
      ];

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.recording.findMany.mockResolvedValue(mockRecordings);
      mockPrismaService.recording.update.mockResolvedValue({});

      const count = await service.recalculateScheduledDeletions(tenantId);

      expect(count).toBe(2);
      expect(mockPrismaService.recording.update).toHaveBeenCalledTimes(2);
    });

    it('should skip recordings with legal hold', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.recording.findMany.mockResolvedValue([]);

      await service.recalculateScheduledDeletions(tenantId);

      expect(mockPrismaService.recording.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          legalHold: false,
        },
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.recalculateScheduledDeletions(tenantId)
      ).rejects.toThrow(new NotFoundException('Organization not found'));
    });
  });

  describe('getRetentionPolicyInfo', () => {
    const tenantId = 'tenant-123';

    const mockOrganization = {
      id: 'org-123',
      tenantId,
      defaultRetentionDays: 180,
    };

    it('should return retention policy info and statistics', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);
      mockPrismaService.recording.count
        .mockResolvedValueOnce(100) // total recordings
        .mockResolvedValueOnce(5) // recordings with legal hold
        .mockResolvedValueOnce(10); // recordings eligible for deletion

      const result = await service.getRetentionPolicyInfo(tenantId);

      expect(result).toEqual({
        defaultRetentionDays: 180,
        statistics: {
          totalRecordings: 100,
          recordingsWithLegalHold: 5,
          recordingsEligibleForDeletion: 10,
        },
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.getRetentionPolicyInfo(tenantId)
      ).rejects.toThrow(new NotFoundException('Organization not found'));
    });
  });
});
