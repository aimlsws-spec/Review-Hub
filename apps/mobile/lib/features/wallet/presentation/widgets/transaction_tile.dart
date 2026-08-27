import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/wallet_transaction_model.dart';

class TransactionTile extends StatelessWidget {
  const TransactionTile({super.key, required this.transaction});

  final WalletTransactionModel transaction;

  @override
  Widget build(BuildContext context) {
    final isCredit = transaction.isCredit;
    return Card(
      margin: const EdgeInsets.only(top: 8),
      child: ListTile(
        leading: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: isCredit ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
            shape: BoxShape.circle,
          ),
          child: Icon(
            isCredit ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
            size: 18,
            color: isCredit ? AppColors.success : AppColors.danger,
          ),
        ),
        title: Text(
          transaction.remarks ?? transaction.referenceType ?? transaction.type,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          DateFormat('d MMM, h:mm a').format(transaction.createdAt),
          style: const TextStyle(fontSize: 11.5, color: AppColors.slate400),
        ),
        trailing: Text(
          '${isCredit ? '+' : '-'}₹${transaction.amountValue.toStringAsFixed(0)}',
          style: TextStyle(fontWeight: FontWeight.w700, color: isCredit ? AppColors.success : AppColors.danger),
        ),
      ),
    );
  }
}
