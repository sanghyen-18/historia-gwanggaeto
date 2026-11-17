# 히스토리아 · 광개토대왕 스크롤 영상 홈

정적 사이트(빌드 없음, 외부 JS 라이브러리 없음). GitHub Pages에 이 폴더를 그대로 올리면 됩니다.

## 로컬에서 보기
```
cd ~/Desktop/design_handoff_home
python3 -m http.server 8080
```
브라우저에서 http://localhost:8080 — `file://`로 열면 영상 Blob 로딩이 막혀 탐색이 덜 부드럽습니다.

## 고칠 곳
| 바꾸고 싶은 것 | 위치 |
|---|---|
| 자막·섹션·카드 문구, 자막 타이밍 | `content.js` (한 곳에 모음) |
| 스크롤 길이(영상 속도) | `style.css` → `--hero-length` |
| 따라가는 부드러움 | `main.js` → `EASE` |
| 영상 파일 경로 | `main.js` → `SOURCES` |

## 파일
- `assets/hero-720.mp4` 1280×720, 4 Mbps, 무음, 모든 프레임 키프레임 (9.6MB) — 기본
- `assets/hero-480.mp4` 854×480, 1.5 Mbps (3.6MB) — 데이터 절약 모드·2G/3G 회선
- `assets/hero-poster.jpg` 첫 프레임 — 로딩 배경 + 모션 줄이기 사용자용 정지 이미지
- `assets/thumb-*.jpg` 카드 썸네일(1200px). 원본 `thumb-*.png`(약 25MB)는 사이트에서 쓰지 않으니 저장소에 올리지 않아도 됩니다.

## 영상 다시 만들기
ffmpeg 없이 macOS 기본 기능(AVFoundation)으로 처리했습니다:
```
swift tools/videotool.swift analyze 원본.mp4          # 이음새 색감/밝기 점검
swift tools/videotool.swift encode  원본.mp4 assets/hero-720.mp4 1280 4000
swift tools/videotool.swift encode  원본.mp4 assets/hero-480.mp4 854 1500
swift tools/videotool.swift poster  원본.mp4 assets/hero-poster.jpg 0
```
ffmpeg가 있다면 같은 결과:
```
ffmpeg -i 원본.mp4 -an -c:v libx264 -g 1 -crf 24 -pix_fmt yuv420p -movflags +faststart assets/hero-720.mp4
ffmpeg -i 원본.mp4 -an -c:v libx264 -g 1 -crf 28 -pix_fmt yuv420p -vf scale=854:-2 -movflags +faststart assets/hero-480.mp4
```

---

# (원본) 디자인 핸드오프 노트

# Handoff: 히스토리아 홈 (스크롤 영상 히어로)

## Overview
히스토리아 서비스의 첫 화면. 스크롤하면 영상이 프레임 단위로 재생되어 "광개토대왕 얼굴 클로즈업 → 카메라 좌측 회전 → 기마 군대 질주"가 영화처럼 이어지고, 끝에 시작 버튼과 메뉴 카드 5개가 나옵니다.

## About the Design Files
이 폴더의 `index.html` / `style.css` / `main.js` 는 **바로 열어 볼 수 있는 순수 HTML·CSS·JS** 입니다. 빌드 도구 없이 그대로 쓰거나, 기존 프로젝트(React, Next.js 등)가 있다면 그 환경의 패턴으로 옮겨 구현하세요.

## Fidelity
High-fidelity. 색·폰트·간격은 최종값입니다. 자막 문구는 임시 문구라 교체 가능합니다.

## 빠른 시작
1. 영상을 `assets/home-hero.mp4` 로 저장 (16:9, 1920px 이상, 무음)
2. 스크롤 재생이 끊기지 않도록 모든 프레임을 키프레임으로 인코딩:
   ```
   ffmpeg -i 원본.mp4 -an -c:v libx264 -g 1 -crf 22 -pix_fmt yuv420p -vf scale=1920:-2 assets/home-hero.mp4
   ```
   용량이 크면 `-crf 26` 또는 `scale=1600:-2`.
