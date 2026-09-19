import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/support_providers.dart';

const _kCategories = ['ACCOUNT', 'CAMPAIGN', 'PAYMENT', 'WITHDRAWAL', 'REWARD', 'BUG', 'GENERAL'];
const _kPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

final _categoryProvider = StateProvider.autoDispose<String>((ref) => 'GENERAL');
final _priorityProvider = StateProvider.autoDispose<String>((ref) => 'MEDIUM');

final _newTicketSubmitProvider =
    AsyncNotifierProvider.autoDispose<_NewTicketSubmitNotifier, void>(_NewTicketSubmitNotifier.new);

class _NewTicketSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({
    required String subject,
    required String description,
    required String category,
    required String priority,
  }) async {
    state = const AsyncLoading();
    final result = await ref.read(supportRepositoryProvider).createTicket(
          subject: subject,
          description: description,
          category: category,
          priority: priority,
        );
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not create ticket — please try again.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    ref.read(supportRefreshProvider.notifier).state++;
    return true;
  }
}

class NewSupportTicketScreen extends ConsumerStatefulWidget {
  const NewSupportTicketScreen({super.key});

  @override
  ConsumerState<NewSupportTicketScreen> createState() => _NewSupportTicketScreenState();
}

class _NewSupportTicketScreenState extends ConsumerState<NewSupportTicketScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final success = await ref.read(_newTicketSubmitProvider.notifier).submit(
          subject: _subjectController.text.trim(),
          description: _descriptionController.text.trim(),
          category: ref.read(_categoryProvider),
          priority: ref.read(_priorityProvider),
        );

    if (!mounted || !success) return;
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(_newTicketSubmitProvider);
    final category = ref.watch(_categoryProvider);
    final priority = ref.watch(_priorityProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(title: const Text('New ticket')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
                    child: Text(errorMessage, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: _subjectController,
                  decoration: const InputDecoration(labelText: 'Subject'),
                  validator: (value) {
                    final trimmed = value?.trim() ?? '';
                    if (trimmed.length < 5 || trimmed.length > 200) {
                      return 'Subject must be between 5 and 200 characters.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 5,
                  decoration: const InputDecoration(labelText: 'Description', alignLabelWithHint: true),
                  validator: (value) {
                    final trimmed = value?.trim() ?? '';
                    if (trimmed.length < 10) {
                      return 'Description must be at least 10 characters.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: _kCategories
                      .map((category) => DropdownMenuItem(value: category, child: Text(category)))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) ref.read(_categoryProvider.notifier).state = value;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: priority,
                  decoration: const InputDecoration(labelText: 'Priority'),
                  items: _kPriorities
                      .map((priority) => DropdownMenuItem(value: priority, child: Text(priority)))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) ref.read(_priorityProvider.notifier).state = value;
                  },
                ),
                const SizedBox(height: 24),
                LoadingButton(label: 'Submit', isLoading: submitState.isLoading, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
