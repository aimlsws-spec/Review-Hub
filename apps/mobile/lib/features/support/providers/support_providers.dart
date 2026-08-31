import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../../../core/errors/result.dart';
import '../../../shared/models/api_response.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/models/support_ticket_model.dart';
import '../data/support_repository.dart';

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(ref.watch(dioProvider));
});

/// Bumped after creating a ticket or posting a reply so dependent providers
/// refetch.
final supportRefreshProvider = StateProvider<int>((ref) => 0);

final supportTicketsProvider = FutureProvider.autoDispose<Result<PaginatedResponse<SupportTicketModel>>>((ref) async {
  ref.watch(supportRefreshProvider);
  return ref.watch(supportRepositoryProvider).listMine();
});

final ticketDetailProvider =
    FutureProvider.autoDispose.family<Result<SupportTicketModel>, String>((ref, ticketId) async {
  ref.watch(supportRefreshProvider);
  return ref.watch(supportRepositoryProvider).getTicket(ticketId);
});
