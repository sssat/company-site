// src/main/java/com/marketstage/backend/common/jpa/LocalDateStringAttributeConverter.java
// DB에는 "문자열 날짜"로 저장하면서, 자바 코드에서는 "LocalDate 타입"으로 편하게 쓰게 해주는 파일.

package com.marketstage.backend.common.jpa;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;

@Converter(autoApply = false) // 필요하면 true로 바꿔서 모든 LocalDate에 자동 적용 가능
public class LocalDateStringAttributeConverter
        implements AttributeConverter<LocalDate, String> {

    @Override
    public String convertToDatabaseColumn(LocalDate attribute) {
        if (attribute == null) {
            return null;
        }
        // ISO-8601 포맷: "yyyy-MM-dd" 그대로 저장
        return attribute.toString();
    }

    @Override
    public LocalDate convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        // 혹시 "yyyy-MM-dd HH:mm:ss..." 같이 들어온 경우를 위해 앞 10글자만 사용
        String onlyDate = dbData.length() >= 10 ? dbData.substring(0, 10) : dbData;
        return LocalDate.parse(onlyDate);
    }
}
