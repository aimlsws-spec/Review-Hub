import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../data/models/location_models.dart';
import '../../providers/profile_providers.dart';

// What is on screen. Each starts from what is saved and lives only while this screen is open.
final _birthDateProvider = StateProvider.autoDispose<DateTime?>((ref) => ref.read(authStateProvider).value?.birthDate);
final _genderProvider = StateProvider.autoDispose<UserGender?>((ref) => ref.read(authStateProvider).value?.genderType);
final _stateIdProvider = StateProvider.autoDispose<String?>((ref) => ref.read(authStateProvider).value?.stateId);
final _cityIdProvider = StateProvider.autoDispose<String?>((ref) => ref.read(authStateProvider).value?.cityId);

final _editProfileSubmitProvider =
    AsyncNotifierProvider.autoDispose<_EditProfileSubmitNotifier, void>(_EditProfileSubmitNotifier.new);

class _EditProfileSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  /// Saves exactly what is on screen: a cleared field is sent as "remove it".
  Future<bool> submit({required String firstName, required String lastName}) async {
    state = const AsyncLoading();
    final birthDate = ref.read(_birthDateProvider);
    final result = await ref.read(authStateProvider.notifier).updateProfileDetails(
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: birthDate == null ? null : toApiDate(birthDate),
          gender: ref.read(_genderProvider)?.apiValue,
          stateId: ref.read(_stateIdProvider),
          cityId: ref.read(_cityIdProvider),
        );
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not update your profile.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authStateProvider).value;
    _firstNameController = TextEditingController(text: user?.firstName ?? '');
    _lastNameController = TextEditingController(text: user?.lastName ?? '');
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(_editProfileSubmitProvider.notifier).submit(
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
        );

    if (!mounted || !success) return;

    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    // Keep what is on screen alive even while a field is not being drawn (the city field is not, while the new
    // state's cities load). Without a listener an auto-dispose value is thrown away, and it would start again from
    // what was saved: a city from the old state that the server would refuse.
    ref.listen(_birthDateProvider, (previous, next) {});
    ref.listen(_genderProvider, (previous, next) {});
    ref.listen(_stateIdProvider, (previous, next) {});
    ref.listen(_cityIdProvider, (previous, next) {});

    final submitState = ref.watch(_editProfileSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
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
                  controller: _firstNameController,
                  decoration: const InputDecoration(labelText: 'First name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _lastNameController,
                  decoration: const InputDecoration(labelText: 'Last name'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 28),
                const Text('About you', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.slate900)),
                const SizedBox(height: 4),
                const Text(
                  'Optional. Used to match you with campaigns made for you.',
                  style: TextStyle(fontSize: 13, color: AppColors.slate500, height: 1.4),
                ),
                const SizedBox(height: 16),
                const _BirthDateField(),
                const SizedBox(height: 16),
                const _GenderField(),
                const SizedBox(height: 16),
                const _LocationFields(),
                const SizedBox(height: 24),
                LoadingButton(label: 'Save changes', isLoading: submitState.isLoading, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BirthDateField extends ConsumerWidget {
  const _BirthDateField();

  Future<void> _pick(BuildContext context, WidgetRef ref) async {
    final now = DateTime.now();
    final youngest = DateTime(now.year - kMinUserAge, now.month, now.day);
    final oldest = DateTime(now.year - kMaxUserAge, now.month, now.day);
    final saved = ref.read(_birthDateProvider);
    // The picker only offers dates the server will accept, so a person can not choose an age that gets refused.
    final initial = saved != null && !saved.isAfter(youngest) && !saved.isBefore(oldest)
        ? saved
        : DateTime(now.year - 25, now.month, now.day);

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: oldest,
      lastDate: youngest,
      helpText: 'Date of birth',
    );
    if (picked != null) ref.read(_birthDateProvider.notifier).state = picked;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final birthDate = ref.watch(_birthDateProvider);

    return InkWell(
      onTap: () => _pick(context, ref),
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: 'Date of birth',
          suffixIcon: birthDate == null
              ? const Icon(Icons.calendar_today_outlined, size: 20)
              : IconButton(
                  tooltip: 'Remove date of birth',
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => ref.read(_birthDateProvider.notifier).state = null,
                ),
        ),
        child: Text(
          birthDate == null ? 'Not set' : DateFormat('d MMM yyyy').format(birthDate),
          style: TextStyle(fontSize: 16, color: birthDate == null ? AppColors.slate400 : AppColors.slate900),
        ),
      ),
    );
  }
}

