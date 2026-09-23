import 'package:freezed_annotation/freezed_annotation.dart';

part 'task_submission_model.freezed.dart';
part 'task_submission_model.g.dart';

/// Mirrors the raw `TaskSubmission` Prisma model as returned by
/// `SubmissionService.listMine()` / `getMine()`.
@freezed
abstract class DisputeModel with _$DisputeModel {
  const factory DisputeModel({
    required String id,
    required String status,
    required String reason,
    String? adminNotes,
    DateTime? resolvedAt,
    required DateTime createdAt,
  }) = _DisputeModel;

  factory DisputeModel.fromJson(Map<String, dynamic> json) => _$DisputeModelFromJson(json);
}

/// Mirrors the raw `TaskSubmission` Prisma model as returned by
/// `SubmissionService.listMine()` / `getMine()`.
@freezed
abstract class TaskSubmissionModel with _$TaskSubmissionModel {
  const factory TaskSubmissionModel({
    required String id,
    required String taskId,
    required String status,
    required String verificationSource,
    @Default(1) int attemptNumber,
    String? fileUrl,
    String? externalUrl,
    String? textAnswer,
    double? aiConfidence,
    String? rejectionReason,
    String? rewardAmount,
    DateTime? rewardCreditedAt,
    required DateTime createdAt,
    DisputeModel? dispute,
  }) = _TaskSubmissionModel;

  factory TaskSubmissionModel.fromJson(Map<String, dynamic> json) => _$TaskSubmissionModelFromJson(json);
}

extension TaskSubmissionModelX on TaskSubmissionModel {
  double? get rewardAmountValue => rewardAmount == null ? null : double.tryParse(rewardAmount!);

  bool get isPending => status == 'PENDING' || status == 'AI_PROCESSING' || status == 'PENDING_MANUAL';
  bool get isApproved => status == 'APPROVED';
  bool get isRejected => status == 'REJECTED';
}
