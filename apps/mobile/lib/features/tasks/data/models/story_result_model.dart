import '../../../../core/config/app_config.dart';

/// Mirrors the response of `POST /tasks/:taskId/story` (apps/backend/src/modules/ai/services/ai-assist.service.ts's
/// StoryResult). `imageUrl` comes back as a path relative to the server root (e.g. `/stories/<uuid>.jpg`), never a
/// full URL, so it's resolved through [AppConfig.resolveUploadUrl] before anything tries to load it.
class StoryResultModel {
  const StoryResultModel({required this.imageUrl, required this.caption, required this.hashtags});

  final String imageUrl;
  final String caption;
  final List<String> hashtags;

  factory StoryResultModel.fromJson(Map<String, dynamic> json) {
    final rawHashtags = json['hashtags'];
    return StoryResultModel(
      imageUrl: AppConfig.resolveUploadUrl(json['imageUrl'] as String? ?? ''),
      caption: json['caption'] as String? ?? '',
      hashtags: rawHashtags is List
          ? [
              for (final item in rawHashtags)
                if (item is String && item.trim().isNotEmpty) item.trim(),
            ]
          : const [],
    );
  }
}
