import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../data/models/support_message_model.dart';
import '../../data/models/support_ticket_model.dart';
import '../../providers/support_providers.dart';

class SupportTicketDetailScreen extends ConsumerWidget {
  const SupportTicketDetailScreen({super.key, required this.ticketId});

  final String ticketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ticketAsync = ref.watch(ticketDetailProvider(ticketId));

    return Scaffold(
      appBar: AppBar(title: const Text('Ticket')),
      body: ticketAsync.when(
        loading: () => const PageLoader(),
        error: (error, stack) => ErrorStateView(
          message: '$error',
          onRetry: () => ref.invalidate(ticketDetailProvider(ticketId)),
        ),
        data: (result) => result.when(
          failure: (failure) => ErrorStateView(
            message: failure.message,
            onRetry: () => ref.invalidate(ticketDetailProvider(ticketId)),
          ),
          success: (ticket) => _TicketDetailBody(ticket: ticket),
        ),
      ),
    );
  }
}

class _TicketDetailBody extends ConsumerStatefulWidget {
  const _TicketDetailBody({required this.ticket});

  final SupportTicketModel ticket;

  @override
  ConsumerState<_TicketDetailBody> createState() => _TicketDetailBodyState();
}

class _TicketDetailBodyState extends ConsumerState<_TicketDetailBody> {
  final _replyController = TextEditingController();
  bool _isSending = false;
  String? _errorMessage;

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<void> _sendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _isSending = true;
      _errorMessage = null;
    });

    final result = await ref.read(supportRepositoryProvider).reply(widget.ticket.id, text);

    if (!mounted) return;
    setState(() => _isSending = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Could not send reply — please try again.');
      return;
    }

    _replyController.clear();
    ref.read(supportRefreshProvider.notifier).state++;
  }

  @override
  Widget build(BuildContext context) {
    final ticket = widget.ticket;
    final messages = (ticket.messages ?? []).where((message) => !message.internalNote).toList();

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      ticket.subject,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  AppBadge.forStatus(ticket.status),
                ],
              ),
              const SizedBox(height: 10),
              Text(ticket.description, style: const TextStyle(fontSize: 13.5, color: AppColors.slate600)),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: [
                  _MetaChip(label: ticket.category),
                  _MetaChip(label: ticket.priority),
                ],
              ),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 8),
              if (messages.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text('No messages yet', style: TextStyle(fontSize: 13, color: AppColors.slate400)),
                  ),
                )
              else
                ...messages.map((message) => _MessageBubble(message: message)),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                    child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 12.5)),
                  ),
                  const SizedBox(height: 8),
                ],
                if (ticket.canReply)
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _replyController,
                          minLines: 1,
                          maxLines: 4,
                          decoration: const InputDecoration(hintText: 'Type a reply…'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _isSending
                          ? const Padding(
                              padding: EdgeInsets.all(8),
                              child: LoadingIndicator(size: 22),
                            )
                          : IconButton.filled(
                              onPressed: _sendReply,
                              icon: const Icon(Icons.send_rounded),
                            ),
                    ],
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(10)),
                    child: const Text(
                      'This ticket is closed',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppColors.slate500),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(6)),
      child: Text(
        label.replaceAll('_', ' '),
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate600),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final SupportMessageModel message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.senderType == 'USER';

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary600 : AppColors.slate100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isUser ? 'You' : message.senderType,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: isUser ? AppColors.primary100 : AppColors.slate500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message.message,
              style: TextStyle(fontSize: 13.5, color: isUser ? AppColors.white : AppColors.slate900),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('d MMM, h:mm a').format(message.createdAt),
              style: TextStyle(
                fontSize: 10.5,
                color: isUser ? AppColors.primary100 : AppColors.slate400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
