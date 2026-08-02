import 'api_client.dart';

/// Standalone star-rating feedback about the cafe, decoupled from any
/// specific order - mirrors POST /api/cafes/[slug]/feedback on the web app.
/// Distinct from [OrderService.submitFeedback], which rates a single order
/// right after checkout.
class FeedbackService {
  final ApiClient _client;

  FeedbackService({ApiClient? client}) : _client = client ?? ApiClient();

  Future<ApiResult<void>> submitCafeFeedback({
    required String cafeSlug,
    required int rating,
    String? comment,
  }) {
    return _client.postJson(
      '/api/cafes/$cafeSlug/feedback',
      {
        'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      },
      (_) {},
    );
  }
}
