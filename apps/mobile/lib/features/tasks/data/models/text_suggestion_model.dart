import 'package:freezed_annotation/freezed_annotation.dart';

part 'text_suggestion_model.freezed.dart';
part 'text_suggestion_model.g.dart';

/// Mirrors the response of `GET /tasks/:taskId/text-suggestion` — a free,
/// AI-drafted review/caption the user can copy or drop straight into the
/// answer field before submitting.
@freezed
abstract class TextSuggestionModel with _$TextSuggestionModel {
  const factory TextSuggestionModel({
    required String suggestion,
    required String source, // "llm" | "template"
  }) = _TextSuggestionModel;

  factory TextSuggestionModel.fromJson(Map<String, dynamic> json) => _$TextSuggestionModelFromJson(json);
}
