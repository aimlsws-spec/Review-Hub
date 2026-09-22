import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../data/models/chatbot_model.dart';
import '../../providers/chat_providers.dart';
import '../../providers/chat_state.dart';

/// Must match the backend limit on a single question.
const int _maxQuestionLength = 500;

/// The help assistant. It answers from the FAQ and help pages, and hands the conversation to the support team
/// as a ticket whenever the person wants a human.
///
/// A [ConsumerStatefulWidget] only because the text field and scroll position need a controller lifecycle.
class SupportChatScreen extends ConsumerStatefulWidget {
  const SupportChatScreen({super.key});

  @override
  ConsumerState<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends ConsumerState<SupportChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _send() {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;
    _inputController.clear();
    ref.read(chatControllerProvider.notifier).send(text);
  }

  /// With nothing said yet there is no conversation to hand over, so the normal ticket form opens instead.
  void _talkToAPerson(ChatState chat) {
    if (!chat.hasUserMessage) {
      context.push(RoutePaths.newSupportTicket);
      return;
    }
    ref.read(chatControllerProvider.notifier).handOff();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatControllerProvider);

    ref.listen<ChatState>(chatControllerProvider, (previous, next) {
      if (previous?.messages.length != next.messages.length || previous?.isReplying != next.isReplying) _scrollToEnd();
      final ticketId = next.ticketId;
      if (ticketId != null && previous?.ticketId != ticketId) {
        context.pushReplacement(RoutePaths.supportTicketDetailPath(ticketId));
      }
    });

    final itemCount = chat.messages.length + (chat.isReplying ? 1 : 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Help assistant'),
        actions: [
          TextButton(
            onPressed: chat.isHandingOff ? null : () => _talkToAPerson(chat),
            child: const Text('Talk to a person'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: itemCount,
              itemBuilder: (context, index) {
                if (index >= chat.messages.length) return const _TypingBubble();
                return _MessageBubble(message: chat.messages[index]);
              },
            ),
          ),
          if (chat.handoffSuggested && chat.hasUserMessage)
            _HandoffBanner(
              isLoading: chat.isHandingOff,
              error: chat.handoffError,
              onPressed: () => ref.read(chatControllerProvider.notifier).handOff(),
            ),
          _InputBar(controller: _inputController, enabled: !chat.isReplying, onSend: _send),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == ChatRole.user;
    final background = isUser ? AppColors.primary600 : (message.isError ? AppColors.dangerBg : AppColors.slate100);
    final foreground = isUser ? AppColors.white : (message.isError ? AppColors.danger : AppColors.slate900);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.8),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(14)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SelectableText(message.text, style: TextStyle(fontSize: 14, height: 1.4, color: foreground)),
              if (message.sourceTitles.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'From: ${message.sourceTitles.first}',
                  style: const TextStyle(fontSize: 11.5, color: AppColors.slate500),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(14)),
        child: const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    );
  }
}

class _HandoffBanner extends StatelessWidget {
  const _HandoffBanner({required this.isLoading, required this.error, required this.onPressed});

  final bool isLoading;
  final String? error;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: const BoxDecoration(
        color: AppColors.primary50,
        border: Border(top: BorderSide(color: AppColors.primary100)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Not what you needed? Our support team can look at this and reply to you.',
            style: TextStyle(fontSize: 13, color: AppColors.slate700),
          ),
          if (error != null) ...[
            const SizedBox(height: 6),
            Text(error!, style: const TextStyle(fontSize: 12.5, color: AppColors.danger)),
          ],
          const SizedBox(height: 10),
          LoadingButton(label: 'Talk to a person', outlined: true, isLoading: isLoading, onPressed: onPressed),
        ],
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  const _InputBar({required this.controller, required this.enabled, required this.onSend});

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                enabled: enabled,
                minLines: 1,
                maxLines: 4,
                textInputAction: TextInputAction.send,
                inputFormatters: [LengthLimitingTextInputFormatter(_maxQuestionLength)],
                onSubmitted: (_) => onSend(),
                decoration: const InputDecoration(hintText: 'Ask a question…'),
              ),
            ),
            IconButton(
              tooltip: 'Send',
              onPressed: enabled ? onSend : null,
              icon: const Icon(Icons.send_rounded, color: AppColors.primary600),
            ),
          ],
        ),
      ),
    );
  }
}
