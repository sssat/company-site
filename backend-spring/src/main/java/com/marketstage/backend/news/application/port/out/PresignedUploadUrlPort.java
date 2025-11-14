// news/application/port/out/PresignedUploadUrlPort.java
// 참고로 NewsPostRepository, NewsPostHistoryRepository는 DB(JPA)랑 이야기하는 퍼시스턴스 포트라서
// 그 구현체(NewsPostRepositoryJpaAdapter, NewsPostHistoryRepositoryJpaAdapter) 안에서 사용하려고
// SpringDataNewsPostRepository, SpringDataNewsPostHistoryRepository 같은 JpaRepository 인터페이스를 따로 만들었지만,
// PresignedUploadUrlPort는 DB가 아니라 S3(외부 스토리지)랑 통신하는 인프라 포트라서 JPA, 엔티티, SQL 등을 전혀 안 쓰기때문에 
// Spring Data JPA랑은 1도 관련 없는 관계로 JpaRepository 인터페이스를 만들지않는다.

// 파이썬 장고 기준으로 보면 
// CreatePresignedUploadURLView 가 boto3 클라이언트에게 하던 일을
// 스프링에선 이 인터페이스(포트) + S3 어댑터에서 처리하도록 분리한 것

package com.marketstage.backend.news.application.port.out;

public interface PresignedUploadUrlPort {

    // 1. 프리사인드 업로드 URL 정보를 한 묶음으로 들고 다니는 값 객체
    record PresignedUpload(
            String uploadUrl,
            String key,
            String publicUrl,
            String contentType
    ) {}

    // 2. 이미지 파일을 S3에 업로드할 수 있는 프리사인드 URL 하나 만들어서 돌려주는 함수
    PresignedUpload createPresignedUploadUrl(
            String kind,
            String filename,
            String contentType
    );
}
