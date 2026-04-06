# Company Site

회사소개 웹사이트 프로젝트입니다.  
같은 도메인 요구사항을 두 가지 조합으로 구현해 둔 모노레포입니다.

- `frontend-spring` + `backend-spring`: React + Spring Boot
- `frontend-django` + `backend-django`: React + Django REST Framework

공개 페이지, 회원 인증, 뉴스 관리, 문의 접수/처리, 관리자 권한 관리까지 포함합니다.

문서의 명령 예시는 Windows PowerShell 기준입니다.

## 실행 환경

- Node.js 20+ 권장
- Java 21 (`backend-spring`)
- Python 3.11 (`backend-django`)

## 주요 기능

- 회사 소개, 제품 소개, 팀 소개, 문의 페이지
- 회원가입, 로그인, 로그아웃, 토큰 재발급
- 아이디 찾기, 비밀번호 찾기, 비밀번호 변경
- 뉴스 목록/상세 조회
- 관리자 뉴스 등록, 수정, 삭제
- S3 Presigned URL 기반 이미지 업로드
- 문의 등록, 관리자 문의 목록/상세/처리/삭제
- 역할 기반 접근 제어: `USER`, `ADMIN`, `SUPER_ADMIN`

## 저장소 구조

```text
company-site/
├─ backend-django/      # Django REST API
├─ backend-spring/      # Spring Boot API
├─ frontend-django/     # Django 백엔드용 React 프론트엔드
├─ frontend-spring/     # Spring 백엔드용 React 프론트엔드
└─ docs/company-site/   # API 명세, DB 설계, 와이어프레임, 테스트 문서
```

## 기술 스택

### Frontend

- React 19
- TypeScript
- Vite 7
- React Router 7
- Axios

### Backend (Spring)

- Java 21
- Spring Boot 3.4
- Spring Security
- Spring Data JPA
- Flyway
- SQLite
- AWS S3 SDK
- JWT

### Backend (Django)

- Python 3.11
- Django 5.2
- Django REST Framework
- SimpleJWT
- django-cors-headers
- django-environ
- WhiteNoise
- boto3
- SQLite

## 권장 실행 조합

로컬에서 가장 빠르게 확인하려면 아래 두 조합 중 하나로 실행하면 됩니다.

1. `frontend-django` + `backend-django`
2. `frontend-spring` + `backend-spring`

두 프론트엔드는 각자 대응하는 백엔드 라우팅을 전제로 작성되어 있어 교차 조합은 권장하지 않습니다.

## 빠른 시작

### 1. Django 조합 실행

백엔드:

```powershell
cd backend-django
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py seed_userlevels
python manage.py runserver 127.0.0.1:8000
```

새 환경에서 `.venv`가 없다면 먼저 아래처럼 준비하면 됩니다.

```powershell
cd backend-django
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install django==5.2.5 djangorestframework==3.16.1 djangorestframework-simplejwt==5.5.1 django-cors-headers==4.7.0 django-environ==0.12.0 whitenoise==6.11.0 boto3==1.40.39
```

프론트엔드:

```powershell
cd frontend-django
npm install
npm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`

선택 사항: 슈퍼 관리자 계정이 필요하면 아래 명령으로 생성할 수 있습니다.

```powershell
cd backend-django
.\.venv\Scripts\Activate.ps1
python manage.py seed_superadmin
```

### 2. Spring 조합 실행

백엔드:

```powershell
cd backend-spring
.\gradlew.bat bootRun
```

Spring 조합은 환경 변수와 초기 데이터 준비 상태에 따라 로그인, 메일, S3 업로드 기능이 바로 동작하지 않을 수 있습니다.

프론트엔드:

```powershell
cd frontend-spring
npm install
npm run dev
```

