import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/core/network/token_storage.dart';
import 'package:viral_kar/features/auth/data/auth_repository.dart';
import 'package:viral_kar/features/auth/data/models/user_model.dart';
import 'package:viral_kar/features/auth/providers/auth_providers.dart';
import 'package:viral_kar/features/profile/data/location_repository.dart';
import 'package:viral_kar/features/profile/data/models/location_models.dart';
import 'package:viral_kar/features/profile/presentation/screens/edit_profile_screen.dart';
import 'package:viral_kar/features/profile/providers/profile_providers.dart';

/// Stands in for the network: answers every request with what the test sets, and remembers the last request.
class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.body, {this.status = 200});

  final Object body;
  final int status;
  RequestOptions? last;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    last = options;
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _FakeTokenStorage extends Fake implements TokenStorage {}

Dio _dio(_FakeAdapter adapter) => Dio(BaseOptions(baseUrl: 'http://test'))..httpClientAdapter = adapter;

const _user = UserModel(id: 'u1', firstName: 'Priya', lastName: 'Shah', status: 'ACTIVE');

Map<String, dynamic> _profileJson({Map<String, dynamic> extra = const {}}) => {
      'id': 'u1',
      'firstName': 'Priya',
      'lastName': 'Shah',
      'status': 'ACTIVE',
      ...extra,
    };

