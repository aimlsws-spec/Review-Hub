import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:viral_kar/core/router/route_paths.dart';

/// A router with [screen] pushed over a placeholder root, so a screen under test can `context.pop()` back to "Root"
/// or `context.go()` to home or sign-in, and a test can check where it ended up.
GoRouter routerFor(Widget screen) => GoRouter(
  initialLocation: '/screen',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const Scaffold(body: Text('Root')),
      routes: [GoRoute(path: 'screen', builder: (context, state) => screen)],
    ),
    GoRoute(
      path: RoutePaths.home,
      builder: (context, state) => const Scaffold(body: Text('Home')),
    ),
    GoRoute(
      path: RoutePaths.login,
      builder: (context, state) => const Scaffold(body: Text('Login')),
    ),
    GoRoute(
      path: RoutePaths.policyDocument,
      builder: (context, state) => Scaffold(body: Text('Policy ${state.pathParameters['slug']}')),
    ),
  ],
);