접속 주소:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8080`

## 환경 변수

### Frontend (`frontend-spring`, `frontend-django`)

Vite 환경 변수 예시는 다음 키를 기준으로 맞추면 됩니다.

```env
VITE_API_BASE=/api
VITE_KAKAO_MAPS_KEY=your_kakao_maps_key
VITE_CDN_BASE=https://your-cloudfront-domain
```

- 개발 환경에서는 `VITE_API_BASE=/api` 와 Vite proxy를 사용합니다.
- 카카오 지도 섹션은 `VITE_KAKAO_MAPS_KEY`가 필요합니다.
- 뉴스 이미지 렌더링에 CDN을 쓰는 경우 `VITE_CDN_BASE`를 사용할 수 있습니다.

### Backend Django (`backend-django/.env`)

민감 정보는 제외하고, README 기준 최소 예시는 아래와 같습니다.

```env
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.trycloudflare.com
DB_NAME=db.sqlite3

NAVER_USER=your_naver_email
NAVER_APP_PASS=your_naver_app_password
FRONTEND_BASE_URL=http://127.0.0.1:5173
PASSWORD_RESET_PATH=/change-password

AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your_bucket
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CLOUDFRONT_DOMAIN=your_cloudfront_domain
```

### Backend Spring

Spring은 `application.yml`에서 환경 변수를 읽습니다. 자주 쓰는 키는 아래와 같습니다.

```env
SPRING_PROFILES_ACTIVE=local
DB_PATH=./db.sqlite3

JWT_SECRET=change-me-please-use-32bytes-or-more
APP_PRECHECK_SECRET=change-me
APP_ALLOWED_EMAIL_DOMAINS=gmail.com,naver.com,kakao.com
FRONTEND_BASE_URL=http://127.0.0.1:5173

SPRING_MAIL_USERNAME=your_naver_email
SPRING_MAIL_PASSWORD=your_naver_app_password
APP_MAIL_FROM=your_naver_email

AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=your_bucket
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CLOUDFRONT_DOMAIN=your_cloudfront_domain
```

## API 개요

### 인증/계정

- `POST /api/auth/register/precheck/user-id/`
- `POST /api/auth/register/precheck/email/`
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `POST /api/auth/logout/`
- `POST /api/auth/find-id/`
- `POST /api/auth/find-password/`
- `POST /api/auth/change-password/`

### 뉴스

- `GET /api/news/`
- `GET /api/news/{news_seq}/`
- `POST /api/admins/news/`
- `PUT /api/admins/news/{news_seq}/`
- `DELETE /api/admins/news/{news_seq}/`
- `POST /api/admins/news/uploads/urls/`

### 문의

- `POST /api/inquiries/`
- 관리자 구현체별 문의 관리 엔드포인트 제공

## 문서 위치

- `docs/company-site/java-spring`
- `docs/company-site/python-django`

포함 문서:

- API 명세
- DB 설계
- 테이블 정의서
- 와이어프레임
- 테스트 케이스
- WBS

## 개발 메모

- 두 프론트엔드 모두 기본 개발 포트는 `5173`입니다.
- Spring 백엔드는 `8080`, Django 백엔드는 `8000`을 사용합니다.
- 인증은 Access Token + HttpOnly Refresh Cookie 패턴을 사용합니다.
- 뉴스 이미지 업로드 기능은 AWS S3/CloudFront 설정이 있어야 정상 동작합니다.
- 메일 기반 비밀번호 찾기 기능은 Naver SMTP 설정이 필요합니다.
- `backend-django`는 사용자 등급/슈퍼관리자 시드 명령이 포함되어 있습니다.
- `backend-spring`는 저장소 기준으로 초기 스키마/권한 시드 준비가 별도로 필요할 수 있습니다.

## 빌드와 테스트

### Frontend

```powershell
cd frontend-spring
npm run build
npm run lint
```

```powershell
cd frontend-django
npm run build
npm run lint
```

### Backend Spring

```powershell
cd backend-spring
.\gradlew.bat test
.\gradlew.bat build
```

### Backend Django

```powershell
cd backend-django
.\.venv\Scripts\Activate.ps1
python manage.py test
```
