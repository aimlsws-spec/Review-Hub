/// What a person can tell the review assistant about their visit. The values are the API's own names
/// (`apps/backend/src/modules/ai/dto/draft-review.dto.ts`).
enum ReviewAspect {
  food('FOOD', 'Food'),
  staff('STAFF', 'Staff'),
  price('PRICE', 'Price'),
  cleanliness('CLEANLINESS', 'Cleanliness'),
  service('SERVICE', 'Service');

  const ReviewAspect(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// How the visit went overall, in the person's own words. It is asked, never worked out from a rating.
enum ReviewExperience {
  positive('POSITIVE', 'Good'),
  mixed('MIXED', 'Mixed'),
  negative('NEGATIVE', 'Not good');

  const ReviewExperience(this.apiValue, this.label);

  final String apiValue;
  final String label;
}

/// Whether the person would recommend the place. "Not saying" is a real answer: nothing is written for them.
enum RecommendChoice {
  yes('Yes', true),
  no('No', false),
  notSaying('Prefer not to say', null);

  const RecommendChoice(this.label, this.apiValue);

  final String label;

  /// Sent to the server only when the person answered; `null` means the field is left out.
  final bool? apiValue;
}

/// The person's answers so far. Nothing here is defaulted for them: the overall experience starts unanswered.
class ReviewAnswers {
  const ReviewAnswers({
    this.liked = const {},
    this.improve = const {},
    this.experience,
    this.recommend = RecommendChoice.notSaying,
  });

  final Set<ReviewAspect> liked;
  final Set<ReviewAspect> improve;
  final ReviewExperience? experience;
  final RecommendChoice recommend;

  /// The overall experience is the one thing that has to be answered, so a draft's tone is the person's own.
  bool get isReady => experience != null;

  ReviewAnswers copyWith({
    Set<ReviewAspect>? liked,
    Set<ReviewAspect>? improve,
    ReviewExperience? experience,
    RecommendChoice? recommend,
  }) => ReviewAnswers(
    liked: liked ?? this.liked,
    improve: improve ?? this.improve,
    experience: experience ?? this.experience,
    recommend: recommend ?? this.recommend,
  );

  /// The request body. Only what was answered is sent.
  Map<String, dynamic> toRequestBody({String notes = ''}) {
    final trimmedNotes = notes.trim();
    final experience = this.experience;
    return {
      if (liked.isNotEmpty)
        'likedAspects': [
          for (final a in ReviewAspect.values)
            if (liked.contains(a)) a.apiValue,
        ],
      if (improve.isNotEmpty)
        'improveAspects': [
          for (final a in ReviewAspect.values)
            if (improve.contains(a)) a.apiValue,
        ],
      if (experience != null) 'experience': experience.apiValue,
      if (recommend.apiValue != null) 'wouldRecommend': recommend.apiValue,
      if (trimmedNotes.isNotEmpty) 'notes': trimmedNotes,
    };
  }
}

/// Mirrors the response of `POST /tasks/:taskId/review-drafts`.
class ReviewDraftsModel {
  const ReviewDraftsModel({required this.drafts, required this.source});

  final List<String> drafts;

  /// `llm` or `template`.
  final String source;

  factory ReviewDraftsModel.fromJson(Map<String, dynamic> json) {
    final raw = json['drafts'];
    return ReviewDraftsModel(
      drafts: raw is List
          ? [
              for (final item in raw)
                if (item is String && item.trim().isNotEmpty) item.trim(),
            ]
          : const [],
      source: json['source'] as String? ?? 'template',
    );
  }
}
