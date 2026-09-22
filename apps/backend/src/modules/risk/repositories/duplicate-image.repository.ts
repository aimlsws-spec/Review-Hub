import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface SimilarAttachment {
  submissionId: string;
  userId: string;
  evidenceText: string | null;
  /** How many of the 64 hash bits differ. */
  distance: number;
}

@Injectable()
export class DuplicateImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Stores the fingerprint on the submission's evidence file(s) so later submissions can be compared against it. */
  async saveFingerprint(submissionId: string, perceptualHash: bigint, evidenceText: string | null) {
    await this.prisma.submissionAttachment.updateMany({ where: { submissionId }, data: { perceptualHash, evidenceText } });
  }

  /**
   * Other people's (and this person's earlier) pictures that look like this one, closest first.
   *
   * The comparison runs inside MySQL: `perceptualHash` is a signed 64-bit integer, and `BIT_COUNT(a ^ b)` is
   * the number of differing bits. Restricting to recent pictures keeps the scan bounded as the table grows.
   */
  async findSimilar(params: {
    submissionId: string;
    perceptualHash: bigint;
    maxDistance: number;
    since: Date;
    limit: number;
  }): Promise<SimilarAttachment[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ submissionId: string; userId: string; evidenceText: string | null; distance: bigint | number }>
    >(Prisma.sql`
      SELECT a.submissionId AS submissionId,
             s.userId AS userId,
             a.evidenceText AS evidenceText,
             BIT_COUNT(a.perceptualHash ^ ${params.perceptualHash}) AS distance
      FROM submission_attachments a
      JOIN task_submissions s ON s.id = a.submissionId
      WHERE a.perceptualHash IS NOT NULL
        AND a.submissionId <> ${params.submissionId}
        AND a.createdAt >= ${params.since}
        AND s.deletedAt IS NULL
        AND BIT_COUNT(a.perceptualHash ^ ${params.perceptualHash}) <= ${params.maxDistance}
      ORDER BY distance ASC, a.createdAt ASC
      LIMIT ${params.limit}
    `);

    return rows.map((row) => ({ ...row, distance: Number(row.distance) }));
  }
}
