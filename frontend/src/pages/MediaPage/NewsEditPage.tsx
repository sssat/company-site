import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styles from "../MediaPage/NewsCreatePage.module.css";
import { useAuth } from "../../hooks/useAuth";
import { NEWS } from "../../components/MediaOnly/newsData";

// 등록/목록에서 쓰던 타입을 기반으로 편집에 필요한 필드만 보강
type BaseItem = (typeof NEWS)[number];
type EditableExtras = {
  author?: string;
  content?: string; // 본문(데모 데이터에는 없을 수 있어 optional)
};
type EditableItem = BaseItem & EditableExtras;
type Category = "internal" | "external";

export default function NewsEditPage() {
  const nav = useNavigate();
  const { slug = "" } = useParams();

  // 권한 확인 훅 (항상 최상단에서 호출)
  const { isAuthenticated, role } = useAuth();
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  // 수정 대상 기사 (항상 훅 호출 후 메모이즈)
  const original = useMemo<EditableItem | undefined>(
    () => (NEWS.find((n) => n.slug === slug) as EditableItem | undefined),
    [slug]
  );

  // 접근 제어: 훅은 호출하고, 이동만 효과에서 처리
  useEffect(() => {
    if (!isManager) {
      alert("관리자만 접근할 수 있습니다.");
      nav("/media", { replace: true });
    }
  }, [isManager, nav]);

  // 본문 기본값: original.content → 없으면 body를 합쳐서 → 마지막으로 빈문자열
  const initialContent =
    original?.content ??
    (Array.isArray(original?.body) ? original!.body.join("\n\n") : "") ??
    "";

  // 훅은 항상 호출되어야 하므로 원본이 없어도 기본값으로 초기화
  const [author, setAuthor] = useState<string>(original?.author ?? "관리자");
  const [title, setTitle] = useState<string>(original?.title ?? "");
  const [excerpt, setExcerpt] = useState<string>(original?.excerpt ?? ""); // ✅ 요약 추가
  const [content, setContent] = useState<string>(initialContent);
  const [category, setCategory] = useState<Category>((original?.category as Category) ?? "internal");

  // 대표 이미지(교체 가능)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(original?.image ?? null);

  // 본문 이미지 삽입(텍스트에 <img> 추가)
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const [inlinePreviews, setInlinePreviews] = useState<string[]>([]);

  // blob URL 정리
  useEffect(() => {
    return () => {
      inlinePreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [inlinePreviews]);

  // 대표 이미지 교체 미리보기
  const onChangeFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(original?.image ?? null);
    }
  };
  const clearFile = () => {
    setFile(null);
    setPreviewUrl(original?.image ?? null);
  };

  // 본문 이미지 삽입
  const openInlinePicker = () => inlineInputRef.current?.click();

  const insertAtCursor = (text: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setContent((p) => p + text);
      return;
    }
    const s = ta.selectionStart ?? ta.value.length;
    const e = ta.selectionEnd ?? ta.value.length;
    const next = ta.value.slice(0, s) + text + ta.value.slice(e);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const caret = s + text.length;
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
      markup += `<img src="${url}" alt="${f.name}" />\n`;
    }
    if (markup) {
      insertAtCursor(markup);
      setInlinePreviews((prev) => [...prev, ...urls]);
    }
    e.target.value = "";
  };

  const removeInline = (url: string) => {
    // 단순 치환(데모)
    setContent((c) => c.replace(new RegExp(`<img\\s+src="${url}".*?>\\s*`, "g"), ""));
    setInlinePreviews((prev) => prev.filter((u) => u !== url));
    URL.revokeObjectURL(url);
  };

  // 유효성 (요약 포함)
  const canSubmit = useMemo(
    () => Boolean(author.trim() && title.trim() && excerpt.trim() && content.trim()),
    [author, title, excerpt, content]
  );

  // 저장(데모)
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!canSubmit) {
      alert("작성자, 제목, 요약, 내용을 모두 입력해주세요.");
      return;
    }

    // 실제 환경에서는 PUT /media/:slug 로 FormData 전송
    alert(
      [
        "수정 완료(샘플):",
        `작성자: ${author}`,
        `제목: ${title}`,
        `요약: ${excerpt}`,
        `카테고리: ${category === "internal" ? "내부발표" : "외부발표"}`,
        file ? `대표 이미지 교체: ${file.name}` : "대표 이미지: 기존 유지",
      ].join("\n")
    );
    nav(`/media/${slug}`, { replace: true });
  };

  const onCancel = () => nav(-1);

  // 조기 return 금지 → JSX 내부에서 조건부 출력
  const notFound = !original;

  return (
    <section className={styles.section} aria-label="게시글 수정">
      <div className={styles.wrap}>
        <h1 className={styles.title}>게시글 수정</h1>

        {notFound ? (
          <div>
            <p>해당 기사를 찾을 수 없습니다.</p>
            <Link className={styles.smallBtn} to="/media">
              목록으로
            </Link>
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            {/* 작성자 */}
            <div className={styles.row}>
              <label className={styles.label} htmlFor="author">작성자</label>
              <input
                id="author"
                className={styles.input}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
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
              />
            </div>

            {/* ✅ 요약 */}
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

            {/* 내용 + 이미지 첨부 */}
            <div className={styles.rowCol}>
              <label className={styles.label} htmlFor="content">내용</label>
              <div>
                <div className={styles.editorBar}>
                  <button type="button" className={styles.smallBtn} onClick={openInlinePicker}>
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

            {/* 카테고리 */}
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

            {/* 대표 이미지 (기존/교체) */}
            <div className={styles.rowCol}>
              <span className={styles.label}>대표 이미지</span>
              <div className={styles.fileLine}>
                <label className={styles.fileBtn}>
                  파일 선택
                  <input type="file" accept="image/*" onChange={onChangeFile} />
                </label>
                <span className={styles.fileName}>
                  {file ? file.name : "교체하지 않으면 기존 이미지 유지"}
                </span>
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
                수정하기
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
