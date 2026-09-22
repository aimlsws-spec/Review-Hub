import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/core/router/route_paths.dart';
import 'package:viral_kar/features/support/data/models/chatbot_model.dart';
import 'package:viral_kar/features/support/data/models/support_ticket_model.dart';
import 'package:viral_kar/features/support/data/support_repository.dart';
import 'package:viral_kar/features/support/presentation/screens/support_chat_screen.dart';
import 'package:viral_kar/features/support/providers/chat_providers.dart';
import 'package:viral_kar/features/support/providers/chat_state.dart';
import 'package:viral_kar/features/support/providers/support_providers.dart';

/// Stands in for the network: returns whatever the test sets and records what it was asked.
class _FakeSupportRepository extends Fake implements SupportRepository {
  Result<ChatbotReplyModel> askResult = const Result.success(ChatbotReplyModel(reply: 'Open Wallet and tap Withdraw.'));
  Result<SupportTicketModel> handOffResult = Result.success(_ticket);
  final List<String> questions = [];
  List<({ChatRole role, String text})>? lastTranscript;
  String? lastCategory;

  @override
  Future<Result<ChatbotReplyModel>> askAssistant(String message) async {
    questions.add(message);
    return askResult;
  }

  @override
  Future<Result<SupportTicketModel>> handOffChat(List<({ChatRole role, String text})> transcript, {String? category}) async {
    lastTranscript = transcript;
    lastCategory = category;
    return handOffResult;
  }
}

final _ticket = SupportTicketModel(
  id: 'ticket-1',
  subject: 'How do I withdraw?',
  description: 'Conversation',
  category: 'WITHDRAWAL',
  priority: 'MEDIUM',
  status: 'OPEN',
  createdAt: DateTime(2026, 9, 19),
  updatedAt: DateTime(2026, 9, 19),
);

ProviderContainer _container(_FakeSupportRepository repository) {
  final container = ProviderContainer(overrides: [supportRepositoryProvider.overrideWithValue(repository)]);
  addTearDown(container.dispose);
  // Keeps the page-scoped provider alive for the whole test, like the open screen does.
  container.listen(chatControllerProvider, (previous, next) {});
  return container;
}

