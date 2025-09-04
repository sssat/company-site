# 시리얼라이저(Serializer): Django REST Framework(DRF)에서 데이터(모델 객체 = 클래스의 인스턴스)를 JSON 형식으로 변환하거나, 반대로 JSON -> 모델 객체로 변환하는 도구
# 쉽게말해, 백엔드와 프론트엔드가 서로 통신할 때 데이터 형식을 맞춰주는 통역사 같은 역할
# 시리얼라이저는 [models.py, api 명세서]를 토대로 작성한다.

# 예를들어 <User: id=1, username='testuser', email='test@example.com'> <- 이 모델 객체(클래스 인스턴스)를 
# { "id": 1, "username": "testuser", "email": "test@example.com" } <- 이러한 JSON으로 바꿔준다.

# 시리얼라이저는 두 가지 방향으로 작동한다.
# (1) Serialization(직렬화): Python 객체 → JSON, (2) Deserialization(역직렬화): JSON → Python 객체

# CRUD 동작 과정
# 1. GET(조회): DB -> 모델(models.py 안의 클래스) -> JSON -> 프론트엔드
# (1) DB에서 데이터를 가져오면 Django는 모델로 불러온다.
# (2) 이 모델은 데이터를 그대로 쓸 수 없기 때문에 -> 시리얼라이저를 통해 데이터를 JSON으로 변환한다.
# (3) 그리고 JSON을 프론트엔드로 전달한다.

# 2. POST/PUT (등록/수정): 프론트엔드 → JSON → 모델 → DB
# (1) 프론트엔드가 JSON을 백엔드에 보낸다.
# (2) 시리얼라이저가 JSON을 받아 역직렬화를 통해 모델 객체로 변환
# (3) 그리고 이 모델 객체가 DB에 저장됨

