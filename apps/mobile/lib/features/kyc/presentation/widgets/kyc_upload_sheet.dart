import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/kyc_providers.dart';

final _pickedFileProvider = StateProvider.autoDispose<File?>((ref) => null);

final _kycUploadSubmitProvider =
    AsyncNotifierProvider.autoDispose<_KycUploadSubmitNotifier, void>(_KycUploadSubmitNotifier.new);

class _KycUploadSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({required String documentType, required String documentNumber}) async {
    final pickedFile = ref.read(_pickedFileProvider);
    if (pickedFile == null) {
      state = AsyncError('Please attach a photo of your document.', StackTrace.current);
      return false;
    }

    state = const AsyncLoading();
    final result = await ref.read(kycRepositoryProvider).uploadDocument(
          documentType: documentType,
          documentNumber: documentNumber,
          filePath: pickedFile.path,
        );

    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not upload — please try again.', StackTrace.current);
      return false;
    }

    state = const AsyncData(null);
    ref.read(kycRefreshProvider.notifier).state++;
    return true;
  }
}

/// Bottom-sheet flow for uploading (or resubmitting) one KYC document.
/// [documentType] is fixed for the sheet's lifetime — a user picks which
/// slot they're filling before this opens.
class KycUploadSheet extends ConsumerStatefulWidget {
  const KycUploadSheet({super.key, required this.documentType, required this.title});

  final String documentType;
  final String title;

  @override
  ConsumerState<KycUploadSheet> createState() => _KycUploadSheetState();
}

class _KycUploadSheetState extends ConsumerState<KycUploadSheet> {
  final _documentNumberController = TextEditingController();

  @override
  void dispose() {
    _documentNumberController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked != null) ref.read(_pickedFileProvider.notifier).state = File(picked.path);
  }

  Future<void> _submit() async {
    final success = await ref.read(_kycUploadSubmitProvider.notifier).submit(
          documentType: widget.documentType,
          documentNumber: _documentNumberController.text.trim(),
        );

    if (!mounted || !success) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final showDocumentNumber = widget.documentType != 'SELFIE';
    final pickedFile = ref.watch(_pickedFileProvider);
    final submitState = ref.watch(_kycUploadSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          if (errorMessage != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
              child: Text(errorMessage, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
            ),
            const SizedBox(height: 16),
          ],
          if (pickedFile != null)
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(pickedFile, height: 180, width: double.infinity, fit: BoxFit.cover),
                ),
                Positioned(
                  top: 6,
                  right: 6,
                  child: IconButton(
                    style: IconButton.styleFrom(backgroundColor: Colors.black54, foregroundColor: Colors.white),
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => ref.read(_pickedFileProvider.notifier).state = null,
                  ),
                ),
              ],
            )
          else
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined, size: 18),
                    label: const Text('Camera'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_outlined, size: 18),
                    label: const Text('Gallery'),
                  ),
                ),
              ],
            ),
          if (showDocumentNumber) ...[
            const SizedBox(height: 16),
            TextField(
              controller: _documentNumberController,
              decoration: const InputDecoration(labelText: 'Document number (optional)'),
            ),
          ],
          const SizedBox(height: 20),
          LoadingButton(label: 'Upload', isLoading: submitState.isLoading, onPressed: _submit),
        ],
      ),
    );
  }
}
