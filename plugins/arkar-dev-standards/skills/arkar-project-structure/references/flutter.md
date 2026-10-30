# Flutter standard template

Use this for every new Flutter app. The layout follows Flutter's official
app-architecture guide (data code grouped by type, UI code grouped by feature)
using the stack of the TTMY apps: Riverpod 3, go_router, Dio. It fixes the
drift between past projects: models in their own files, screens only under
`screens/`, repositories obtained through providers, one spelling per feature.

## Contents
1. Folder tree
2. What goes where (with skeletons)
3. Naming rules
4. Adding a new feature — checklist
5. Defaults and when to change them

## 1. Folder tree

```
project_name/                       # snake_case (Dart package name)
├── lib/
│   ├── main.dart                   # runApp(ProviderScope(child: App()))
│   ├── app.dart                    # MaterialApp.router: theme, router, l10n
│   ├── core/                       # app-wide plumbing, no feature logic
│   │   ├── config/
│   │   │   └── app_config.dart     # values from --dart-define-from-file
│   │   ├── network/
│   │   │   ├── api_client.dart     # Dio setup, interceptors, auth header
│   │   │   └── api_exception.dart
│   │   ├── router/
│   │   │   └── app_router.dart     # all GoRoutes in one place + auth redirect
│   │   ├── services/               # device/platform: secure storage, notifications
│   │   ├── theme/
│   │   │   └── app_theme.dart
│   │   └── utils/
│   ├── models/                     # immutable freezed models, one per file
│   │   └── leave_request.dart      # (+ generated .freezed.dart / .g.dart)
│   ├── repositories/               # one per backend resource; all API/Firestore calls
│   │   ├── repository_providers.dart
│   │   └── leave_request_repository.dart
│   ├── screens/                    # UI, one folder per feature
│   │   └── leave_requests/
│   │       ├── leave_request_list_screen.dart
│   │       ├── leave_request_list_notifier.dart    # the screen's state (view model)
│   │       ├── leave_request_detail_screen.dart
│   │       └── widgets/            # widgets used only by this feature
│   │           └── leave_status_chip.dart
│   ├── providers/                  # app-wide state only: auth, locale, connectivity
│   ├── widgets/                    # widgets shared by several features
│   └── l10n/                       # .arb files
├── assets/
│   ├── images/
│   └── icons/
├── env/                            # dev.json, prod.json for --dart-define-from-file (no secrets)
├── test/
│   ├── fakes/                      # fake repositories for tests
│   ├── repositories/
│   └── screens/                    # notifier + widget tests, mirrors lib/screens
├── analysis_options.yaml           # flutter_lints + riverpod_lint
├── l10n.yaml
├── pubspec.yaml
└── README.md
```

Run: `flutter run --dart-define-from-file=env/dev.json`.

## 2. What goes where

### Data flow

`screen → notifier → repository → ApiClient / Firestore`. Screens never call
Dio or Firestore directly; repositories never touch widgets or
`BuildContext`.

### models/ — immutable, generated serialisation

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'leave_request.freezed.dart';
part 'leave_request.g.dart';

@freezed
abstract class LeaveRequest with _$LeaveRequest {
  @JsonSerializable(fieldRename: FieldRename.snake)
  const factory LeaveRequest({
    required int id,
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required LeaveStatus status,
  }) = _LeaveRequest;

  factory LeaveRequest.fromJson(Map<String, dynamic> json) =>
      _$LeaveRequestFromJson(json);
}
```

Generated code: `dart run build_runner watch -d` while developing. One model
per file, file named after the class. Freezed gives `==`, `copyWith` and safe
JSON mapping, so no hand-written `fromJson`.

### repositories/

```dart
class LeaveRequestRepository {
  LeaveRequestRepository(this._api);

  final ApiClient _api;

