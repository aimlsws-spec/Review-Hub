import 'package:freezed_annotation/freezed_annotation.dart';

import '../data/models/chatbot_model.dart';

part 'chat_state.freezed.dart';

/// One line in the chat, kept only on the phone while the screen is open.
@freezed
abstract class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required ChatRole role,
    required String text,
    @Default(<String>[]) List<String> sourceTitles,
    @Default(false) bool isError,
  }) = _ChatMessage;
}

/// Everything the chat screen shows.
@freezed
abstract class ChatState with _$ChatState {
  const factory ChatState({
    @Default(<ChatMessage>[]) List<ChatMessage> messages,
    @Default(false) bool isReplying,
    @Default(false) bool isHandingOff,
    /// True when the assistant is unsure, so "Talk to a person" is shown prominently.
    @Default(false) bool handoffSuggested,
    @Default('GENERAL') String suggestedCategory,
    /// Set once the chat has been handed over; the screen then opens the ticket.
    String? ticketId,
    String? handoffError,
  }) = _ChatState;
}

extension ChatStateX on ChatState {
  bool get hasUserMessage => messages.any((m) => m.role == ChatRole.user);
}
