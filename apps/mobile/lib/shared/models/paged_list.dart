import 'api_response.dart';

/// A list loaded a page at a time: the pages fetched so far, how many items there are in all, and whether the next page
/// is on its way. Any screen that scrolls into more results keeps one of these in its notifier.
class PagedList<T> {
  const PagedList({
    required this.items,
    required this.total,
    required this.page,
    this.loadingMore = false,
    this.loadMoreMessage,
  });

  /// The first page, as the server sent it.
  factory PagedList.first(PaginatedResponse<T> page) => PagedList(items: page.items, total: page.total, page: 1);

  final List<T> items;
  final int total;
  final int page;
  final bool loadingMore;

  /// Why the last "load more" failed. What is already shown is kept.
  final String? loadMoreMessage;

  bool get hasMore => items.length < total;

  PagedList<T> copyWith({
    List<T>? items,
    int? total,
    int? page,
    bool? loadingMore,
    String? loadMoreMessage,
    bool clearMessage = false,
  }) {
    return PagedList(
      items: items ?? this.items,
      total: total ?? this.total,
      page: page ?? this.page,
      loadingMore: loadingMore ?? this.loadingMore,
      loadMoreMessage: clearMessage ? null : (loadMoreMessage ?? this.loadMoreMessage),
    );
  }

  /// Adds the next page below what is shown. An item already in the list is skipped: when something new is added on
  /// the server between two pages, everything shifts down by one and the last item of a page comes back on the next.
  PagedList<T> append(PaginatedResponse<T> next, {required String Function(T item) idOf}) {
    final known = {for (final item in items) idOf(item)};
    final merged = [
      ...items,
      for (final item in next.items)
        if (known.add(idOf(item))) item,
    ];
    // An empty page means the end, whatever the count says (items removed on the server since the first page);
    // otherwise the list would keep asking for pages that are not there.
    return PagedList(items: merged, total: next.items.isEmpty ? merged.length : next.total, page: page + 1);
  }
}