  Future<List<LeaveRequest>> getLeaveRequests() async {
    try {
      final response = await _api.dio.get('/leave-requests');
      final items = response.data['data'] as List;
      return items
          .map((item) => LeaveRequest.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (error) {
      throw ApiException.fromDioError(error);
    }
  }
}
```

Agree the response shape with the backend (e.g. Laravel API resources always
wrap in `data`) instead of guessing several shapes in each method.

Register every repository once in `repositories/repository_providers.dart`:

```dart
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final leaveRequestRepositoryProvider = Provider<LeaveRequestRepository>(
  (ref) => LeaveRequestRepository(ref.watch(apiClientProvider)),
);
```

### screens/<feature>/ — screen + notifier

The notifier holds one screen's state and lives next to the screen.

```dart
class LeaveRequestListNotifier extends AsyncNotifier<List<LeaveRequest>> {
  @override
  Future<List<LeaveRequest>> build() {
    return ref.watch(leaveRequestRepositoryProvider).getLeaveRequests();
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

final leaveRequestListProvider =
    AsyncNotifierProvider<LeaveRequestListNotifier, List<LeaveRequest>>(
  LeaveRequestListNotifier.new,
);
```

Riverpod rules:

- `ref.watch` in provider bodies and `build()`; `ref.read` only inside methods
  that run once (button handlers, `refresh()`).
- After every `await` in a notifier method, check `ref.mounted` before
  touching `state`.
- Don't swallow errors with `catch (_) { return null; }` — let `AsyncValue`
  carry the error so the screen can show it. Riverpod 3 retries failed
  providers automatically; configure `ProviderScope(retry: ...)` so client
  errors (4xx `ApiException`) are not retried.
- No `StateProvider` / `StateNotifierProvider` (legacy in Riverpod 3).
- For a save/submit action: a method on the notifier that sets a loading
  flag, awaits the repository, and reports success or the error back to the
  screen; the button shows a spinner while it runs.

The screen is a `ConsumerWidget` (or `ConsumerStatefulWidget` when it owns
controllers). It watches the notifier and renders
`AsyncValue.when(data:, loading:, error:)`. Split any build method longer than
~80 lines into widgets in the feature's `widgets/` folder. Screens live only
in `screens/`, never in `widgets/`.

### core/router/app_router.dart

All routes in one `GoRouter`, paths in kebab-case, a route name constant per
screen. The router is itself a provider; it redirects based on the auth
state and re-evaluates when the auth provider changes (`refreshListenable`
fed from the auth provider).

### core/services/ and storage

Auth tokens and anything secret: `flutter_secure_storage`. Plain preferences:
`SharedPreferencesAsync`. Both wrapped in a service in `core/services/`.

### core/theme/app_theme.dart

Build the colour scheme from the app's own palette:
`ColorScheme.fromSeed(seedColor: ...)`, then set `primary` explicitly when an
exact brand colour is required — `fromSeed` alone shifts it. Use the CBM red
`#AE1A28` only when AK asks for CBM branding or the app already uses it.

### Firebase-only apps: security rules are the authorisation

With no backend of your own, `firestore.rules` / `storage.rules` are the only
thing stopping one user from reading or changing another's data. Every
collection has rules that check `request.auth.uid` against the document's
owner (never `allow read, write: if true` or `if request.auth != null` alone),
rules are tested with the emulator (`@firebase/rules-unit-testing`), and App
Check is on. Change the rules whenever a feature changes a data path.

## 3. Naming rules

| Thing | Rule | Example |
|---|---|---|
| Package / project folder | snake_case | `leave_portal` |
| Files | snake_case, named after the main class | `leave_request_repository.dart` |
| Classes | PascalCase | `LeaveRequestRepository` |
| Screens | `<Thing><Purpose>Screen` | `LeaveRequestListScreen` |
| Notifiers | `<Thing><Purpose>Notifier`, next to the screen | `LeaveRequestListNotifier` |
| Providers | `<thing>Provider` | `leaveRequestListProvider` |
| Feature folders | plural snake_case, one spelling | `screens/leave_requests/` (never both `market_place` and `marketplace`) |
| Repositories | `<Resource>Repository` | `LeaveRequestRepository` |
| Variables, methods | lowerCamelCase | `startDate`, `getLeaveRequests()` |
| Constants | lowerCamelCase (Dart style) | `defaultPageSize` |
| Route paths | kebab-case | `/leave-requests/:id` |
| JSON keys | snake_case from the API, mapped by `FieldRename.snake` | `start_date` ↔ `startDate` |

## 4. Adding a new feature — checklist

1. Model(s) in `models/` (freezed), run build_runner.
2. Repository in `repositories/`; register it in `repository_providers.dart`.
3. Screen + notifier in `screens/<feature>/`, feature-only widgets in its `widgets/`.
4. Routes in `core/router/app_router.dart`.
5. Strings in `l10n/*.arb` (no hard-coded user-facing text when the app is localised).
6. Fake repository in `test/fakes/` (`class FakeLeaveRequestRepository implements LeaveRequestRepository`).
7. Tests: notifier with `ProviderContainer.test(overrides: [...])`, a widget test for the screen.
8. `dart format`, `flutter analyze` and `flutter test` all pass.

## 5. Defaults and when to change them

| Decision | Default | Change only when |
|---|---|---|
| State management | `flutter_riverpod` 3, hand-written `Notifier`/`AsyncNotifier` (no `@riverpod` codegen — fewer generated files for juniors) | Project already uses something else |
| Models | `freezed` + `json_serializable` | Never hand-write `fromJson` in new code |
| Navigation | `go_router` | Only with senior approval |
| HTTP | `dio` with one `ApiClient` | Firebase-only app → repositories wrap Firestore instead; development and tests use the Firebase Emulator Suite or a separate dev project, never the production project |
| Secrets / tokens | `flutter_secure_storage` | Never `shared_preferences` |
| Preferences | `SharedPreferencesAsync` via a service | Larger offline data → add a local DB |
| Config | `--dart-define-from-file=env/<env>.json` read in `app_config.dart` | Never hard-code base URLs |
| Lints | `flutter_lints` + `riverpod_lint` | Only with senior approval |
| Tests | `flutter_test`, fakes in `test/fakes/`, `mocktail` when a fake is impractical | — |
| Localisation | `flutter_localizations` + `intl` with `.arb` | Single-language internal app |
| Feature layout | screens by feature, data by type (this template) | Very large app (50+ screens) → discuss `features/<x>/` modules |