class _GenderField extends ConsumerWidget {
  const _GenderField();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _DropdownField<UserGender?>(
      label: 'Gender',
      value: ref.watch(_genderProvider),
      items: [
        const DropdownMenuItem<UserGender?>(value: null, child: Text('Prefer not to say')),
        for (final gender in UserGender.values) DropdownMenuItem<UserGender?>(value: gender, child: Text(gender.label)),
      ],
      onChanged: (gender) => ref.read(_genderProvider.notifier).state = gender,
    );
  }
}

class _LocationFields extends ConsumerWidget {
  const _LocationFields();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stateId = ref.watch(_stateIdProvider);
    final states = ref.watch(statesProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        states.when(
          loading: () => const _DropdownField<String?>(label: 'State', value: null, items: [], hint: 'Loading states…'),
          error: (error, stack) => _LoadFailed(message: 'Could not load states', onRetry: () => ref.invalidate(statesProvider)),
          data: (result) => result.when(
            failure: (failure) => _LoadFailed(message: failure.message, onRetry: () => ref.invalidate(statesProvider)),
            success: (list) => _DropdownField<String?>(
              label: 'State',
              value: stateId,
              items: [
                const DropdownMenuItem<String?>(value: null, child: Text('Not set')),
                for (final state in list) DropdownMenuItem<String?>(value: state.id, child: Text(state.name)),
              ],
              onChanged: (id) {
                if (id == stateId) return;
                ref.read(_stateIdProvider.notifier).state = id;
                // A city belongs to one state, so a new state starts with no city.
                ref.read(_cityIdProvider.notifier).state = null;
              },
            ),
          ),
        ),
        const SizedBox(height: 16),
        _CityField(stateId: stateId),
      ],
    );
  }
}

class _CityField extends ConsumerWidget {
  const _CityField({required this.stateId});

  final String? stateId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = stateId;
    if (id == null) {
      return const _DropdownField<String?>(label: 'City', value: null, items: [], hint: 'Choose a state first');
    }

    final cities = ref.watch(citiesProvider(id));
    return cities.when(
      loading: () => const _DropdownField<String?>(label: 'City', value: null, items: [], hint: 'Loading cities…'),
      error: (error, stack) => _LoadFailed(message: 'Could not load cities', onRetry: () => ref.invalidate(citiesProvider(id))),
      data: (result) => result.when(
        failure: (failure) => _LoadFailed(message: failure.message, onRetry: () => ref.invalidate(citiesProvider(id))),
        success: (list) => _DropdownField<String?>(
          label: 'City',
          value: ref.watch(_cityIdProvider),
          items: [
            const DropdownMenuItem<String?>(value: null, child: Text('Not set')),
            for (final CityModel city in list) DropdownMenuItem<String?>(value: city.id, child: Text(city.name)),
          ],
          onChanged: (cityId) => ref.read(_cityIdProvider.notifier).state = cityId,
        ),
      ),
    );
  }
}

/// A labelled dropdown that always shows the current choice. A saved value that is no longer on the list (for
/// example a city that was switched off) shows as unset instead of crashing the screen.
class _DropdownField<T> extends StatelessWidget {
  const _DropdownField({required this.label, required this.value, required this.items, this.onChanged, this.hint});

  final String label;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?>? onChanged;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final isOnList = items.any((item) => item.value == value);

    return InputDecorator(
      decoration: InputDecoration(labelText: label),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          isExpanded: true,
          value: isOnList ? value : null,
          hint: hint == null ? null : Text(hint!, style: const TextStyle(color: AppColors.slate400)),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _LoadFailed extends StatelessWidget {
  const _LoadFailed({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
        TextButton(onPressed: onRetry, child: const Text('Try again')),
      ],
    );
  }
}
