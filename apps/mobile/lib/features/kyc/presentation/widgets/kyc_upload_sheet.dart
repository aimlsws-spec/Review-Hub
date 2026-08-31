import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/kyc_providers.dart';

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
  File? _pickedFile;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _documentNumberController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 85);
    if (picked != null) setState(() => _pickedFile = File(picked.path));
  }

  Future<void> _submit() async {
    if (_pickedFile == null) {
      setState(() => _errorMessage = 'Please attach a photo of your document.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await ref.read(kycRepositoryProvider).uploadDocument(
          documentType: widget.documentType,
          documentNumber: _documentNumberController.text.trim(),
          filePath: _pickedFile!.path,
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Could not upload — please try again.');
      return;
    }

    ref.read(kycRefreshProvider.notifier).state++;
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final showDocumentNumber = widget.documentType != 'SELFIE';

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
          if (_errorMessage != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
              child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
            ),
            const SizedBox(height: 16),
          ],
          if (_pickedFile != null)
            Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(_pickedFile!, height: 180, width: double.infinity, fit: BoxFit.cover),
                ),
                Positioned(
                  top: 6,
                  right: 6,
                  child: IconButton(
                    style: IconButton.styleFrom(backgroundColor: Colors.black54, foregroundColor: Colors.white),
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setState(() => _pickedFile = null),
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
          LoadingButton(label: 'Upload', isLoading: _isSubmitting, onPressed: _submit),
        ],
      ),
    );
  }
}
