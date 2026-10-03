import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/policy_documents.dart';

/// "[prefix] Terms & Conditions, Privacy Policy and Reward Policy", each title opening that document.
class PolicyLinks extends StatelessWidget {
  const PolicyLinks({super.key, required this.prefix});

  final String prefix;

  @override
  Widget build(BuildContext context) {
    const textStyle = TextStyle(fontSize: 13.5, color: AppColors.slate600, height: 1.5);
    final linkStyle = textStyle.copyWith(
      color: AppColors.orange700,
      fontWeight: FontWeight.w600,
      decoration: TextDecoration.underline,
    );

    // One sentence, so it wraps like text. Each title is an inline tap target that opens that document.
    final spans = <InlineSpan>[TextSpan(text: '$prefix ')];
    for (var i = 0; i < kPolicyDocuments.length; i++) {
      final document = kPolicyDocuments[i];
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => context.push(RoutePaths.policyDocumentPath(document.slug)),
            child: Text(document.title, style: linkStyle),
          ),
        ),
      );
      if (i < kPolicyDocuments.length - 2) spans.add(const TextSpan(text: ', '));
      if (i == kPolicyDocuments.length - 2) spans.add(const TextSpan(text: ' and '));
    }
    spans.add(const TextSpan(text: '.'));
    return Text.rich(TextSpan(style: textStyle, children: spans));
  }
}
