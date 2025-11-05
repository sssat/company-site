// common/exception/NotFoundException.java
// 찾으려는 리소스를 못 찾았다(404)를 표현하는 커스텀 예외
// 404는 가장 빈번하게 발생하고, 다른 HTTP 상태코드와는 달리 결정 요소가 적기 때문에 
// 404를 만드는 실질적인 로직은 제외하고 빈 껍데기만 초기에 미리 만들어서 사용함
// 404에 대한 로직 구현은 GlobalExceptionHandler.java에서 진행할 예정

package com.marketstage.backend.common.exception;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
