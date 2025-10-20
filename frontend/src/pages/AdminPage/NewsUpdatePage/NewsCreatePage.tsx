// src/pages/PublicPage/MediaPage/NewsCreatePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NewsCreatePage.module.css";
import { useAuth } from "../../../hooks/useAuth";
import {
  createNews,
  type NewsCreateBody,
  type NewsCategoryData, // 데이터 타입만 사용
  getNewsUploadUrl,
  uploadToS3Put,
} from "../../../api/newsApi";

type Category = "internal" | "external";

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "오류가 발생했습니다.";
}

export default function NewsCreatePage() {
  const nav = useNavigate();

  // ── 권한
  const { auth } = useAuth();
  const isAuthenticated = auth.isAuthed;
  const role = auth.role;
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  // ── (중복 alert 방지용) 경고 여부
  const warnedRef = useRef(false);

  // ── 폼 상태
  const [author, setAuthor] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [excerpt, setExcerpt] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [category, setCategory] = useState<Category>("internal");
  const [badge, setBadge] = useState<string>(""); // 필수: 비어있으면 제출 불가

  // ── 대표 이미지 업로드(썸네일)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // ── 본문 이미지
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [inlinePreviews, setInlinePreviews] = useState<string[]>([]); // public_url 목록

  // ── 제출 로딩
  const [saving, setSaving] = useState<boolean>(false);

  // ── 접근 가드: 빈 화면 + alert 후 리다이렉트 (StrictMode 중복 방지)
  useEffect(() => {
    if (warnedRef.current) return;
    if (!isAuthenticated) {
      warnedRef.current = true;
      alert("로그인이 필요합니다.");
      nav("/login", { replace: true });
      return;
    }
    if (!isManager) {
      warnedRef.current = true;
      alert("관리자만 접근할 수 있습니다.");
      nav("/media", { replace: true });
    }
  }, [isAuthenticated, isManager, nav]);

  // ── 로컬 선택 시 임시 미리보기(대표 이미지 전용)
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ── 배지 포함 필수값 체크
  const canSubmit = useMemo<boolean>(() => {
    return (
      title.trim() !== "" &&
      excerpt.trim() !== "" &&
      content.trim() !== "" &&
      badge.trim() !== ""
    );
  }, [title, excerpt, content, badge]);

  /* ===================== 업로드 유틸 ===================== */

  /** 대표 이미지(썸네일) 업로드: 항상 kind=thumbnail */
  const uploadCoverToS3 = async (f: File) => {
    const max = 10 * 1024 * 1024;
    if (f.size > max) throw new Error("이미지 용량은 10MB 이하만 업로드할 수 있습니다.");

    setUploading(true);
    try {
      const { upload_url, key, public_url, content_type } = await getNewsUploadUrl(
        f.name,
        f.type || "application/octet-stream",
        "thumbnail"
      );
      await uploadToS3Put(upload_url, f, content_type);
      setImageKey(key);
      if (public_url) setPreviewUrl(public_url);
    } finally {
      setUploading(false);
    }
  };

  /** 본문 이미지 업로드: 항상 kind=content, 업로드 후 본문에 <img src="public_url"> 삽입 */
  const uploadInlineImages = async (files: FileList) => {
    for (const f of Array.from(files)) {
      const max = 10 * 1024 * 1024;
      if (f.size > max) {
        alert(`"${f.name}"은(는) 10MB를 초과합니다.`);
        continue;
      }
      try {
        const { upload_url, public_url, content_type } = await getNewsUploadUrl(
          f.name,
          f.type || "application/octet-stream",
          "content"
        );
        await uploadToS3Put(upload_url, f, content_type);
        insertAtCursor(`<img src="${public_url}" alt="${f.name}" />\n`);
        setInlinePreviews((prev) => [...prev, public_url]);
      } catch (err) {
        console.error(err);
        alert(getErrorMessage(err) || `"${f.name}" 업로드에 실패했습니다.`);
      }
    }
  };

  /* ===================== 이벤트 핸들러 ===================== */

  // 대표 이미지 선택
  const onChangeFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const next: File | null =
      e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
    setFile(next);
    setImageKey(null);
    if (next) {
      try {
        await uploadCoverToS3(next);
      } catch (err: unknown) {
        console.error(err);
        alert(getErrorMessage(err) || "이미지 업로드에 실패했습니다.");
        setFile(null);
        setImageKey(null);
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setImageKey(null);
    setPreviewUrl(null);
  };

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

  // 본문 이미지 선택 → 업로드 후 본문 삽입
  const onPickInline: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadInlineImages(files);
    e.target.value = "";
  };

  const removeInline = (url: string) => {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    setContent((c) =>
      c.replace(new RegExp(`<img\\s+src="${escaped}"[^>]*>\\s*`, "g"), "")
    );
    setInlinePreviews((prev) => prev.filter((u) => u !== url));
  };

  /* ===================== 제출 ===================== */

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!canSubmit || saving) {
      if (badge.trim() === "") alert("배지는 필수 항목입니다.");
      return;
    }

    try {
      setSaving(true);

      const serverCategory: NewsCategoryData =
        category === "internal" ? "INTERNAL" : "EXTERNAL";
      const badgeTrimmed = badge.trim();

      if (file && !imageKey && !uploading) {
        try {
          await uploadCoverToS3(file);
        } catch (err: unknown) {
          console.error(err);
          alert(getErrorMessage(err) || "대표 이미지 업로드에 실패했습니다.");
          setSaving(false);
          return;
        }
      }

      const body: NewsCreateBody = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        category: serverCategory,
        badge: badgeTrimmed, // 필수값
        image_key: imageKey ?? null,
      };

      const res = await createNews(body);
      alert("등록이 완료되었습니다.");
      nav(`/media/${res.news_seq}`, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => nav(-1);

  // ── 권한 없으면 빈 화면 (훅은 위에서 항상 호출됨)
  if (!isAuthenticated || !isManager) {
    return null;
  }

  return (
    <section className={styles.section} aria-label="게시글 등록">
      <div className={styles.wrap}>
        <h1 className={styles.title}>게시글 등록</h1>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="author">
              작성자
            </label>
            <input
              id="author"
              className={styles.input}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="title">
              제목
            </label>
            <input
              id="title"
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.rowCol}>
            <label className={styles.label} htmlFor="excerpt">
              요약
            </label>
            <textarea
              id="excerpt"
              className={`${styles.textarea} ${styles.excerptBox}`}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="목록 카드에 표시될 한두 문장을 입력하세요."
            />
          </div>

          <div className={styles.rowCol}>
            <label className={styles.label} htmlFor="content">
              내용
            </label>
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

          <div className={styles.row}>
            <label className={styles.label} htmlFor="category">
              카테고리
            </label>
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

          <div className={styles.row}>
            <label className={styles.label} htmlFor="badge">
              배지
            </label>
            <input
              id="badge"
              className={styles.input}
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="예: NEWS, UPDATE 등"
            />
          </div>

          <div className={styles.rowCol}>
            <span className={styles.label}>이미지 파일(대표)</span>
            <div className={styles.fileLine}>
              <label className={styles.fileBtn}>
                파일 선택
                <input type="file" accept="image/*" onChange={onChangeFile} />
              </label>
              <span className={styles.fileName}>
                {uploading ? "업로드 중..." : file ? file.name : "선택된 파일 없음"}
              </span>
              {(file || imageKey) && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={clearFile}
                  disabled={uploading}
                >
                  취소
                </button>
              )}
            </div>

            {previewUrl && (
              <div className={styles.previewWrap}>
                <img className={styles.preview} src={previewUrl} alt="대표 이미지 미리보기" />
                {imageKey && <p className={styles.keyNote}>이미지 업로드 완료 ✓</p>}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={onCancel}
              disabled={saving || uploading}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.primary}
              disabled={!canSubmit || saving || uploading}
              title={!canSubmit ? "제목/요약/내용/배지를 모두 입력하세요." : undefined}
            >
              {saving ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