3. 로컬 서버로 열기: `npx serve .` (file:// 로 열면 영상 탐색이 막히는 브라우저가 있음)

## 자주 고칠 곳
| 바꾸고 싶은 것 | 위치 |
|---|---|
| 스크롤 길이(영상 속도) | `style.css` → `--hero-length` (기본 500vh) |
| 자막 문구 | `index.html` → `.caption` 안의 텍스트 |
| 자막 등장 타이밍 | `index.html` → 각 `.caption` 의 `data-in` / `data-out` (0~1) |
| 따라가는 부드러움 | `main.js` → `EASE` |
| 메뉴 카드 링크·썸네일 | `index.html` → `.card` 의 `href`, `background-image` |
| 색 | `style.css` → `:root` 변수 |

자막 타이밍 맞추는 법: 영상에서 장면이 바뀌는 시각(초) ÷ 영상 전체 길이 = `data-in` 값.

## Screens / Layout
**Header** — fixed, 높이 72px, 배경 rgba(255,255,255,.9) + blur 12px, 좌우 패딩 clamp(20px,3vw,48px). 로고 높이 34px. 메뉴 5개(17px/500, #6B7684, hover 시 #F2F4F6 배경). 우측 로그인 버튼(44px, radius 12, #191F28).

**Hero** — `section.hero` 높이 `--hero-length`, 안쪽 `.stage` 는 `position: sticky; top:0; height:100vh`. 영상 `object-fit: cover`. 위아래 어둡게 그라데이션.
- 자막 1 (0.02–0.26): 좌하단, 노란 eyebrow "391년 · 고구려" + 제목 "열여덟 살의 왕이 / 즉위하다"
- 자막 2 (0.34–0.60): 우상단 오른쪽 정렬, "광개토대왕" + "고구려의 땅을 / 넓히러 달려가다"
- 자막 3 (0.80–끝): 하단 가운데, "이제, 그대의 차례다" + 흰 pill 버튼 "시간 여행 시작하기 →" (68px)
- 스크롤 힌트 (0–0.05), 하단 4px 진행 막대
- 제목 clamp(36px,4.4vw,76px)/800, letter-spacing -0.045em. 자막 전환 opacity+translateY 24px, 0.3s

**Menus** — max-width 1440px, 제목 "어디로 떠나 볼까요?" clamp(32px,3.4vw,52px)/800. 카드 grid `repeat(auto-fit,minmax(260px,1fr))`, gap 20, radius 28, 배경 #F9FAFB, 썸네일 16:10, hover 시 위로 4px.

**Footer** — 상단 1px #F2F4F6, 로고 26px, "© 2026 Historia".

## Interactions & Behavior
- 스크롤 진행도 p = -hero.top / (hero.height - viewport) 를 0~1로 제한
- 매 프레임 current += (p - current) × EASE 로 부드럽게 따라가며 `video.currentTime = current × duration`
- `--p` CSS 변수로 진행 막대 폭 갱신
- 영상 로드 실패 시 자리표시 화면 표시
- 860px 이하에서 상단 메뉴 숨김

## Design Tokens
- Ink #191F28 · #4E5968 · #6B7684 · #8B95A1
- Surface #FFFFFF · #F9FAFB · #F2F4F6
- Accent #FFC342
- 나라색(다른 화면 공통) 고구려 #F04452 · 백제 #3182F6 · 신라 #FFC342 · 가야 #03B26C · 통일전쟁 #8B5CF6
- Radius 12 (버튼) · 28 (카드) · 999 (pill)
- Font Pretendard (CDN)

## Assets
- `assets/logo.png` — 히스토리아 로고
- `assets/thumb-*.png` — 각 화면 캡처 (메뉴 카드 썸네일)
- `assets/home-hero.mp4` — **직접 넣을 영상** (포함 안 됨)

## Files
- `index.html` — 마크업
- `style.css` — 스타일 / 토큰
- `main.js` — 스크롤 → 영상·자막 제어
