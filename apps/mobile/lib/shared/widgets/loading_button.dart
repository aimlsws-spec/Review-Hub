import 'package:flutter/material.dart';

/// A primary button that swaps its label for a spinner while [isLoading],
/// and disables itself during that time and whenever [onPressed] is null —
/// the same disabled/pending pattern used by every submit button in both
/// web portals.
class LoadingButton extends StatelessWidget {
  const LoadingButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation(
                outlined ? Theme.of(context).colorScheme.primary : Colors.white,
              ),
            ),
          )
        : Text(label);

    final handler = isLoading ? null : onPressed;

    return outlined
        ? OutlinedButton(onPressed: handler, child: child)
        : ElevatedButton(onPressed: handler, child: child);
  }
}
