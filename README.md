# 사이버 러너 (Cyber Runner)

바이러스를 피해 3개 레인을 달리며 데이터 조각을 모으는 웹 러너 게임입니다.  
HTML, CSS, Canvas, JavaScript만으로 동작하며 별도 빌드가 필요 없습니다.

![사이버 러너](assets/sprites/bbia/run/00.png)

## 플레이 방법

캐릭터를 고르면 바로 달립니다. 목숨이 모두 떨어지면 게임 오버입니다.

| 조작 | 키보드 | 모바일 |
| --- | --- | --- |
| 레인 이동 | `←` `→` 또는 `A` `D` | 화면 왼쪽 / 오른쪽 탭 |
| 점프 | `↑` 또는 `Space` | 화면 위쪽 탭 |
| 음소거 | 우측 상단 🔊 버튼 | 동일 |

## 게임 규칙

- **목표:** 바이러스를 피하고 최대한 멀리 달려 점수를 쌓습니다.
- **캐릭터:** 삐아(AI 병아리), 오르(AI 곰)
- **목숨:** 시작 시 5개. 백신으로 회복할 수 있지만 최대 5개를 넘지 않습니다.
- **바이러스:** 부딪히면 목숨 1이 줄고, 잠시 무적 상태가 됩니다.
- **백신:** 획득하면 목숨을 1 회복합니다.
- **데이터 조각:** 획득하면 점수가 올라갑니다.
- **난이도:** 달린 거리가 늘어날수록 속도가 점진적으로 빨라집니다.

## 실행 방법

브라우저에서 `index.html`을 직접 열어도 되지만, 스프라이트 목록을 불러오기 위해 로컬 서버로 여는 것을 권장합니다.

```bash
# Python이 있는 경우
python -m http.server 8080
```

브라우저에서 [http://localhost:8080](http://localhost:8080) 으로 접속하세요.

VS Code / Cursor의 Live Preview, Live Server 확장으로 열어도 됩니다.

## 프로젝트 구조

```
├── index.html          # 선택 / 플레이 / 게임오버 화면
├── css/style.css       # 레이아웃과 UI 스타일
├── js/game.js          # 레인 러너 로직, 충돌, 렌더링
├── js/audio.js         # BGM / 효과음 / 음소거
├── assets/sprites/     # 캐릭터 스프라이트
├── assets/audio/       # 게임에서 쓰는 BGM·효과음
└── 기획안.md           # 게임 기획 메모
```

## 사운드 크레딧

효과음과 일부 BGM은 [Kenney.nl](https://kenney.nl) 에셋(CC0 1.0)을 사용합니다.

- [Interface Sounds](https://kenney.nl/assets/interface-sounds)
- [Music Jingles](https://kenney.nl/assets/music-jingles)
- [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds)

파일 매핑은 `assets/audio/CREDITS.txt`를 참고하세요.
