# Personal Diary Web Application

Project full-stack nhat ky ca nhan cho thu muc `less7`.

## Cau truc thu muc

```text
less7/
|-- frontend/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- backend/
|   |-- server.js
|   |-- config/
|   |-- middleware/
|   |-- routes/
|   `-- jobs/
|-- services/
|-- utils/
|-- certs/
|-- .env.example
`-- package.json
```

## Chuc nang chinh

- Trang Home, Gioi thieu, Ve chung toi va navbar co doi ngon ngu EN/VN.
- Login/Register dang SPA, khong reload trang.
- Dang ky gui OTP ve email, xac thuc xong moi cho dang nhap.
- Dashboard co sidebar, dropdown user, profile, notes va trash.
- Ghi chu luu rich text, ho tro bold/italic/align, tim kiem theo tieu de.
- Noi dung nhat ky duoc ma hoa AES truoc khi luu.
- Mat khau user hash bang `bcrypt`.
- Share ghi chu bang link kem du lieu ma hoa va test key.
- Thung rac tu dong xoa sau 30 ngay.
- Ho tro HTTPS bang OpenSSL.

## Cai dat

1. Mo terminal trong `less7`.
2. Cai package:

```bash
npm install
```

3. Tao file `.env` tu `.env.example`.
4. Tao file that tu mau:

```text
backend/config/firebase-service-account.sample.json
```

va luu service account that vao:

```text
backend/config/firebase-service-account.json
```

5. Tao Firestore collections:

- `users`
- `pendingUsers`
- `notes`

## Tao HTTPS certificate voi OpenSSL

Chay lenh sau trong `less7`:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
```

## Chay project

```bash
npm run dev
```

Hoac:

```bash
npm start
```

Mo trinh duyet tai:

```text
https://localhost:3443
```

Neu chua tao certificate thi app van chay bang HTTP de ban test nhanh.

## Deploy len Vercel

Project da duoc chinh de:

- Local van chay bang `npm run dev` hoac `npm start`
- Vercel goi backend qua serverless function tu `backend/server.js`
- Frontend static trong `frontend/`

### Bien moi truong can them tren Vercel

- `APP_NAME`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

### Luu y Firebase tren Vercel

Khong upload file service account json len Vercel. Hay mo file:

```text
backend/config/firebase-service-account.json
```

copy toan bo noi dung JSON roi dan vao environment variable:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

Neu ban co domain Vercel co dinh, co the them:

```text
APP_BASE_URL=https://ten-app-cua-ban.vercel.app
```

Neu khong them `APP_BASE_URL`, backend se tu dong lay domain dang request de tao share link.

## API chinh

### Auth

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`

### Notes

- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`
- `POST /api/notes/:id/restore`
- `POST /api/notes/:id/share`
- `GET /api/notes/shared/:shareToken`

### User

- `GET /api/user/me`
- `PUT /api/user/me`

## Ghi chu quan trong

- Firebase Auth duoc dong bo khi verify OTP de tao user tren Firebase.
- Flow login dang duoc xu ly o backend bang Firestore + bcrypt, phu hop cho bai tap full-stack va de chay trong VS Code.
- Khoa ca nhan hien duoc luu tam o `sessionStorage` de frontend co the giai ma khi xem ghi chu.
- Neu chua nhap khoa, giao dien se hien noi dung ma hoa.
