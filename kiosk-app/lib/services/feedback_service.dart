import 'api_client.dart';

/// Standalone cafe feedback, decoupled from any specific order - mirrors
/// POST /api/cafes/[slug]/feedback on the web app. Distinct from
/// [OrderService.submitFeedback], which rates a single order right after
/// checkout.
class FeedbackService {
  final ApiClient _client;

  FeedbackService({ApiClient? client}) : _client = client ?? ApiClient();

  /// The cafeteria survey shown on the kiosk: a name plus one answer per
  /// question. Values are the server-side enum names, not the labels the
  /// customer taps - see FeedbackSurveyQuestion in the feedback screen.
  Future<ApiResult<void>> submitCafeSurvey({
    required String cafeSlug,
    String? customerName,
    String? comment,
    required String mealSession,
    required String foodQuality,
    required String cleanliness,
    required String menuVariety,
    required String overallExperience,
  }) {
    return _client.postJson(
      '/api/cafes/$cafeSlug/feedback',
      {
        if (customerName != null && customerName.isNotEmpty)
          'customerName': customerName,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
        'mealSession': mealSession,
        'foodQuality': foodQuality,
        'cleanliness': cleanliness,
        'menuVariety': menuVariety,
        'overallExperience': overallExperience,
      },
      (_) {},
    );
  }
}
