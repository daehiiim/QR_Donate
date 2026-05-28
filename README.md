<div align="center">

# QRDonate

<img width="273" height="162" alt="QRDonate preview" src="https://github.com/user-attachments/assets/b90776f3-c0d2-4655-b8e0-16d056ef9157" />

토스 송금 QR, 계좌 복사, 모바일 토스 열기 링크를 한 번에 제공하는 작은 후원 화면/API입니다.
Vercel 배포와 로컬 Node 서버를 모두 지원하며, 다른 페이지에는 iframe widget script로 붙일 수 있습니다.

</div>

## 기능

- `/`와 `/donate`에서 바로 사용할 수 있는 독립 후원 화면
- `/api/qr-donate/config`, `/payload`, `/svg`, `/widget.js` API
- 정적 QR 이미지 우선 사용, 없으면 토스 송금 payload 기반 SVG QR 생성
- 모바일에서는 `토스 열기`, 데스크톱에서는 `계좌 복사` 중심 동작
- `QRDONATE_QR_LINK`, URL template, coffee-hanzan 방식 A/B/C URL 조각 지원
- 계좌번호 마스킹 공개 설정과 민감값 축약 구조화 오류 로그

## 로컬 실행

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

기본 주소는 `http://localhost:8787`입니다. 포트를 바꾸려면 `QRDONATE_PORT` 또는 `PORT`를 설정합니다.

로컬 서버의 이미지는 `assets` 폴더에서 읽습니다.

```text
http://localhost:8787/
http://localhost:8787/donate
http://localhost:8787/api/qr-donate/config
http://localhost:8787/api/qr-donate/payload?amount=7000
http://localhost:8787/api/qr-donate/svg?amount=7000
http://localhost:8787/api/qr-donate/widget.js
```

## 설정

`.env.example`을 복사한 뒤 아래 값을 바꿉니다.

```env
QRDONATE_BANK_NAME=토스뱅크
QRDONATE_ACCOUNT_NUMBER=1000-2000-3000
QRDONATE_ACCOUNT_HOLDER=홍길동
QRDONATE_QR_IMAGE_URL=/assets/toss-qr-5000.webp
QRDONATE_DEFAULT_AMOUNT=5000
```

필수 값은 `QRDONATE_BANK_NAME`, `QRDONATE_ACCOUNT_NUMBER`입니다. 계좌번호는 숫자만 남겼을 때 10~20자리여야 합니다.

선택 값:

```env
QRDONATE_TITLE=개발자한테 커피 한 잔 쏘기!
QRDONATE_DESCRIPTION=작은 응원이 개발자에게는 큰 힘이 됩니다!!
QRDONATE_THANKS_TEXT=
QRDONATE_FALLBACK_NOTICE=QR 인식이 안되면 아래 계좌 번호로 부탁드립니다!
QRDONATE_QR_SIZE=340
QRDONATE_MASCOT_IMAGE_URL=/assets/coffee-mascot.png
QRDONATE_ACCENT_COLOR=#0064ff
QRDONATE_ENCODE_VALUES=true
```

토스 QR에서 디코딩한 링크를 그대로 쓰고 싶으면 `QRDONATE_QR_LINK`를 설정합니다. 이 값이 있으면 URL template보다 우선합니다.

```env
QRDONATE_QR_LINK=supertoss://send?amount=5000&bank=...&accountNo=...&origin=qr
```

직접 payload를 만들 때는 placeholder template을 쓸 수 있습니다.

```env
QRDONATE_TOSS_URL_TEMPLATE=supertoss://send?amount={amount}&bank={bank}&accountNo={account}&origin=qr
```

`coffee-hanzan` 방식과 호환해야 하면 세 값을 함께 설정합니다.

```env
QRDONATE_TOSS_URL_A=supertoss://send?bank=
QRDONATE_TOSS_URL_B=&accountNo=
QRDONATE_TOSS_URL_C=&amount=
```

## 붙이는 방법

배포된 QRDonate를 다른 페이지에 붙일 때는 widget script를 추가합니다.

```html
<script src="https://<your-qrdonate-project>.vercel.app/api/qr-donate/widget.js"></script>
```

로컬 확인은 `example-client.html`을 브라우저에서 열거나 아래처럼 로컬 서버 주소를 사용합니다.

```html
<script src="http://localhost:8787/api/qr-donate/widget.js"></script>
```

## Vercel 배포

GitHub repo는 `https://github.com/daehiiim/QR_Donate.git`입니다. Vercel에서 이 repo를 import한 뒤 환경변수를 등록합니다.

Vercel에서는 `/`, `/donate`, `/api/qr-donate/widget.js`가 `vercel.json` rewrite를 통해 `api/qr-donate/*` 함수로 연결됩니다. 배포 이미지는 `public/assets` 폴더에서 서빙됩니다.

필수 env:

```env
QRDONATE_BANK_NAME=토스뱅크
QRDONATE_ACCOUNT_NUMBER=1000-2000-3000
```

권장 env:

```env
QRDONATE_ACCOUNT_HOLDER=홍길동
QRDONATE_QR_IMAGE_URL=/assets/toss-qr-5000.webp
QRDONATE_MASCOT_IMAGE_URL=/assets/coffee-mascot.png
QRDONATE_DEFAULT_AMOUNT=5000
```

raNovel Electron 빌드에서 이 API를 바라보게 하려면 아래 값을 사용합니다.

```powershell
$env:NEXT_PUBLIC_QRDONATE_API_BASE_URL="https://<your-qrdonate-project>.vercel.app"
```

## 검증

```powershell
npm test
npm run build
npm run typecheck:vercel
```
