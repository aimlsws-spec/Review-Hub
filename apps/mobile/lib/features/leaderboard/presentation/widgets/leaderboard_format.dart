import 'package:intl/intl.dart';

/// Rupees the way people here write them: ₹1,23,456, with paise only when there are some.
String formatRupees(double amount) {
  final whole = amount == amount.roundToDouble();
  return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: whole ? 0 : 2).format(amount);
}
