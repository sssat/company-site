// src/pages/PublicPage/MediaPage/NewsCreatePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NewsCreatePage.module.css";
import { useAuth } from "../../../hooks/useAuth";
import {
  createNews,
  type NewsCreateBody,
  type NewsCategoryData,
  getNewsUploadUrl,
  uploadToS3Put,
} from "../../../api/newsApi";

type Category = "internal" | "external";

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "오류가 발생했습니다.";
}

function basenameFromUrl(u: string): string {
  try {
    const p = new URL(u).pathname;
    const name = p.split("/").pop() ?? "";
    return decodeURIComponent(name.split("?")[0]);
  } catch {
    return "";
  }
}

export default function NewsCreatePage() {
  const nav = useNavigate();

  const { auth } = useAuth();
  const isAuthenticated = auth.isAuthed;
  const role = auth.role;
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  const warnedRef = useRef(false);

  const [author, setAuthor] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [excerpt, setExcerpt] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [category, setCategory] = useState<Category>("internal");
  const [badge, setBadge] = useState<string>("");

  // 썸네일
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // 본문 이미지(1개 제한)
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [inlinePreviews, setInlinePreviews] = useState<string[]>([]);

  const [saving, setSaving] = useState<boolean>(false);

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

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo<boolean>(() => {
    return (
      title.trim() !== "" &&
      excerpt.trim() !== "" &&
      content.trim() !== "" &&
      badge.trim() !== ""
    );
  }, [title, excerpt, content, badge]);

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

  const uploadOneInlineImage = async (f: File): Promise<string | null> => {
    const max = 10 * 1024 * 1024;
    if (f.size > max) {
      alert(`"${f.name}"은(는) 10MB를 초과합니다.`);
      return null;
    }
    try {
      const { upload_url, public_url, content_type } = await getNewsUploadUrl(
        f.name,
        f.type || "application/octet-stream",
        "content"
      );
      await uploadToS3Put(upload_url, f, content_type);
      return public_url ?? null;
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err) || `"${f.name}" 업로드에 실패했습니다.`);
      return null;
    }
  };

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

  const onPickInline: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (inlinePreviews.length >= 1) {
      alert("본문 이미지는 1개만 업로드할 수 있습니다. 기존 이미지를 제거한 후 다시 시도하세요.");
      e.target.value = "";
      return;
    }

    const first = files[0];
    const publicUrl = await uploadOneInlineImage(first);
    if (publicUrl) {
      setInlinePreviews([publicUrl]);
    }
    e.target.value = "";
  };

  const removeInline = (url: string) => {
    setInlinePreviews((prev) => prev.filter((u) => u !== url));
  };

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

      const imagesHtmlTop = inlinePreviews
        .map((u) => `<img src="${u}" alt="${basenameFromUrl(u)}" />`)
        .join("\n");
      const finalContent =
        imagesHtmlTop.trim().length > 0 ? `${imagesHtmlTop}\n\n${content}` : content;

      const body: NewsCreateBody = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: finalContent,
        category: serverCategory,
        badge: badge.trim(),
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

  if (!isAuthenticated || !isManager) return null;

  return (
    <section className={styles.section} aria-label="게시글 등록">
      <div className={styles.wrap}>
        <h1 className={styles.title}>게시글 등록</h1>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="author">작성자</label>
            <input id="author" className={styles.input} value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="title">제목</label>
            <input id="title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

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

          <div className={styles.rowCol}>
            <label className={styles.label} htmlFor="content">내용</label>
            <div>
              <div className={styles.editorBar}>
                <button type="button" className={styles.smallBtn} onClick={openInlinePicker}>
                  이미지 첨부
                </button>
                {/* ▼ 기본 파일 입력을 숨겨 중복 버튼(파일 선택) 제거 */}
                <input
                  ref={inlineInputRef}
                  type="file"
                  accept="image/*"
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
                      <button type="button" className={styles.inlineRemove} onClick={() => removeInline(u)}>
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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

          <div className={styles.row}>
            <label className={styles.label} htmlFor="badge">배지</label>
            <input
              id="badge"
              className={styles.input}
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="예: NEWS, UPDATE 등"
            />
          </div>

          <div className={styles.rowCol}>
            <span className={styles.label}>썸네일</span>
            <div className={styles.fileLine}>
              <label className={styles.fileBtn}>
                파일 선택
                <input type="file" accept="image/*" onChange={onChangeFile} />
              </label>
              <span className={styles.fileName}>
                {uploading ? "업로드 중..." : file ? file.name : "선택된 파일 없음"}
              </span>
              {(file || imageKey) && (
                <button type="button" className={styles.clearBtn} onClick={clearFile} disabled={uploading}>
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
            <button type="button" className={styles.ghost} onClick={onCancel} disabled={saving || uploading}>
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
