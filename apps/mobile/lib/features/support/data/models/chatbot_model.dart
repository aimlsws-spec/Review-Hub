import 'package:freezed_annotation/freezed_annotation.dart';

part 'chatbot_model.freezed.dart';
part 'chatbot_model.g.dart';

/// Who said a line in the chat. The backend names these in capitals; this is the one place they are mapped.
enum ChatRole {
  user('USER'),
  bot('BOT');

  const ChatRole(this.apiValue);

  final String apiValue;
}

/// The help article an answer was taken from, so the person can see where it came from.
@freezed
abstract class ChatSourceModel with _$ChatSourceModel {
  const factory ChatSourceModel({
    @Default('') String kind,
    @Default('') String id,
    @Default('') String title,
  }) = _ChatSourceModel;

  factory ChatSourceModel.fromJson(Map<String, dynamic> json) => _$ChatSourceModelFromJson(json);
}

/// Mirrors the response of `POST /support/chatbot/message`. Every field has a fallback so a partly filled
/// response still shows something instead of crashing the chat.
@freezed
abstract class ChatbotReplyModel with _$ChatbotReplyModel {
  const factory ChatbotReplyModel({
    @Default('') String reply,
    @Default(false) bool suggestHandoff,
    @Default('GENERAL') String suggestedCategory,
    @Default(<ChatSourceModel>[]) List<ChatSourceModel> sources,
  }) = _ChatbotReplyModel;

  factory ChatbotReplyModel.fromJson(Map<String, dynamic> json) => _$ChatbotReplyModelFromJson(json);
}
