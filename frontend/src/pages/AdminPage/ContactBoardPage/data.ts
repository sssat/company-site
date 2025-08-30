export type TicketStatus = "pending" | "done";

export type Ticket = {
  id: number;
  title: string;
  author: string;
  email: string;
  date: string; // YYYY-MM-DD
  status: TicketStatus;
  message: string;
};

// 데모 데이터
const _TICKETS: Ticket[] = [
  { id: 16, title: "회원가입은 어떻게 하나요?", author: "OOO", email: "dfisga@naver.com", date: "2025-07-26", status: "pending",
    message: "안녕하세요. 회원가입 절차가 궁금합니다. 휴대폰 본인인증 없이 이메일로 가입이 가능한지도 알려주세요. 감사합니다." },
  { id: 15, title: "상품 환불 규정 문의드립니다", author: "OOO", email: "user15@example.com", date: "2025-07-26", status: "done",
    message: "상품 환불 기한과 절차를 알고 싶습니다. 사용 흔적이 없으면 전액 환불 가능한가요?" },
  { id: 14, title: "문의 드립니다(배송)", author: "OOO", email: "user14@example.com", date: "2025-07-25", status: "pending",
    message: "배송 예정일을 확인할 수 있는 페이지가 있을까요? 송장번호는 언제 발급되나요?" },
  { id: 13, title: "계정 잠김 해제 방법", author: "OOO", email: "user13@example.com", date: "2025-07-25", status: "done",
    message: "계정이 잠겼다고 나옵니다. 해제하려면 어떻게 해야 하나요?" },
  { id: 12, title: "비밀번호 재설정이 안돼요", author: "OOO", email: "user12@example.com", date: "2025-07-25", status: "pending",
    message: "비밀번호 변경 메일이 오지 않습니다. 스팸함에도 없습니다." },
  { id: 11, title: "세금계산서 발행 문의", author: "OOO", email: "user11@example.com", date: "2025-07-24", status: "done",
    message: "법인 명의로 세금계산서 발행 가능한가요?" },
  { id: 10, title: "리뷰 작성이 안됩니다", author: "OOO", email: "user10@example.com", date: "2025-07-24", status: "pending",
    message: "리뷰 작성 버튼을 눌러도 반응이 없습니다." },
  { id: 9,  title: "단체 구매 할인 있나요?", author: "OOO", email: "user9@example.com",  date: "2025-07-24", status: "done",
    message: "10개 이상 구매 시 할인 정책이 있는지 궁금합니다." },
  { id: 8,  title: "문의: 관리자 승인 절차", author: "OOO", email: "user8@example.com",  date: "2025-07-24", status: "pending",
    message: "관리자 승인 절차가 어떻게 되나요?" },
  { id: 7,  title: "배송지 변경 요청", author: "OOO", email: "user7@example.com",  date: "2025-07-24", status: "done",
    message: "주문 후 배송지를 변경하고 싶습니다." },
  { id: 6,  title: "쿠폰 적용이 안돼요", author: "OOO", email: "user6@example.com",  date: "2025-07-24", status: "pending",
    message: "결제 단계에서 쿠폰을 적용하면 에러가 납니다." },
  { id: 5,  title: "문의 테스트 1", author: "OOO", email: "user5@example.com",  date: "2025-07-23", status: "done",
    message: "테스트 메시지 1" },
  { id: 4,  title: "문의 테스트 2", author: "OOO", email: "user4@example.com",  date: "2025-07-23", status: "done",
    message: "테스트 메시지 2" },
  { id: 3,  title: "문의 테스트 3", author: "OOO", email: "user3@example.com",  date: "2025-07-23", status: "pending",
    message: "테스트 메시지 3" },
  { id: 2,  title: "문의 테스트 4", author: "OOO", email: "user2@example.com",  date: "2025-07-22", status: "done",
    message: "테스트 메시지 4" },
  { id: 1,  title: "문의 테스트 5", author: "OOO", email: "user1@example.com",  date: "2025-07-22", status: "done",
    message: "테스트 메시지 5" },
];

export function getTickets(): Ticket[] {
  return _TICKETS.slice().sort((a, b) => b.id - a.id);
}

export function getTicketById(id: number): Ticket | undefined {
  return _TICKETS.find(t => t.id === id);
}

export function updateTicketStatus(id: number, status: TicketStatus): void {
  const t = _TICKETS.find(x => x.id === id);
  if (t) t.status = status;
}

export function deleteTicket(id: number): boolean {
  const idx = _TICKETS.findIndex(t => t.id === id);
  if (idx >= 0) {
    _TICKETS.splice(idx, 1);
    return true;
  }
  return false;
}
