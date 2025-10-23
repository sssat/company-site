import re
from typing import List, Optional

# 규칙: 8~16자 범위는 필드/시리얼라이저에서 이미 처리할 수도 있지만, 여기서도 한 번 더 체크 가능
MIN_LEN = 8
MAX_LEN = 16

# ── 1. 비밀번호 정책 헬퍼함수 ────────────────────────────────────────────────────
# (1) (대문자/소문자/숫자/특수문자) 중 3종 이상 포함
def _has_3_of_4_categories(pw: str) -> bool:
    categories = 0
    categories += bool(re.search(r"[A-Z]", pw))          # 대문자가 포함되면 +1
    categories += bool(re.search(r"[a-z]", pw))          # 소문자가 포함되면 +1
    categories += bool(re.search(r"\d", pw))             # 숫자가 포함되면 +1
    categories += bool(re.search(r"[^A-Za-z0-9]", pw))   # 특수문자가 포함되면 +1

    return categories >= 3  # 3 이상이면 True 반환

# (2) 연속 숫자 4자리(오름/내림) 금지: 1234, 2345, 4321, 9876 등
def _has_sequential_digits_4(pw: str) -> bool:
    for m in re.finditer(r"\d{4,}", pw):
        run = m.group()
        for i in range(len(run) - 3):
            w = run[i:i+4]
            diffs = [int(w[j+1]) - int(w[j]) for j in range(3)]
            if all(d == 1 for d in diffs) or all(d == -1 for d in diffs):
                return True  # 연속 숫자가 있다면 True 반환
    return False             # 연속 숫자가 없다면 False 반환

# (3) 동일 문자 4회 연속 금지
def _has_4_same_in_a_row(pw: str) -> bool:
    return bool(re.search(r"(.)\1{3,}", pw))  # 같은 문자가 4회이상 발견되면 True 반환. 없으면 False 반환

# (4) 비밀번호에 user_id의 3글자 이상 연속 부분문자열 포함 금지(대소문자 무시)
# 예를 들어, 아이디가 abcdef일 때 비밀번호가 xyzABC123!라면 -> ABC가 들어 있으므로 정책 위반
def _contains_userid_substring(pw: str, user_id: str, min_len: int = 3) -> bool:
    if not user_id:
        return False
    a = pw.lower()
    b = str(user_id).lower()
    for L in range(min_len, len(b) + 1):
        for i in range(0, len(b) - L + 1):
            sub = b[i:i+L]
            if sub and sub in a:
                return True  # 정책 위반 시 True 반환
    return False             # 통과 시 False 반환

# ── 2. 비밀번호 보안 정책 검증 함수 ────────────────────────────────────────────────────
def validate_password_policy(password: str, user_id: Optional[str] = None) -> List[str]:
    msgs: List[str] = []

    # 길이(선택: 이미 필드에서 min/max 처리 중이면 생략 가능)
    if not (MIN_LEN <= len(password) <= MAX_LEN):
        msgs.append(f"비밀번호는 {MIN_LEN}~{MAX_LEN}자여야 합니다.")

    if not _has_3_of_4_categories(password):
        msgs.append("대문자/소문자/숫자/특수문자 중 3종 이상을 포함해야 합니다.")
    if _has_sequential_digits_4(password):
        msgs.append("연속된 숫자 4자를 사용할 수 없습니다(예: 1234, 4321).")
    if _has_4_same_in_a_row(password):
        msgs.append("동일 문자를 4회 연속 사용할 수 없습니다.")
    if _contains_userid_substring(password, user_id, min_len=3):
        msgs.append("비밀번호에 아이디의 3글자 이상 연속 문자열을 포함할 수 없습니다.")

    return msgs