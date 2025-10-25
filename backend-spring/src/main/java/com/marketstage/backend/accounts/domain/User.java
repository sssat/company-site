// accounts/domain/User.java
// 파이썬 models.py의 models.Model 클래스가 대응됨
// 자바는 파일 안에 클래스 몇개든 자유롭게 선언가능한 파이썬과 다르게 
// 메인이 되는 public 클래스가 .java 파일 당 하나만 지정할 수 있기 때문에 User.java에는 User 클래스(테이블) 하나만 정의되어있다.

package com.marketstage.backend.accounts.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "userSeq")
@Entity
@Table(
    name = "T_USER",
    uniqueConstraints = {
        @UniqueConstraint(name = "UK_T_USER_EMAIL",   columnNames = "EMAIL"),
        @UniqueConstraint(name = "UK_T_USER_USER_ID", columnNames = "USER_ID")
    }
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "USER_SEQ")
    private Integer userSeq;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "GRADE_CODE", nullable = false)
    private UserLevel level;

    @Column(name = "EMAIL", nullable = false, length = 150)
    private String email;

    @Column(name = "USER_ID", nullable = false, length = 50)
    private String userId;

    @Column(name = "USER_NAME", nullable = false, length = 100)
    private String userName;

    @Column(name = "PASSWORD_HASH", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "PASSWORD_CHANGED_AT")
    private LocalDateTime passwordChangedAt;

    public enum Gender { M, F }

    @Enumerated(EnumType.STRING)
    @Column(name = "GENDER", columnDefinition = "CHAR(1)", nullable = false)
    private Gender gender;

    @Column(name = "BIRTH_DATE", nullable = false)
    private LocalDate birthDate;

    @Column(name = "JOINED_AT", nullable = false)
    private LocalDateTime joinedAt;

    @Column(name = "LAST_LOGIN_AT")
    private LocalDateTime lastLoginAt;

    @Column(name = "GRANTED_AT")
    private LocalDateTime grantedAt;

    /** DB NOT NULL 대응 */
    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (joinedAt == null) joinedAt = now;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @Override public String toString() {
        return "[" + userSeq + "] " + userId + " (" + userName + ")";
    }
}
