// 1. React에선 컴포넌트 안에 또 다른 컴포넌트를 넣을 수 있다. 
// 이때, 바깥쪽에서 감싸는 컴포넌트가 부모이고 그 안에 포함된 컴포넌트가 자식이다.
// 그리고 React에선 부모 컴포넌트 -> 자식 컴포넌트로 값을 넘길때 props를 사용한다.

// 2. 프로퍼티(props)란? => 부모 컴포넌트에서 자식 컴포넌트로 전달되는 데이터
// 여기서 props는 
// 문자열(string) → "안녕하세요"
// 숫자(number) → 20
// 불리언(boolean) → true / false
// 객체(object) → { name: "철수", age: 20 }
// 배열(array) → ["사과", "배", "포도"]
// 함수(function) → 이벤트 핸들러 같은 것
// React 엘리먼트(JSX) → <button>클릭</button>
// => 이런것들이 전부 props이다.
// 부모(App)컴포넌트 → 자식(UserCard) 컴포넌트로 props("철수", 20, true) 전달하는 예시
// function App() {
//   return (// 
//     <UserCard name="철수" age={20} isAdmin={true} />
//   );
// }

// 3. Context란?
// Context는 "부모 → 아주 깊은 자식"까지 값을 ‘직통’으로 내려주는 통로를 정의한 것.
// 중간 컴포넌트들에 프로퍼티(props)를 하나하나 전달하지 않고도 필요한 데이터를 한번에 꺼내쓸 수 있다.
// 예를들어 원래 A에서 D까지 값(props)을 전달하려면 A -> B -> C -> D를 거쳐야했는데, 컨텍스트 개념을 사용하면 A -> D까지 직통으로 값(context value)를 전달할 수 있다.
// 쓰는 이유: 예를들어 어떤 props가 헤더 페이지, 푸터 페이지, 뉴스룸 페이지, .... 등등에서 전부 필요한데, 이때 이 props들을 한 곳에 모아둔다음 필요할때마다 꺼내쓰기 위함.

// 4. props vs context value
// props는 부모 -> 자식 한 단계 "전달". 로컬/일회성 데이터에 적합
// context value는 해당 Provider의 하위 트리 어디서든(한 단계보다 더 위에 있더라도) 직접 "꺼내쓸 수" 있다. 단, Provider '하위 트리'에서만 접근 가능

// 5. Context - Provider 관계
// Context는 값을 전달하는 채널/통로를 정의한 것.
// Provider는 실제 값을 하위 트리에 값을 공급하는 역할.
// 즉, Context에서 통로를 정의하고, Provider에서 Consumer(값을 꺼내쓰는 쪽)에게 값을 다이렉트로 공급한다.
// 따라서 Context와 Provider는 항상 한 세트이다.

// 6. 참고로 컨텍스트는 기능별로 여러개를 만들 수 있다.
// AuthContext.tsx는 인증/권한 관련 기능을 정의한 컨텍스트 이다.


// React의 컨텍스트 객체를 만들기 위한 함수
import { createContext } from "react";

// 권한을 리터럴 유니온 타입으로 고정 -> 오타 방지, 자동완성, allowed: Role[] 같은 곳에서 타입 안전
export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

// 여기선 얘네들이 컨텍스트 값(context value) 구성요소이다. 실제 context value은 AuthProvider.tsx에서 생성한다.
// isAuthenticated: boolean → 로그인 여부
// role: Role → 현재 사용자 권한
// userName: string | null → 사용자 이름(없을 수 있음)
// login(username: string, password?: string) → 로그인 함수 (데모라 password 옵션)
// logout() → 로그아웃 함수
export type AuthContextType = {
  isAuthenticated: boolean;
  role: Role;
  userName: string | null;
  login: (username: string, password?: string) => void; 
  logout: () => void;
};

// 실제 컨텍스트 객체 생성
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
