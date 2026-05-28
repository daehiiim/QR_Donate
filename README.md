
# QRDonate

토스 QR 이미지와 계좌 정보를 넣으면 바로 쓸 수 있는 작은 후원 화면/API입니다.
Vercel 배포에서는 `/api/qr-donate/*` 함수와 `public/assets/*` 정적 파일로 동작합니다.

## 사용법

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

기본 주소는 `http://localhost:8787`입니다.

## 설정

로컬 서버의 QR 이미지는 `QRDonate/assets` 폴더에서 읽습니다. Vercel 배포 이미지는 `public/assets` 폴더에서 서빙됩니다. 외부 이미지 주소를 써도 됩니다.

```env
QRDONATE_BANK_NAME=토스뱅크
QRDONATE_ACCOUNT_NUMBER=1000-2000-3000
QRDONATE_ACCOUNT_HOLDER=홍길동
QRDONATE_QR_IMAGE_URL=/assets/toss-qr-5000.webp
QRDONATE_DEFAULT_AMOUNT=5000
```

이 값만 바꾸면 화면의 QR 이미지, 은행명, 예금주, 계좌번호가 같이 바뀝니다. 모바일의 `토스 열기` 링크는 은행명과 계좌번호로 자동 생성됩니다.

토스 QR에서 디코딩한 링크를 그대로 쓰고 싶을 때만 `QRDONATE_QR_LINK`를 추가하세요.

## 붙이는 방법

```html
<script src="http://localhost:8787/api/qr-donate/widget.js"></script>
```

자체 화면은 `/`, 공개 설정은 `/api/qr-donate/config`, 송금 링크는 `/api/qr-donate/payload`에서 확인할 수 있습니다.

## Vercel 배포

GitHub repo는 `https://github.com/daehiiim/QR_Donate.git`를 사용합니다. Vercel에서 이 repo를 import한 뒤 환경변수를 등록합니다.

필수 env:

```env
QRDONATE_BANK_NAME=토스뱅크
QRDONATE_ACCOUNT_NUMBER=1000-2000-3000
QRDONATE_ACCOUNT_HOLDER=홍길동
QRDONATE_QR_IMAGE_URL=/assets/toss-qr-5000.webp
QRDONATE_MASCOT_IMAGE_URL=/assets/coffee-mascot.png
QRDONATE_DEFAULT_AMOUNT=5000
```

선택 env:

```env
QRDONATE_QR_LINK=supertoss://send?amount=5000&bank=...&accountNo=...&origin=qr
QRDONATE_TITLE=개발자한테 커피 한 잔 쏘기!
QRDONATE_DESCRIPTION=작은 응원이 개발자에게는 큰 힘이 됩니다!!
QRDONATE_FALLBACK_NOTICE=QR 인식이 안되면 아래 계좌 번호로 부탁드립니다!
QRDONATE_QR_SIZE=340
QRDONATE_ACCENT_COLOR=#0064ff
```

Vercel 배포 후 raNovel Electron 빌드에는 아래 값을 넣습니다.

```powershell
$env:NEXT_PUBLIC_QRDONATE_API_BASE_URL="https://<your-qrdonate-project>.vercel.app"
```
