import 'package:freezed_annotation/freezed_annotation.dart';

part 'wallet_summary_model.freezed.dart';
part 'wallet_summary_model.g.dart';

/// Mirrors `GET /wallet`'s raw `UserWallet` row. Just the balance fields
/// needed for the dashboard card — transaction history and withdrawals are
/// built out with the rest of the Wallet feature in the next part.
@freezed
abstract class WalletSummaryModel with _$WalletSummaryModel {
  const factory WalletSummaryModel({
    required String id,
    required String availableBalance,
    required String pendingBalance,
    required String lockedBalance,
    required String lifetimeEarnings,
  }) = _WalletSummaryModel;

  factory WalletSummaryModel.fromJson(Map<String, dynamic> json) => _$WalletSummaryModelFromJson(json);
}

extension WalletSummaryModelX on WalletSummaryModel {
  double get availableBalanceValue => double.tryParse(availableBalance) ?? 0;
  double get pendingBalanceValue => double.tryParse(pendingBalance) ?? 0;
  double get lifetimeEarningsValue => double.tryParse(lifetimeEarnings) ?? 0;
}
