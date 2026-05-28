# coffee-hanzan QR 분석

분석 기준: `https://github.com/Zih0/coffee-hanzan.git`, latest clone commit `8df8a19 2022-06-05`.

## 확인한 핵심 구조

- `src/components/common/QR/QR.tsx`
  - `qrcode.react`로 SVG QR을 렌더링한다.
  - QR 값은 `VITE_A + decryptedBank + VITE_B + decryptedAccount + VITE_C + amount` 조합이다.
- `src/components/Feed/Support.tsx`
  - 모바일에서는 같은 payload를 `window.open(...)`으로 연다.
  - 데스크톱에서는 modal 안에서 QR을 보여준다.
- `src/components/Modal/CustomModal/SupportModal.tsx`
  - QR을 스캔하라는 안내와 QR 컴포넌트를 표시한다.

## QRDonate에 반영한 결정

- 토스 payload 스펙을 코드에 고정하지 않는다.
- `QRDONATE_TOSS_URL_TEMPLATE`로 placeholder 기반 payload를 만든다.
- coffee-hanzan 호환을 위해 `QRDONATE_TOSS_URL_A/B/C` 조합도 지원한다.
- 다른 프로그램 붙이기를 위해 JSON API, SVG API, HTML 화면, iframe script를 같이 제공한다.
