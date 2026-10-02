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
    final children = <Widget>[Text('$prefix ', style: textStyle)];
    for (var i = 0; i < kPolicyDocuments.length; i++) {
      final document = kPolicyDocuments[i];
      children.add(
        InkWell(
          onTap: () => context.push(RoutePaths.policyDocumentPath(document.slug)),
          child: Text(
            document.title,
            style: textStyle.copyWith(
              color: AppColors.orange700,
              fontWeight: FontWeight.w600,
              decoration: TextDecoration.underline,
            ),
          ),
        ),
      );
      if (i < kPolicyDocuments.length - 2) children.add(const Text(', ', style: textStyle));
      if (i == kPolicyDocuments.length - 2) children.add(const Text(' and ', style: textStyle));
    }
    return Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: children);
  }
}
