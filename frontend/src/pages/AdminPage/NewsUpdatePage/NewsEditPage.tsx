// src/pages/AdminPage/NewsUpdatePage/NewsEditPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import styles from "./NewsCreatePage.module.css";
import { useAuth } from "../../../hooks/useAuth";
import {
  getNewsDetail,
  updateNews,
  getNewsUploadUrl,
  uploadToS3Put,
  type NewsDetailResponse,
  type NewsUpdateBody,
  type NewsCategoryData, // 데이터 타입 사용
} from "../../../api/newsApi";

type UiCategory = "internal" | "external";
const toUiCategory = (s: NewsCategoryData): UiCategory =>
  s === "INTERNAL" ? "internal" : "external";
const toServerCategory = (u: UiCategory): NewsCategoryData =>
  u === "internal" ? "INTERNAL" : "EXTERNAL";

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "오류가 발생했습니다.";
}

export default function NewsEditPage() {
  const nav = useNavigate();
  const { news_seq } = useParams<{ news_seq?: string }>();

  const { auth } = useAuth();
  const isManager =
    auth.isAuthed && (auth.role === "ADMIN" || auth.role === "SUPER_ADMIN");

  // 중복 alert 방지
  const warnedRef = useRef(false);

  const id = useMemo<number | null>(() => {
    const n = Number(news_seq);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [news_seq]);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [original, setOriginal] = useState<NewsDetailResponse | null>(null);

  const [author, setAuthor] = useState<string>("관리자");
  const [title, setTitle] = useState<string>("");
  const [excerpt, setExcerpt] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [category, setCategory] = useState<UiCategory>("internal");
  const [badge, setBadge] = useState<string>("");

  // 대표 이미지
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originImageUrl, setOriginImageUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // 본문 이미지(프리뷰)
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const [inlinePreviews, setInlinePreviews] = useState<string[]>([]);

  /* ─ 접근 가드: 빈 화면 + alert 후 이동 ─ */
  useEffect(() => {
    if (warnedRef.current) return;
    if (!auth.isAuthed) {
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
  }, [auth.isAuthed, isManager, nav]);

  /* ─ 상세 불러오기 ─ */
  useEffect(() => {
    // 비인가면 호출 자체를 막음
    if (!auth.isAuthed || !isManager) return;

    if (id == null) {
      setErrorMsg("잘못된 접근입니다.");
      return;
    }
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const data = await getNewsDetail(id);
        if (aborted) return;

        setOriginal(data);
        setTitle(data.title);
        setExcerpt(data.excerpt ?? "");
        // 서버는 body 배열 → 편집은 문자열로
        setContent(Array.isArray(data.body) ? data.body.join("\n\n") : "");
        setCategory(toUiCategory(data.category));
        setBadge(data.badge ?? "");

        const hero = data.image_url || data.thumbnail_url || null;
        setOriginImageUrl(hero);
        setPreviewUrl(hero);
        setImageKey(null);
      } catch (e: unknown) {
        if (aborted) return;
        setErrorMsg(getErrorMessage(e) || "해당 기사를 불러오는 중 오류가 발생했습니다.");
        setOriginal(null);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id, auth.isAuthed, isManager]);

  useEffect(() => {
    return () => {
      inlinePreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [inlinePreviews]);

  /* ========= 업로드 유틸 ========= */

  /** 대표 이미지(썸네일) presign → PUT */
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

  /** 본문 이미지 업로드: kind=content, 업로드 후 본문에 삽입 */
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

  /* ========= 이벤트 ========= */

  // 대표 이미지 교체(선택 즉시 업로드)
  const onChangeFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f: File | null = e.target.files?.[0] ?? null;
    setFile(f);
    setImageKey(null);

    if (f) {
      const tmpUrl = URL.createObjectURL(f);
      setPreviewUrl(tmpUrl);
      try {
        await uploadCoverToS3(f);
      } catch (err: unknown) {
        console.error(err);
        alert(getErrorMessage(err) || "이미지 업로드에 실패했습니다.");
        setFile(null);
        setImageKey(null);
        setPreviewUrl(originImageUrl);
      } finally {
        URL.revokeObjectURL(tmpUrl);
      }
    } else {
      setPreviewUrl(originImageUrl);
    }
  };

  const clearFile = () => {
    setFile(null);
    setImageKey(null);
    setPreviewUrl(originImageUrl);
  };

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
    // public_url은 objectURL이 아니므로 revokeObjectURL은 생략 가능
  };

  // ✅ 제목/요약/내용/배지 모두 필수 (괄호 수정)
  const canSubmit = useMemo<boolean>(
    () =>
      Boolean(
        title.trim() !== "" &&
          excerpt.trim() !== "" &&
          content.trim() !== "" &&
          badge.trim() !== ""
      ),
    [title, excerpt, content, badge]
  );

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!canSubmit || id == null || saving) {
      if (!badge.trim()) alert("배지는 필수 항목입니다.");
      return;
    }

    try {
      setSaving(true);

      // 아직 key가 없다면 마지막으로 업로드 시도
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

      const body: NewsUpdateBody = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        category: toServerCategory(category),
        badge: badge.trim(), // 필수
        image_key: imageKey ?? undefined, // 교체 시에만 전달
      };

      await updateNews(id, body);
      alert("수정이 완료되었습니다.");
      nav(`/media/${id}`, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      alert(getErrorMessage(err) || "수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => nav(-1);

  /* ===== 비인가 사용자는 빈 화면 ===== */
  if (!auth.isAuthed || !isManager) {
    return null;
  }

  /* ===== 렌더링 가드 ===== */
  if (id == null) {
    return (
      <section className={styles.section} aria-label="게시글 수정">
        <div className={styles.wrap}>
          <h1 className={styles.title}>게시글 수정</h1>
          <div>
            <p>잘못된 접근입니다.</p>
            <Link className={styles.smallBtn} to="/media">
              목록으로
            </Link>
          </div>
        </div>
      </section>
    );
  }
  if (loading) {
    return (
      <section className={styles.section} aria-label="게시글 수정">
        <div className={styles.wrap}>
          <h1 className={styles.title}>게시글 수정</h1>
          <div>불러오는 중…</div>
        </div>
      </section>
    );
  }
  if (errorMsg) {
    return (
      <section className={styles.section} aria-label="게시글 수정">
        <div className={styles.wrap}>
          <h1 className={styles.title}>게시글 수정</h1>
          <div>
            <p>{errorMsg}</p>
            <Link className={styles.smallBtn} to="/media">
              목록으로
            </Link>
          </div>
        </div>
      </section>
    );
  }
  if (!original) {
    return (
      <section className={styles.section} aria-label="게시글 수정">
        <div className={styles.wrap}>
          <h1 className={styles.title}>게시글 수정</h1>
          <div>
            <p>해당 기사를 찾을 수 없습니다.</p>
            <Link className={styles.smallBtn} to="/media">
              목록으로
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* ===== 폼 ===== */
  return (
    <section className={styles.section} aria-label="게시글 수정">
      <div className={styles.wrap}>
        <h1 className={styles.title}>게시글 수정</h1>

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
                  onClick={() => inlineInputRef.current?.click()}
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
              onChange={(e) => setCategory(e.target.value as UiCategory)}
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
            <span className={styles.label}>대표 이미지</span>
            <div className={styles.fileLine}>
              <label className={styles.fileBtn}>
                파일 선택
                <input type="file" accept="image/*" onChange={onChangeFile} />
              </label>
              <span className={styles.fileName}>
                {uploading
                  ? "업로드 중..."
                  : file
                  ? file.name
                  : "교체하지 않으면 기존 이미지 유지"}
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
                <img
                  className={styles.preview}
                  src={previewUrl}
                  alt="대표 이미지 미리보기"
                />
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
              {saving ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