void main() {
  group('UserModel demographics', () {
    test('parses the saved details', () {
      final user = UserModel.fromJson(_profileJson(extra: {
        'dateOfBirth': '1998-04-21',
        'gender': 'FEMALE',
        'countryId': 'c-in',
        'stateId': 's-gj',
        'cityId': 'city-amd',
      }));

      expect(user.birthDate, DateTime(1998, 4, 21));
      expect(user.genderType, UserGender.female);
      expect(user.stateId, 's-gj');
      expect(user.cityId, 'city-amd');
    });

    test('a profile with none of them still parses, with nothing set', () {
      final user = UserModel.fromJson(_profileJson());

      expect(user.birthDate, isNull);
      expect(user.genderType, isNull);
      expect(user.stateId, isNull);
    });

    test('an unreadable date of birth is treated as not set instead of crashing', () {
      for (final bad in ['garbage', '1998-04', '1998-xx-21', '']) {
        expect(UserModel.fromJson(_profileJson(extra: {'dateOfBirth': bad})).birthDate, isNull, reason: bad);
      }
    });

    test('an unknown gender from a newer server is treated as not set', () {
      expect(UserGender.fromApi('SOMETHING_NEW'), isNull);
      expect(UserGender.fromApi(null), isNull);
      expect(UserGender.fromApi('OTHER'), UserGender.other);
    });

    test('a date is sent as YYYY-MM-DD with no time', () {
      expect(toApiDate(DateTime(1998, 4, 5)), '1998-04-05');
      expect(toApiDate(DateTime(2001, 12, 31, 23, 59)), '2001-12-31');
    });
  });

  group('LocationRepository', () {
    test('lists states', () async {
      final adapter = _FakeAdapter({
        'success': true,
        'data': [
          {'id': 's1', 'name': 'Gujarat', 'code': 'GJ'},
          {'id': 's2', 'name': 'Goa', 'code': null},
        ],
      });

      final result = await LocationRepository(_dio(adapter)).listStates();

      expect(result.valueOrNull?.map((s) => s.name), ['Gujarat', 'Goa']);
      expect(adapter.last?.path, '/locations/states');
    });

    test('lists the cities of a state', () async {
      final adapter = _FakeAdapter({
        'data': [
          {'id': 'c1', 'name': 'Ahmedabad'},
        ],
      });

      final result = await LocationRepository(_dio(adapter)).listCities('s1');

      expect(result.valueOrNull?.single.name, 'Ahmedabad');
      expect(adapter.last?.path, '/locations/states/s1/cities');
    });

    test('skips a badly formed row and keeps the rest', () async {
      final adapter = _FakeAdapter({
        'data': [
          {'id': 's1', 'name': 'Gujarat'},
          'not an object',
          {'name': 'No id'},
          {'id': 's3', 'name': 'Goa'},
        ],
      });

      final result = await LocationRepository(_dio(adapter)).listStates();

      expect(result.valueOrNull?.map((s) => s.id), ['s1', 's3']);
    });

    test('an answer that is not a list is an empty list, not a crash', () async {
      final result = await LocationRepository(_dio(_FakeAdapter({'data': null}))).listStates();
      expect(result.valueOrNull, isEmpty);
    });

    test('a server error becomes a failure', () async {
      final result = await LocationRepository(_dio(_FakeAdapter({'message': 'boom'}, status: 500))).listStates();
      expect(result.isFailure, isTrue);
    });
  });

  group('AuthRepository.updateProfileDetails', () {
    test('sends every detail, and a null means remove it', () async {
      final adapter = _FakeAdapter({'data': _profileJson()});

      await AuthRepository(_dio(adapter), _FakeTokenStorage()).updateProfileDetails(
        firstName: 'Priya',
        lastName: 'Shah',
        dateOfBirth: null,
        gender: null,
        stateId: null,
        cityId: null,
      );

      final sent = adapter.last?.data as Map<String, dynamic>;
      expect(sent.keys, containsAll(['firstName', 'lastName', 'dateOfBirth', 'gender', 'stateId', 'cityId']));
      expect(sent['dateOfBirth'], isNull);
      expect(sent['stateId'], isNull);
      expect(adapter.last?.method, 'PATCH');
      expect(adapter.last?.path, '/auth/profile');
    });

    test('sends the chosen values', () async {
      final adapter = _FakeAdapter({'data': _profileJson()});

      await AuthRepository(_dio(adapter), _FakeTokenStorage()).updateProfileDetails(
        firstName: 'Priya',
        lastName: 'Shah',
        dateOfBirth: '1998-04-21',
        gender: 'FEMALE',
        stateId: 's-gj',
        cityId: 'c-amd',
      );

      final sent = adapter.last?.data as Map<String, dynamic>;
      expect(sent['dateOfBirth'], '1998-04-21');
      expect(sent['gender'], 'FEMALE');
      expect(sent['cityId'], 'c-amd');
    });
  });

  group('EditProfileScreen', () {
    const gujarat = StateModel(id: 's-gj', name: 'Gujarat', code: 'GJ');
    const maharashtra = StateModel(id: 's-mh', name: 'Maharashtra', code: 'MH');
    const ahmedabad = CityModel(id: 'c-amd', name: 'Ahmedabad');
    const surat = CityModel(id: 'c-srt', name: 'Surat');
    const mumbai = CityModel(id: 'c-mum', name: 'Mumbai');

    UserModel? signedIn;
    Result<UserModel> saveResult = const Result.success(_user);
    Map<String, Object?>? saved;

    Widget app({Result<List<StateModel>>? states}) {
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            // Like the real app, the signed-in user is already loaded before the edit screen opens.
            builder: (context, state) => Consumer(
              builder: (context, ref, child) {
                ref.watch(authStateProvider);
                return Scaffold(
                  body: Center(child: ElevatedButton(onPressed: () => context.push('/edit'), child: const Text('open'))),
                );
              },
            ),
          ),
          GoRoute(path: '/edit', builder: (context, state) => const EditProfileScreen()),
        ],
      );
      return ProviderScope(
        overrides: [
          authStateProvider.overrideWith(() => _FakeAuthState(signedIn, (args) {
                saved = args;
                return saveResult;
              })),
          statesProvider.overrideWith((ref) async => states ?? const Result.success([gujarat, maharashtra])),
          citiesProvider('s-gj').overrideWith((ref) async => const Result.success([ahmedabad, surat])),
          citiesProvider('s-mh').overrideWith((ref) async => const Result.success([mumbai])),
        ],
        child: MaterialApp.router(routerConfig: router),
      );
    }

    Future<void> open(WidgetTester tester, {Result<List<StateModel>>? states}) async {
      tester.view.physicalSize = const Size(800, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(app(states: states));
      await tester.pumpAndSettle();
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
    }

    Future<void> choose(WidgetTester tester, {required String field, required String option}) async {
      await tester.tap(find.widgetWithText(InputDecorator, field));
      await tester.pumpAndSettle();
      await tester.tap(find.text(option).last);
      await tester.pumpAndSettle();
    }

    setUp(() {
      signedIn = _user.copyWith(dateOfBirth: '1998-04-21', gender: 'FEMALE', stateId: 's-gj', cityId: 'c-amd');
      saveResult = const Result.success(_user);
      saved = null;
    });

    testWidgets('shows what is already saved', (tester) async {
      await open(tester);

      expect(find.text('21 Apr 1998'), findsOneWidget);
      expect(find.text('Female'), findsOneWidget);
      expect(find.text('Gujarat'), findsOneWidget);
      expect(find.text('Ahmedabad'), findsOneWidget);
    });

    testWidgets('shows everything as not set for someone who has not filled it in', (tester) async {
      signedIn = _user;
      await open(tester);

      expect(find.text('Not set'), findsNWidgets(2)); // date of birth and state
      expect(find.text('Prefer not to say'), findsOneWidget);
      expect(find.text('Choose a state first'), findsOneWidget);
    });

    testWidgets('saves exactly what is on screen', (tester) async {
      await open(tester);

      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(saved, {
        'firstName': 'Priya',
        'lastName': 'Shah',
        'dateOfBirth': '1998-04-21',
        'gender': 'FEMALE',
        'stateId': 's-gj',
        'cityId': 'c-amd',
      });
    });

    testWidgets('closes the screen and confirms once it is saved', (tester) async {
      await open(tester);

      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(find.text('Edit profile'), findsNothing);
      expect(find.text('Profile updated'), findsOneWidget);
    });

    testWidgets('removing the date of birth saves it as removed', (tester) async {
      await open(tester);

      await tester.tap(find.byTooltip('Remove date of birth'));
      await tester.pumpAndSettle();
      expect(find.text('Not set'), findsOneWidget);
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(saved?['dateOfBirth'], isNull);
      expect(saved?['gender'], 'FEMALE');
    });

    testWidgets('choosing "prefer not to say" saves the gender as removed', (tester) async {
      await open(tester);

      await choose(tester, field: 'Gender', option: 'Prefer not to say');
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(saved?['gender'], isNull);
    });

    testWidgets('picking a date of birth from the calendar', (tester) async {
      signedIn = _user;
      await open(tester);

      await tester.tap(find.widgetWithText(InputDecorator, 'Date of birth'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      final now = DateTime.now();
      final expected = DateTime(now.year - 25, now.month, now.day);
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();
      expect(saved?['dateOfBirth'], toApiDate(expected));
    });

    testWidgets('a different state starts with no city, and offers that state\'s cities', (tester) async {
      await open(tester);

      await choose(tester, field: 'State', option: 'Maharashtra');

      expect(find.text('Ahmedabad'), findsNothing);
      await choose(tester, field: 'City', option: 'Mumbai');
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(saved?['stateId'], 's-mh');
      expect(saved?['cityId'], 'c-mum');
    });

    testWidgets('a state with no city chosen saves the city as removed', (tester) async {
      await open(tester);

      await choose(tester, field: 'State', option: 'Maharashtra');
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(saved?['stateId'], 's-mh');
      expect(saved?['cityId'], isNull);
    });

    testWidgets('a saved state that is no longer on the list shows as not set instead of crashing', (tester) async {
      signedIn = _user.copyWith(stateId: 's-gone', cityId: 'c-gone');
      await open(tester);

      expect(tester.takeException(), isNull);
      expect(find.text('Edit profile'), findsOneWidget);
    });

    testWidgets('shows the server message and stays open when saving is refused', (tester) async {
      saveResult = const Result.failure(ValidationFailure('That city is not in the chosen state'));
      await open(tester);

      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(find.text('That city is not in the chosen state'), findsOneWidget);
      expect(find.text('Edit profile'), findsOneWidget);
    });

    testWidgets('says so and offers a retry when the states cannot be loaded', (tester) async {
      await open(tester, states: const Result.failure(NetworkFailure()));

      expect(find.text('No internet connection. Please try again.'), findsOneWidget);
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('still requires a first and last name', (tester) async {
      await open(tester);

      await tester.enterText(find.widgetWithText(TextFormField, 'First name'), '');
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();

      expect(find.text('Required'), findsOneWidget);
      expect(saved, isNull);
    });
  });
}

/// A signed-in user, and a stand-in for saving that records what the screen sent.
class _FakeAuthState extends AuthStateNotifier {
  _FakeAuthState(this._user, this._onSave);

  final UserModel? _user;
  final Result<UserModel> Function(Map<String, Object?> args) _onSave;

  @override
  Future<UserModel?> build() async => _user;

  @override
  Future<Result<UserModel>> updateProfileDetails({
    required String firstName,
    required String lastName,
    required String? dateOfBirth,
    required String? gender,
    required String? stateId,
    required String? cityId,
  }) async {
    return _onSave({
      'firstName': firstName,
      'lastName': lastName,
      'dateOfBirth': dateOfBirth,
      'gender': gender,
      'stateId': stateId,
      'cityId': cityId,
    });
  }
}
