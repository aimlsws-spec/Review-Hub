import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/identity_requirement.dart';
import '../data/kyc_repository.dart';
import '../data/models/kyc_document_model.dart';

final kycRepositoryProvider = Provider<KycRepository>((ref) => KycRepository(ref.watch(dioProvider)));

/// Bumped after a successful upload so [kycDocumentsProvider] refetches.
final kycRefreshProvider = StateProvider<int>((ref) => 0);

final kycDocumentsProvider = FutureProvider.autoDispose<Result<List<KycDocumentModel>>>((ref) async {
  ref.watch(kycRefreshProvider);
  return ref.watch(kycRepositoryProvider).getDocuments();
});

/// Whether the person may use the earning features (see [hasIdentityDocument]). Refetches with
/// [kycDocumentsProvider], so an upload unlocks them straight away.
final identityVerifiedProvider = FutureProvider.autoDispose<bool>((ref) async {
  final result = await ref.watch(kycDocumentsProvider.future);
  return result.when(
    success: hasIdentityDocument,
    // Could not check: let the screen open. The server refuses the earning actions itself, with the same message.
    failure: (_) => true,
  );
});
