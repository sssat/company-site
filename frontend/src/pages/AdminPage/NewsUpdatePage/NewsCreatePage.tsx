import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NewsCreatePage.module.css";
import { useAuth } from "../../../hooks/useAuth"; // 관리자 체크

type Category = "internal" | "external";

export default function NewsCreatePage() {
  const nav = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  // 폼 상태
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");            // 요약 추가
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("internal");

  // 대표 이미지(썸네일)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 본문 이미지 삽입을 위한 ref/input
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [inlinePreviews, setInlinePreviews] = useState<string[]>([]); // blob url 목록

  // 비관리자 접근 시 목록으로 되돌리기
  useEffect(() => {
    if (!isManager) {
      alert("관리자만 접근할 수 있습니다.");
      nav("/media", { replace: true });
    }
  }, [isManager, nav]);

  // 대표이미지 미리보기 URL 관리
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 페이지 이탈 시 본문 blob url 정리
  useEffect(() => {
    return () => {
      inlinePreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [inlinePreviews]);

  // 간단 유효성 검사 (요약까지 포함)
  const canSubmit = useMemo(() => {
    return author.trim() && title.trim() && excerpt.trim() && content.trim();
  }, [author, title, excerpt, content]);

  // 대표 이미지 선택/취소
  const onChangeFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files && e.target.files[0];
    setFile(f ?? null);
  };
  const clearFile = () => setFile(null);

  // ===== 본문 이미지 삽입 =====
  const openInlinePicker = () => inlineInputRef.current?.click();

  const insertAtCursor = (text: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setContent((prev) => prev + text);
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const next = ta.value.slice(0, start) + text + ta.value.slice(end);
    setContent(next);
    // 커서 재배치
    requestAnimationFrame(() => {
      ta.focus();
      const caret = start + text.length;
      ta.setSelectionRange(caret, caret);
    });
  };

  const onPickInline: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files) return;

    const urls: string[] = [];
    let markup = "";
    for (const f of Array.from(files)) {
      const url = URL.createObjectURL(f);
      urls.push(url);
      // 간단한 HTML 태그로 삽입 (실서비스에선 업로드 후 서버URL 삽입 권장)
      markup += `<img src="${url}" alt="${f.name}" />\n`;
    }
    if (markup) {
      insertAtCursor(markup);
      setInlinePreviews((prev) => [...prev, ...urls]);
    }
    // 동일 파일 재선택 가능하도록 리셋
    e.target.value = "";
  };

  const removeInline = (url: string) => {
    // 본문에서 해당 이미지 태그 제거
    setContent((c) => c.replace(new RegExp(`<img\\s+src="${url}".*?>\\s*`, "g"), ""));
    setInlinePreviews((prev) => prev.filter((u) => u !== url));
    URL.revokeObjectURL(url);
  };

  // ===== 제출 =====
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      alert("작성자, 제목, 요약, 내용을 모두 입력해주세요.");
      return;
    }

    // 실제에선 FormData로 전송하세요.
    alert(
      [
        "등록 완료(샘플):",
        `작성자: ${author}`,
        `제목: ${title}`,
        `요약: ${excerpt}`,                        // 요약 포함
        `카테고리: ${category === "internal" ? "내부발표" : "외부발표"}`,
        file ? `대표 이미지: ${file.name}` : "대표 이미지: (없음)",
        `본문 이미지 개수: ${inlinePreviews.length}`,
      ].join("\n")
    );

    nav("/media", { replace: true });
  };

  const onCancel = () => nav(-1);

  return (
    <section className={styles.section} aria-label="게시글 등록">
      <div className={styles.wrap}>
        <h1 className={styles.title}>게시글 등록</h1>

        <form className={styles.form} onSubmit={onSubmit}>
          {/* 작성자 */}
          <div className={styles.row}>
            <label className={styles.label} htmlFor="author">작성자</label>
            <input
              id="author"
              className={styles.input}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder=""
            />
          </div>

          {/* 제목 */}
          <div className={styles.row}>
            <label className={styles.label} htmlFor="title">제목</label>
            <input
              id="title"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder=""
            />
          </div>

          {/* 요약 */}
          <div className={styles.rowCol}>
            <label className={styles.label} htmlFor="excerpt">요약</label>
            <textarea
              id="excerpt"
              className={`${styles.textarea} ${styles.excerptBox}`}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="목록 카드에 표시될 한두 문장을 입력하세요."
            />
          </div>

          {/* 내용 + 이미지 첨부 버튼/프리뷰 */}
          <div className={styles.rowCol}>
            <label className={styles.label} htmlFor="content">내용</label>
            <div>
              <div className={styles.editorBar}>
                <button
                  type="button"
                  className={styles.smallBtn}
                  onClick={openInlinePicker}
                >
                  이미지 첨부
                </button>
                <input
                  ref={inlineInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={onPickInline}
                />
              </div>

              <textarea
                id="content"
                ref={contentRef}
                className={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder=""
              />

              {inlinePreviews.length > 0 && (
                <div className={styles.inlinePreviewList}>
                  {inlinePreviews.map((u) => (
                    <div key={u} className={styles.inlineThumb}>
                      <img src={u} alt="본문 이미지 미리보기" />
                      <button
                        type="button"
                        className={styles.inlineRemove}
                        onClick={() => removeInline(u)}
                      >
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 카테고리 (폭 축소) */}
          <div className={styles.row}>
            <label className={styles.label} htmlFor="category">카테고리</label>
            <select
              id="category"
              className={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              <option value="internal">내부발표</option>
              <option value="external">외부발표</option>
            </select>
          </div>

          {/* 대표 이미지 파일 */}
          <div className={styles.rowCol}>
            <span className={styles.label}>이미지 파일</span>
            <div className={styles.fileLine}>
              <label className={styles.fileBtn}>
                파일 선택
                <input type="file" accept="image/*" onChange={onChangeFile} />
              </label>
              <span className={styles.fileName}>{file ? file.name : "선택된 파일 없음"}</span>
              {file && (
                <button type="button" className={styles.clearBtn} onClick={clearFile}>
                  취소
                </button>
              )}
            </div>

            {previewUrl && (
              <div className={styles.previewWrap}>
                <img className={styles.preview} src={previewUrl} alt="대표 이미지 미리보기" />
              </div>
            )}
          </div>

          {/* 액션 */}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={onCancel}>
              취소
            </button>
            <button type="submit" className={styles.primary} disabled={!canSubmit}>
              등록하기
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
