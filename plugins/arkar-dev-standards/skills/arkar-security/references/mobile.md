# Mobile security checklist — Flutter (and React Native)

A mobile app is a front end someone else holds in their hand: anything
inside the app package can be read. The server or Firebase rules enforce
everything (`backend.md`).

## Contents
1. Secrets and configuration
2. Tokens and storage
3. Firebase
4. Network
5. Screens and data on the device
6. Release builds

## 1. Secrets and configuration

- No API secrets, service-account keys or admin credentials in the app or
  its `--dart-define` files — anything shipped can be extracted. Public
  identifiers (a Firebase web API key, a Maps key restricted by app ID) are
  fine.
- Calls that need a secret go through your backend or a Cloud Function.

## 2. Tokens and storage

- Tokens and session data: `flutter_secure_storage` (Keychain / Keystore) —
  never `SharedPreferences` or plain files.
- Personal data cached on the device only when the feature needs it offline;
  cleared on sign-out.
- No sensitive values in logs (`print`, `debugPrint`) or crash reports.

## 3. Firebase

- Firestore and Storage security rules are the authorisation: each rule
  checks `request.auth.uid` against the owner or role, default deny, tested
  with the emulator (`backend.md` §5).
- App Check on for Firestore, Storage, Functions.
- Cloud Functions validate input and check the caller like any API.

## 4. Network

- HTTPS only (no cleartext traffic on Android; ATS on iOS).
- Never disable certificate checks (`badCertificateCallback` returning
  true) outside a local debug build.
- Deep links and app links: validate parameters like any input; never let a
  link perform an action without the user confirming.

## 5. Screens and data on the device

- Sign-in, reset and lockout wording as in `frontend.md` §4.
- Screens showing sensitive data (NRIC, salary, payslips): consider hiding
  content in the app switcher; mask by default where the full value isn't
  needed.
- Copy to clipboard of sensitive values only on purpose.

## 6. Release builds

- `flutter build --obfuscate --split-debug-info=<folder>` for release; keep
  the symbols privately for crash reports.
- Debug banners, test menus and mock data switches off in release
  (`kReleaseMode`).
- `flutter pub outdated` and advisories for the packages used (`scanners.md`).
