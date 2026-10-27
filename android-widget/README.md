# 받을 서류 위젯 (안드로이드)

출결 앱에서 아직 받지 않은 서류를 휴대폰 홈 화면 위젯으로 보여줍니다.

```
받을 서류 3                        9:40 확인  ⟳
──────────────────────────────────────────
7. 이바다   체험학습 신청서
11/2(월) 체험학습 · 기한 10/29          ← 기한 지나면 빨갛게, 맨 위로
3. 김하늘   결석계
10/20(화) 질병결석
```

- 목록이나 제목을 누르면 출결 앱(웹)이 열립니다. 서류를 '받음'으로 바꾸는 것은 출결 앱에서 합니다.
- 1시간마다 새로 받고, ⟳ 를 누르면 바로 받습니다. 출결 앱에서 '받음'을 누른 뒤 위젯에 반영되기까지 최대 1시간 걸릴 수 있습니다.
- 출결 앱의 **휴대폰 ↔ PC 동기화**를 켜 둔 경우에만 동작합니다. 출결 앱이 동기화할 때 받을 서류 요약을
  같은 잠금 비밀번호로 잠가 동기화 저장소의 `sync/pending.json` 에 함께 올리고, 위젯은 그것을 받아 풉니다.

## 설치

1. 휴대폰에서 이 저장소의 **Releases → 받을 서류 위젯** 에서 `attendance-widget.apk` 를 받습니다.
2. 열어서 설치합니다. 처음이면 '출처를 알 수 없는 앱' 설치를 브라우저에 허용해야 합니다.
   (구글 플레이에 올린 앱이 아니라서 Play 프로텍트 경고가 나올 수 있습니다.)
3. **읽기 전용 토큰을 새로 만듭니다** — 출결 앱에 넣은 토큰을 같이 써도 되지만, 위젯 앱에는 읽기만 주는 게 안전합니다.
   깃허브 → Settings → Developer settings → Fine-grained tokens → Generate new token
   - Repository access: 동기화 저장소 하나만 (예: `YeoBBun/school-attendance-sync`)
   - Permissions → Contents: **Read-only**
4. '받을 서류' 앱을 열어 동기화 저장소, 방금 만든 토큰, 출결 앱과 같은 잠금 비밀번호를 넣고 **저장하고 불러오기**.
5. 홈 화면을 길게 눌러 위젯 → **받을 서류** 를 끌어다 놓습니다.

> 처음에는 "아직 받을 서류 요약이 없어요" 가 나올 수 있습니다. 이 기능이 들어간 출결 앱을 휴대폰이나 PC 에서
> 한 번 열면(동기화되면) 요약이 올라갑니다.

## 새 버전으로 바꿀 때

저장소 Secrets 에 서명 키를 넣어 두지 않았다면, 빌드할 때마다 서명 키가 달라서 **덮어 설치가 안 됩니다**.
위젯 앱을 지우고 새로 설치한 뒤 연결 정보를 다시 넣으세요.

덮어 설치되게 하려면 (한 번만):

```bash
keytool -genkeypair -keystore release.keystore -alias widget -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore   # 이 출력을 복사
```

저장소 Settings → Secrets and variables → Actions 에 `WIDGET_KEYSTORE_B64`(위 출력), `WIDGET_KEYSTORE_PASSWORD`(키 비밀번호, 키와 저장소 비밀번호를 같게)를 넣고
Actions → Android widget → Run workflow. 키 파일은 잃어버리지 않게 따로 보관합니다.

## 보안

- 위젯 앱은 토큰·잠금 비밀번호와 풀어 둔 받을 서류 목록을 이 앱 안 저장 공간에만 둡니다(다른 앱은 못 읽음).
  다만 휴대폰 잠금이 풀린 상태라면 홈 화면에 학생 이름과 서류가 보이니, 휴대폰 화면 잠금은 꼭 걸어 두세요.
- 동기화 저장소에 올라가는 요약도 출결 데이터와 같은 방식으로 잠가서 올라갑니다.

## 개발

Android Studio 로 이 폴더(`android-widget/`)를 엽니다. `./gradlew testDebugUnitTest assembleRelease`.
`app/src/test/resources/pending-fixture.json` 은 출결 앱의 `encrypt()` 로 '시험용 비밀번호' 를 써서 잠근 것으로,
출결 앱과 위젯의 잠금 방식이 맞는지 확인합니다.
