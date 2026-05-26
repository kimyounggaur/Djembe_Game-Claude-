# 🥁 젬베 리듬 게임 (Djembe Rhythm Game)

서아프리카 전통 타악기 **젬베(Djembe)** 를 모티브로 한 모바일 웹 친화적 PWA 리듬 게임.

## ✨ 특징

- **3 lane 리듬 게임** — SLAP / BASS / TONE
- **정밀 타이밍** — `AudioContext.currentTime` 기반, 절대 어긋나지 않음
- **4단계 판정** — Perfect / Great / Good / Miss
- **3 난이도** — Easy / Normal / Hard
- **PWA 지원** — 오프라인 실행, 홈 화면 설치
- **반응형** — 데스크탑 1920×1080부터 모바일 360×640까지
- **다국어** — 한국어 / English
- **접근성** — 색맹 모드, 키보드 전용 조작, 모션 감소
- **테마** — Default / Dark / Savanna / Night
- **튜토리얼** — 단계별 학습
- **도전과제** — 10개 기본 achievement
- **오프라인 캘리브레이션** — 디바이스 입력 지연 보정

## 🎮 조작법

| 입력 | 레인 | 사운드 |
|-----|------|------|
| D 키 / 화면 왼쪽 | SLAP | 날카로운 소리 |
| Space / 화면 중앙 | BASS | 묵직한 소리 |
| K 키 / 화면 오른쪽 | TONE | 맑은 소리 |
| ESC | - | 일시정지 |

## 🚀 실행

브라우저에서 정적 호스팅이 필요합니다 (ES Modules + AudioContext + Service Worker).

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# 또는 VS Code Live Server
```

브라우저에서 `http://localhost:8080`을 엽니다.

> **참고**: `file://` 프로토콜에서는 ES Modules가 작동하지 않습니다. 반드시 HTTP 서버를 사용하세요.

## 📁 프로젝트 구조

```
djembe-game/
├── index.html
├── manifest.json          # PWA 매니페스트
├── service-worker.js      # 오프라인 캐싱
├── assets/
│   ├── images/            # 노트/젬베 이미지
│   ├── sounds/            # 타격 사운드 (slap/bass/tone)
│   ├── charts/            # 차트 JSON
│   └── songs.json         # 곡 목록
└── src/
    ├── main.js            # 엔트리
    ├── core/              # GameApp, SceneManager, InputManager, AssetLoader
    ├── audio/             # AudioEngine, SampleBank, Conductor
    ├── game/              # Note, NoteSpawner, JudgmentSystem, ScoreSystem
    ├── scenes/            # Loading/Title/SongSelect/Play/Result 등
    ├── ui/                # ParticleSystem, Theme
    └── utils/             # Storage, i18n, MathUtils
```

## 🎨 새 곡 추가

`assets/charts/{songId}.json`:

```json
{
  "songId": "my_song",
  "title": "내 곡",
  "artist": "Artist",
  "bpm": 120,
  "offset": 1000,
  "duration": 60000,
  "difficulty": { "easy": 2, "normal": 4, "hard": 6 },
  "notes": {
    "easy": [
      { "time": 2000, "lane": "bass", "type": "tap" }
    ],
    "normal": [],
    "hard": []
  }
}
```

`assets/songs.json`에도 등록.

## 🏆 도전과제

- 첫 발걸음 — 곡 1개 완주
- 리듬의 시작 — 100콤보
- 기교의 정점 — 풀콤보
- 마라톤 러너 — 누적 60분
- 초급 마스터 — Easy 모든 곡 S랭크
- 정확한 손 — 정확도 95%+
- 콤보 마스터 — 500콤보
- 심야 연주자 — 자정~새벽
- 다양성의 추구 — 모든 난이도 1회
- 젬베의 신 — Hard 풀콤보

## 🥚 이스터에그

키 입력 `↑ ↑ ↓ ↓ ← → ← → B A` (Konami code) — 모든 곡 해금

## ⚙️ 기술

- **Vanilla JS (ES2022+)** — 프레임워크 없음
- **HTML5 Canvas 2D** — 게임 렌더링
- **Web Audio API** — 정밀 타이밍 + 이펙트 체인
- **ES Modules** — 모듈 분리
- **LocalStorage** — 점수/설정 영구 저장
- **Service Worker** — 오프라인 PWA

## 📜 라이선스

개인/교육 목적으로 자유롭게 사용 가능. 사운드/이미지 자산은 직접 제작본.

---

**Made with Claude Opus 4.7**
