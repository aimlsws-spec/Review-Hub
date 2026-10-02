import 'package:freezed_annotation/freezed_annotation.dart';

part 'content_page_model.freezed.dart';
part 'content_page_model.g.dart';

/// A published content page from `GET /pages/:slug`, e.g. the Terms & Conditions. [content] is plain text.
@freezed
abstract class ContentPageModel with _$ContentPageModel {
  const factory ContentPageModel({
    required String slug,
    required String title,
    required String content,
    DateTime? publishedAt,
    DateTime? updatedAt,
  }) = _ContentPageModel;

  factory ContentPageModel.fromJson(Map<String, dynamic> json) => _$ContentPageModelFromJson(json);
}
