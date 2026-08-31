import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/support_ticket_model.dart';
import '../../providers/support_providers.dart';

class SupportTicketsScreen extends ConsumerWidget {
  const SupportTicketsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketsAsync = ref.watch(supportTicketsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push(RoutePaths.newSupportTicket),
        child: const Icon(Icons.add),
      ),
      body: ticketsAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(message: '$error', onRetry: () => ref.invalidate(supportTicketsProvider)),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(
            message: failure.message,
            onRetry: () => ref.invalidate(supportTicketsProvider),
          ),
          success: (page) {
            if (page.items.isEmpty) {
              return const EmptyState(
                icon: Icons.support_agent_outlined,
                title: 'No support tickets yet',
                description: 'Need help? Tap the + button to open a ticket.',
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(supportTicketsProvider),
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: page.items.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) => _TicketTile(ticket: page.items[index]),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _TicketTile extends StatelessWidget {
  const _TicketTile({required this.ticket});

  final SupportTicketModel ticket;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: () => context.push(RoutePaths.supportTicketDetailPath(ticket.id)),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      ticket.subject,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  AppBadge.forStatus(ticket.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                ticket.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: AppColors.slate600),
              ),
              const SizedBox(height: 8),
              Text(
                DateFormat('d MMM, h:mm a').format(ticket.createdAt),
                style: const TextStyle(fontSize: 11.5, color: AppColors.slate400),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