void main() {
  group('ChatbotReplyModel', () {
    test('parses a full reply', () {
      final reply = ChatbotReplyModel.fromJson(const {
        'reply': 'Open Wallet.',
        'suggestHandoff': true,
        'suggestedCategory': 'WITHDRAWAL',
        'sources': [
          {'kind': 'FAQ', 'id': 'f1', 'title': 'How do I withdraw?'},
        ],
      });

      expect(reply.reply, 'Open Wallet.');
      expect(reply.suggestHandoff, isTrue);
      expect(reply.suggestedCategory, 'WITHDRAWAL');
      expect(reply.sources.single.title, 'How do I withdraw?');
    });

    test('a nearly empty reply still parses using the fallbacks', () {
      final reply = ChatbotReplyModel.fromJson(const <String, dynamic>{});

      expect(reply.reply, '');
      expect(reply.suggestHandoff, isFalse);
      expect(reply.suggestedCategory, 'GENERAL');
      expect(reply.sources, isEmpty);
    });

    test('null values fall back instead of throwing', () {
      final reply = ChatbotReplyModel.fromJson(const {'reply': null, 'suggestHandoff': null, 'sources': null});

      expect(reply.reply, '');
      expect(reply.suggestHandoff, isFalse);
      expect(reply.sources, isEmpty);
    });
  });

  group('ChatController', () {
    test('starts with the assistant greeting and no user message', () {
      final container = _container(_FakeSupportRepository());
      final chat = container.read(chatControllerProvider);

      expect(chat.messages, hasLength(1));
      expect(chat.messages.single.role, ChatRole.bot);
      expect(chat.hasUserMessage, isFalse);
    });

    test('adds the question and the answer, with where the answer came from', () async {
      final repository = _FakeSupportRepository()
        ..askResult = const Result.success(
          ChatbotReplyModel(
            reply: 'Open Wallet.',
            suggestedCategory: 'WITHDRAWAL',
            sources: [ChatSourceModel(kind: 'FAQ', id: 'f1', title: 'How do I withdraw?')],
          ),
        );
      final container = _container(repository);

      await container.read(chatControllerProvider.notifier).send('  How do I withdraw?  ');

      final chat = container.read(chatControllerProvider);
      expect(repository.questions, ['How do I withdraw?']);
      expect(chat.messages.map((m) => m.role), [ChatRole.bot, ChatRole.user, ChatRole.bot]);
      expect(chat.messages.last.sourceTitles, ['How do I withdraw?']);
      expect(chat.suggestedCategory, 'WITHDRAWAL');
      expect(chat.isReplying, isFalse);
      expect(chat.handoffSuggested, isFalse);
    });

    test('suggests a person when the assistant is unsure', () async {
      final repository = _FakeSupportRepository()
        ..askResult = const Result.success(ChatbotReplyModel(reply: 'Not sure.', suggestHandoff: true));
      final container = _container(repository);

      await container.read(chatControllerProvider.notifier).send('something odd');

      expect(container.read(chatControllerProvider).handoffSuggested, isTrue);
    });

    test('shows an error line and suggests a person when the request fails', () async {
      final repository = _FakeSupportRepository()..askResult = const Result.failure(NetworkFailure());
      final container = _container(repository);

      await container.read(chatControllerProvider.notifier).send('hello there');

      final chat = container.read(chatControllerProvider);
      expect(chat.messages.last.isError, isTrue);
      expect(chat.handoffSuggested, isTrue);
      expect(chat.isReplying, isFalse);
    });

    test('ignores an empty question', () async {
      final repository = _FakeSupportRepository();
      final container = _container(repository);

      await container.read(chatControllerProvider.notifier).send('   ');

      expect(repository.questions, isEmpty);
      expect(container.read(chatControllerProvider).messages, hasLength(1));
    });

    test('ignores a second question while an answer is still on its way', () async {
      final repository = _FakeSupportRepository();
      final container = _container(repository);
      final notifier = container.read(chatControllerProvider.notifier);

      final first = notifier.send('first');
      await notifier.send('second');
      await first;

      expect(repository.questions, ['first']);
    });

    test('does not hand over before the person has said anything', () async {
      final repository = _FakeSupportRepository();
      final container = _container(repository);

      await container.read(chatControllerProvider.notifier).handOff();

      expect(repository.lastTranscript, isNull);
      expect(container.read(chatControllerProvider).ticketId, isNull);
    });

    test('hands the conversation over and keeps the ticket id and the suggested category', () async {
      final repository = _FakeSupportRepository()
        ..askResult = const Result.success(ChatbotReplyModel(reply: 'Open Wallet.', suggestedCategory: 'WITHDRAWAL'));
      final container = _container(repository);
      final notifier = container.read(chatControllerProvider.notifier);
      await notifier.send('How do I withdraw?');
      final before = container.read(supportRefreshProvider);

      await notifier.handOff();

      final chat = container.read(chatControllerProvider);
      expect(chat.ticketId, 'ticket-1');
      expect(chat.isHandingOff, isFalse);
      expect(repository.lastCategory, 'WITHDRAWAL');
      expect(repository.lastTranscript!.map((m) => m.role), [ChatRole.bot, ChatRole.user, ChatRole.bot]);
      expect(container.read(supportRefreshProvider), before + 1, reason: 'the tickets list must refetch');
    });

    test('keeps the chat and shows the error when handing over fails', () async {
      final repository = _FakeSupportRepository()..handOffResult = const Result.failure(NetworkFailure());
      final container = _container(repository);
      final notifier = container.read(chatControllerProvider.notifier);
      await notifier.send('help me');

      await notifier.handOff();

      final chat = container.read(chatControllerProvider);
      expect(chat.ticketId, isNull);
      expect(chat.handoffError, 'No internet connection. Please try again.');
      expect(chat.isHandingOff, isFalse);
    });

    test('sends at most the last 20 lines, each cut to 1000 characters', () async {
      final repository = _FakeSupportRepository()
        ..askResult = Result.success(ChatbotReplyModel(reply: 'x' * 1500));
      final container = _container(repository);
      final notifier = container.read(chatControllerProvider.notifier);
      for (var i = 0; i < 12; i++) {
        await notifier.send('question $i');
      }

      await notifier.handOff();

      final transcript = repository.lastTranscript!;
      expect(transcript, hasLength(20));
      expect(transcript.every((line) => line.text.length <= 1000), isTrue);
      expect(transcript.last.role, ChatRole.bot);
    });
  });

  group('SupportChatScreen', () {
    Widget app(_FakeSupportRepository repository) {
      final router = GoRouter(
        routes: [
          GoRoute(path: '/', builder: (context, state) => const SupportChatScreen()),
          // Like the app router, the literal "new" route goes before the `:ticketId` route.
          GoRoute(path: RoutePaths.newSupportTicket, builder: (context, state) => const Scaffold(body: Text('new ticket page'))),
          GoRoute(
            path: RoutePaths.supportTicketDetail,
            builder: (context, state) => const Scaffold(body: Text('ticket page')),
          ),
        ],
      );
      return ProviderScope(
        overrides: [supportRepositoryProvider.overrideWithValue(repository)],
        child: MaterialApp.router(routerConfig: router),
      );
    }

    testWidgets('shows the greeting and answers a question', (tester) async {
      await tester.pumpWidget(app(_FakeSupportRepository()));
      await tester.pumpAndSettle();
      expect(find.textContaining('I can answer questions'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'How do I withdraw?');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      expect(find.text('How do I withdraw?'), findsOneWidget);
      expect(find.text('Open Wallet and tap Withdraw.'), findsOneWidget);
    });

    testWidgets('shows "Talk to a person" prominently when the assistant is unsure, and opens the ticket', (tester) async {
      final repository = _FakeSupportRepository()
        ..askResult = const Result.success(ChatbotReplyModel(reply: 'Not sure.', suggestHandoff: true));
      await tester.pumpWidget(app(repository));
      await tester.pumpAndSettle();
      expect(find.textContaining('Not what you needed?'), findsNothing);

      await tester.enterText(find.byType(TextField), 'something odd');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      expect(find.textContaining('Not what you needed?'), findsOneWidget);

      await tester.tap(find.widgetWithText(OutlinedButton, 'Talk to a person'));
      await tester.pumpAndSettle();

      expect(find.text('ticket page'), findsOneWidget);
    });

    testWidgets('opens the normal ticket form when asking for a person before saying anything', (tester) async {
      await tester.pumpWidget(app(_FakeSupportRepository()));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(TextButton, 'Talk to a person'));
      await tester.pumpAndSettle();

      expect(find.text('new ticket page'), findsOneWidget);
    });

    testWidgets('does not send an empty question', (tester) async {
      final repository = _FakeSupportRepository();
      await tester.pumpWidget(app(repository));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pumpAndSettle();

      expect(repository.questions, isEmpty);
    });
  });
}
