import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_task_model.dart';

CampaignTaskModel _task({required String taskType, Map<String, dynamic>? configuration, String? proofType}) {
  return CampaignTaskModel(
    id: 'task-1',
    campaignId: 'campaign-1',
    title: 'Task',
    taskType: taskType,
    verificationType: 'AI',
    configuration: configuration,
    proofType: proofType,
  );
}

void main() {
  group('CampaignTaskModelX — QR_SCAN', () {
    test('isQrScanTask is true only for that task type', () {
      expect(_task(taskType: 'QR_SCAN').isQrScanTask, isTrue);
      expect(_task(taskType: 'LOCATION_CHECKIN').isQrScanTask, isFalse);
    });

    test('never exposes an expected code — the backend already strips it', () {
      // Sanity check on the model itself: nothing here reads a "qrCode" key back out.
      final task = _task(taskType: 'QR_SCAN', configuration: const {'note': 'front desk'});
      expect(task.configuration, {'note': 'front desk'});
    });
  });

  group('CampaignTaskModelX — LOCATION_CHECKIN', () {
    test('isLocationCheckInTask is true only for that task type', () {
      expect(_task(taskType: 'LOCATION_CHECKIN').isLocationCheckInTask, isTrue);
      expect(_task(taskType: 'QR_SCAN').isLocationCheckInTask, isFalse);
    });

    test('reads the target coordinates from configuration', () {
      final task = _task(taskType: 'LOCATION_CHECKIN', configuration: const {'latitude': 12.9716, 'longitude': 77.5946});

      expect(task.targetLatitude, 12.9716);
      expect(task.targetLongitude, 77.5946);
    });

    test('defaults the radius to 200m when not configured', () {
      final task = _task(taskType: 'LOCATION_CHECKIN', configuration: const {'latitude': 12.9716, 'longitude': 77.5946});

      expect(task.targetRadiusMeters, 200);
    });

    test('uses a configured radius instead of the default', () {
      final task = _task(
        taskType: 'LOCATION_CHECKIN',
        configuration: const {'latitude': 12.9716, 'longitude': 77.5946, 'radiusMeters': 50},
      );

      expect(task.targetRadiusMeters, 50);
    });

    test('returns null coordinates when there is no configuration at all', () {
      final task = _task(taskType: 'LOCATION_CHECKIN');

      expect(task.targetLatitude, isNull);
      expect(task.targetLongitude, isNull);
      expect(task.targetRadiusMeters, 200);
    });
  });

  group('CampaignTaskModelX — ordinary tasks are unaffected', () {
    test('does not offer the generic file/url/text sections once proofType is forced by the backend', () {
      // CampaignTaskService forces proofType to QR_CODE/LOCATION for these task types — see forcedProofType.
      final qr = _task(taskType: 'QR_SCAN', proofType: 'QR_CODE');
      final location = _task(taskType: 'LOCATION_CHECKIN', proofType: 'LOCATION');

      for (final task in [qr, location]) {
        expect(task.acceptsFile, isFalse);
        expect(task.acceptsUrl, isFalse);
        expect(task.acceptsText, isFalse);
      }
    });
  });
}
