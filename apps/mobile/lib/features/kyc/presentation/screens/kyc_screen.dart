import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/kyc_document_model.dart';
import '../../providers/kyc_providers.dart';
import '../widgets/kyc_upload_sheet.dart';

const _identityDocTypes = {
  'AADHAAR': 'Aadhaar',
  'PASSPORT': 'Passport',
  'DRIVING_LICENCE': 'Driving licence',
};

class KycScreen extends ConsumerWidget {
  const KycScreen({super.key});

  /// Latest document per type, so a resubmission after rejection doesn't
  /// get shadowed by the soft-deleted prior attempt.
  Map<String, KycDocumentModel> _latestByType(List<KycDocumentModel> documents) {
    final latest = <String, KycDocumentModel>{};
    for (final doc in documents) {
      final existing = latest[doc.documentType];
      if (existing == null || doc.createdAt.isAfter(existing.createdAt)) {
        latest[doc.documentType] = doc;
      }
    }
    return latest;
  }

  Future<void> _openUploadSheet(BuildContext context, String documentType, String title) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => KycUploadSheet(documentType: documentType, title: title),
    );
  }

  Future<void> _chooseIdentityDocType(BuildContext context) async {
    final chosen = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Choose a document type', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
            for (final entry in _identityDocTypes.entries)
              ListTile(title: Text(entry.value), onTap: () => Navigator.of(context).pop(entry.key)),
          ],
        ),
      ),
    );
    if (chosen != null && context.mounted) {
      await _openUploadSheet(context, chosen, _identityDocTypes[chosen]!);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final documentsAsync = ref.watch(kycDocumentsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Identity Verification')),
      body: documentsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(kycDocumentsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(message: failure.message, onRetry: () => ref.invalidate(kycDocumentsProvider)),
          success: (documents) {
            final latest = _latestByType(documents);
            final identityDoc = _identityDocTypes.keys.map((type) => latest[type]).whereType<KycDocumentModel>().firstOrNull;

            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(kycDocumentsProvider),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'Verify your identity to unlock higher withdrawal limits and premium campaigns.',
                    style: TextStyle(color: AppColors.slate500, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  _KycSlotCard(
                    title: 'PAN card',
                    document: latest['PAN'],
                    onUpload: () => _openUploadSheet(context, 'PAN', 'Upload PAN card'),
                  ),
                  const SizedBox(height: 12),
                  _KycSlotCard(
                    title: identityDoc != null ? _identityDocTypes[identityDoc.documentType]! : 'Identity document',
                    subtitle: identityDoc == null ? 'Aadhaar, passport, or driving licence' : null,
                    document: identityDoc,
                    onUpload: () =>
                        identityDoc != null ? _openUploadSheet(context, identityDoc.documentType, _identityDocTypes[identityDoc.documentType]!) : _chooseIdentityDocType(context),
                  ),
                  const SizedBox(height: 12),
                  _KycSlotCard(
                    title: 'Selfie',
                    subtitle: 'Optional',
                    document: latest['SELFIE'],
                    onUpload: () => _openUploadSheet(context, 'SELFIE', 'Upload selfie'),
                  ),
                  if (documents.isEmpty) ...[
                    const SizedBox(height: 24),
                    const EmptyState(icon: Icons.verified_user_outlined, title: 'No documents uploaded yet'),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _KycSlotCard extends StatelessWidget {
  const _KycSlotCard({required this.title, this.subtitle, required this.document, required this.onUpload});

  final String title;
  final String? subtitle;
  final KycDocumentModel? document;
  final VoidCallback onUpload;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    if (subtitle != null)
                      Text(subtitle!, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ],
                ),
              ),
              if (document != null)
                AppBadge.forStatus(document!.verificationStatus)
              else
                const AppBadge(label: 'Not submitted'),
            ],
          ),
          if (document?.isRejected ?? false) ...[
            const SizedBox(height: 8),
            Text(
              document!.rejectionReason ?? 'This document was rejected — please resubmit.',
              style: const TextStyle(color: AppColors.danger, fontSize: 12),
            ),
          ],
          if (!(document?.isApproved ?? false)) ...[
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: onUpload,
              child: Text(document == null ? 'Upload' : 'Resubmit'),
            ),
          ],
        ],
      ),
    );
  }
}
