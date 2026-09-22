import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/models/chatbot_model.dart';
import 'chat_state.dart';
import 'support_providers.dart';

/// The backend accepts at most this many lines, each up to this long, when a chat is handed over.
const int _maxTranscriptMessages = 20;
const int _maxTranscriptMessageLength = 1000;

const String _greeting = 'Hi! I can answer questions about how Viral Kar works. What would you like to know?';
const String _unreachable = 'I could not reach the assistant just now. Please try again, or tap "Talk to a person".';

/// Page-scoped: the conversation is dropped when the person leaves the chat screen.
final chatControllerProvider = NotifierProvider.autoDispose<ChatController, ChatState>(ChatController.new);

class ChatController extends Notifier<ChatState> {
  @override
  ChatState build() => const ChatState(messages: [ChatMessage(role: ChatRole.bot, text: _greeting)]);

  /// Sends a question and adds the assistant's answer. Ignored while an answer is still on its way.
  Future<void> send(String text) async {
    final question = text.trim();
    if (question.isEmpty || state.isReplying) return;

    state = state.copyWith(
      messages: [...state.messages, ChatMessage(role: ChatRole.user, text: question)],
      isReplying: true,
    );

    final result = await ref.read(supportRepositoryProvider).askAssistant(question);
    state = result.when(
      success: (reply) => state.copyWith(
        messages: [
          ...state.messages,
          ChatMessage(role: ChatRole.bot, text: reply.reply, sourceTitles: [for (final s in reply.sources) s.title]),
        ],
        isReplying: false,
        handoffSuggested: reply.suggestHandoff,
        suggestedCategory: reply.suggestedCategory,
      ),
      failure: (failure) => state.copyWith(
        messages: [...state.messages, const ChatMessage(role: ChatRole.bot, text: _unreachable, isError: true)],
        isReplying: false,
        handoffSuggested: true,
      ),
    );
  }

  /// Turns the conversation into a support ticket. The screen opens the ticket once `ticketId` is set.
  Future<void> handOff() async {
    if (state.isHandingOff || !state.hasUserMessage) return;

    state = state.copyWith(isHandingOff: true, handoffError: null);
    final recent = state.messages.length > _maxTranscriptMessages
        ? state.messages.sublist(state.messages.length - _maxTranscriptMessages)
        : state.messages;
    final transcript = [
      for (final m in recent)
        (
          role: m.role,
          text: m.text.length > _maxTranscriptMessageLength ? m.text.substring(0, _maxTranscriptMessageLength) : m.text,
        ),
    ];

    final result = await ref.read(supportRepositoryProvider).handOffChat(transcript, category: state.suggestedCategory);
    state = result.when(
      success: (ticket) {
        ref.read(supportRefreshProvider.notifier).state++;
        return state.copyWith(isHandingOff: false, ticketId: ticket.id);
      },
      failure: (failure) => state.copyWith(isHandingOff: false, handoffError: failure.message),
    );
  }
}
