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
  type NewsUpdateBody,
  type NewsCategoryData,
  type NewsDetailResponse,
} from "../../../api/newsApi";

/* ================= 공통 유틸 ================= */

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

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getStringProp(obj: unknown, key: string): string | null {
  if (!isObject(obj)) return null;
  if (!(key in obj)) return null;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}
function unique(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of arr) if (!seen.has(u)) { seen.add(u); out.push(u); }
  return out;
}

/* ================= 이미지 유틸 ================= */

// raw <img>
const IMG_RAW_RE = /<img\s+[^>]*src=(?:"|')([^"'<>]+)(?:"|')[^>]*>/gi;
// escaped &lt;img ...&gt;
const IMG_ESC_RE = /&lt;img\b[\s\S]*?src=(?:"|&quot;)([^"'&<>]+)(?:"|&quot;)[\s\S]*?&gt;/gi;
// 확장자 붙은 URL
const URL_IMG_RE = /\bhttps?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|svg|bmp|tiff)(?:\?[^\s"'<>]*)?/gi;

const FIG_RAW_RE = /<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>\s*/gi;
const FIG_ESC_RE = /&lt;figure[^>]*&gt;[\s\S]*?&lt;img[^>]*&gt;[\s\S]*?&lt;\/figure&gt;\s*/gi;

const ALL_IMG_RAW_RE = /<img[^>]*>\s*/gi;
const ALL_IMG_ESC_RE = /&lt;img\b[\s\S]*?&gt;\s*/gi;

// HTML 엔티티 디코드
function decodeHtmlEntities(input: string): string {
  const ta = document.createElement("textarea");
  ta.innerHTML = input;
  return ta.value;
}

function extractImageSrcsFromText(html: string): string[] {
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IMG_RAW_RE.exec(html)) !== null) urls.push(m[1]);
  while ((m = IMG_ESC_RE.exec(html)) !== null) urls.push(m[1]);
  const urlMatches = html.match(URL_IMG_RE);
  if (urlMatches) urls.push(...urlMatches);
  return unique(urls);
}

/** 응답 객체 깊숙한 곳의 url/src/path 등을 느슨하게 수집 */
const URL_LIKE_KEYS = [
  "url", "src", "image_url", "file_url", "public_url", "cdn_url", "path",
  "original", "large", "medium", "small",
];

/** 이미지 후보 판별(확장자/dataURL/news-(content-img|thumbnail)만 허용) */
function isLikelyImageUrl(u: string): boolean {
  const s = u.trim().toLowerCase();
  if (!s) return false;
  return (
    s.startsWith("data:image") ||
    /\.(png|jpe?g|gif|webp|svg|bmp|tiff)(\?|$)/i.test(s) ||
    /\/?(news-(content-img|thumbnail)\/)/i.test(s) ||
    ((/^https?:\/\//.test(s) || s.startsWith("/")) && /(image|img|thumb|thumbnail|content)/i.test(s))
  );
}

/** 깊게 수집하되 isLikelyImageUrl 로만 통과 */
function pluckImageUrlsDeep(obj: unknown, depth = 0): string[] {
  if (depth > 6 || obj == null) return [];
  if (typeof obj === "string") return isLikelyImageUrl(obj) ? [obj] : [];
  if (Array.isArray(obj)) {
    let acc: string[] = [];
    for (const v of obj) acc = acc.concat(pluckImageUrlsDeep(v, depth + 1));
    return acc;
  }
  if (typeof obj === "object") {
    let acc: string[] = [];
    const rec = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) {
      const lk = k.toLowerCase();
      if (URL_LIKE_KEYS.includes(lk) && typeof v === "string" && isLikelyImageUrl(v)) {
        acc.push(v);
      }
      if (lk.includes("image") || lk.includes("img") || lk.includes("thumb") || lk.includes("thumbnail") || lk.includes("content")) {
        acc = acc.concat(pluckImageUrlsDeep(v, depth + 1));
      } else if (depth < 2) {
        acc = acc.concat(pluckImageUrlsDeep(v, depth + 1));
      }
    }
    return acc;
  }
  return [];
}

// 렌더 가능한 src 여부
function isRenderableSrc(u: string): boolean {
  const s = u.trim();
  return /^https?:\/\//i.test(s) || s.startsWith("data:image") || s.startsWith("/") || /news-(content-img|thumbnail)\//i.test(s);
}

/** 응답에서 CDN 베이스(origin) 유추 */
function deriveCdnBaseFromData(data: unknown): string | null {
  const candidates = unique([
    getStringProp(data, "thumbnail_url"),
    getStringProp(data, "image_url"),
    ...pluckImageUrlsDeep(data).filter((u) => /^https?:\/\//i.test(u)),
  ].filter(isNonEmptyString));

  const extractOriginFromAbsolute = (u: string): string | null => {
    const m = u.match(/^https?:\/\/[^/]+/i);
    return m ? m[0] : null;
  };

  for (const u of candidates) {
    const origin = extractOriginFromAbsolute(u);
    if (!origin) continue;
    if (/news-(content-img|thumbnail)\//i.test(u)) return origin;
    return origin;
  }
  return null;
}

// env 우선, 없으면 응답에서 유추
type MaybeEnv = { VITE_CDN_BASE?: string };
const maybeEnv = ((import.meta as unknown as { env?: MaybeEnv })?.env) ?? {};
const ENV_CDN_BASE = typeof maybeEnv.VITE_CDN_BASE === "string" ? maybeEnv.VITE_CDN_BASE : "";

// 키/상대경로 → 절대 URL
function toAbsoluteWithBase(u: string, baseHint: string | null): string {
  const raw = u.trim();
  if (raw.startsWith("data:image")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  const trimmed = raw.replace(/^\//, "");
  const keyLike = /^(news-(content-img|thumbnail)\/)/i.test(trimmed);

  const base = (ENV_CDN_BASE || "") || (keyLike ? (baseHint || "") : "");

  if (base && keyLike) return `${base.replace(/\/$/, "")}/${trimmed}`;
  return `/${trimmed}`;
}

function stripAllImages(html: string): string {
  return html
    .replace(FIG_RAW_RE, "")
    .replace(FIG_ESC_RE, "")
    .replace(ALL_IMG_RAW_RE, "")
    .replace(ALL_IMG_ESC_RE, "")
    .replace(URL_IMG_RE, "");
}

function buildImgBlock(urls: string[]): string {
  if (!urls.length) return "";
  return urls.map((u) => `<img src="${u}" alt="" />`).join("\n") + "\n\n";
}

/** 상세 응답에서 본문 문자열을 안전하게 추출 (`content` 우선, 다음 `body`) */
function pickContentString(detail: unknown): string {
  if (!isObject(detail)) return "";
  const obj = detail as Record<string, unknown>;
  const c = obj["content"];
  if (typeof c === "string") return c;

  const b = obj["body"];
  if (typeof b === "string") return b;
  if (Array.isArray(b)) {
    const parts = b.filter((v): v is string => typeof v === "string");
    return parts.join("\n\n");
  }
  return "";
}

/* ================= 컴포넌트 ================= */

export default function NewsEditPage() {
  const nav = useNavigate();
  const { news_seq } = useParams<{ news_seq?: string }>();

  const { auth } = useAuth();
  const isManager = auth.isAuthed && (auth.role === "ADMIN" || auth.role === "SUPER_ADMIN");

  const warnedRef = useRef(false);

  const id = useMemo<number | null>(() => {
    const n = Number(news_seq);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [news_seq]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [author, setAuthor] = useState("관리자");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<UiCategory>("internal");
  const [badge, setBadge] = useState("");

  // 대표 이미지(썸네일)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originImageUrl, setOriginImageUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 본문 업로드 이미지(미리보기) — 단일만 허용
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const [inlinePreviews, setInlinePreviews] = useState<string[]>([]);

  /* ─ 접근 가드 ─ */
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

        const data: NewsDetailResponse = await getNewsDetail(id);
        if (aborted) return;

        setTitle(data.title);
        setExcerpt(data.excerpt ?? "");
        setCategory(toUiCategory(data.category));
        setBadge(data.badge ?? "");

        // 썸네일
        const thumb = getStringProp(data, "thumbnail_url");
        setOriginImageUrl(thumb);
        setPreviewUrl(thumb);
        setImageKey(null);

        // CDN 베이스 유추(ENV > 데이터)
        const baseHint = deriveCdnBaseFromData(data);

        // 1) 데이터/본문에서 이미지 URL 수집 → 절대 URL화
        const byPluckAbs = unique(
          pluckImageUrlsDeep(data)
            .filter(isRenderableSrc)
            .map((u) => toAbsoluteWithBase(u, baseHint))
        );
        const bodyStr = pickContentString(data);
        const decoded = decodeHtmlEntities(bodyStr);
        const fromBodyAbs = unique([
          ...extractImageSrcsFromText(bodyStr),
          ...extractImageSrcsFromText(decoded),
        ])
          .filter(isRenderableSrc)
          .map((u) => toAbsoluteWithBase(u, baseHint));

        const initialInline = unique([...byPluckAbs, ...fromBodyAbs]);

        // 썸네일(대표 이미지) 제외 + 단일만 유지
        const thumbAbsNoQuery =
          thumb ? toAbsoluteWithBase(thumb, baseHint).split("?")[0].toLowerCase() : null;
        const thumbFile =
          thumbAbsNoQuery ? thumbAbsNoQuery.split("/").pop() ?? null : null;

        const onlyContent = initialInline.filter((u) => {
          const sNoQuery = u.split("?")[0].toLowerCase();
          if (/\/news-thumbnail\//i.test(sNoQuery)) return false; // 썸네일 경로 제외
          if (thumbAbsNoQuery && sNoQuery === thumbAbsNoQuery) return false; // 동일 URL 제외
          if (thumbFile && sNoQuery.endsWith(`/${thumbFile}`)) return false; // 파일명 같으면 제외
          return true;
        });

        setInlinePreviews(onlyContent.slice(0, 1)); // 본문 이미지는 1개만 허용
        setContent(stripAllImages(bodyStr));
      } catch (e: unknown) {
        if (aborted) return;
        setErrorMsg(getErrorMessage(e) || "해당 기사를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [id, auth.isAuthed, isManager, nav]);

  /* ========= 업로드 유틸 ========= */

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
      if (isNonEmptyString(public_url)) setPreviewUrl(public_url);
    } finally {
      setUploading(false);
    }
  };

  /** 본문 이미지(단일) 업로드 – kind=content */
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
      return isNonEmptyString(public_url) ? public_url : null;
    } catch (err) {
      console.error(err);
      alert(getErrorMessage(err) || `"${f.name}" 업로드에 실패했습니다.`);
      return null;
    }
  };

  /* ========= 이벤트 ========= */

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

  // 본문 이미지 선택 → 단일 업로드
  const onPickInline: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (inlinePreviews.length >= 1) {
      alert("본문 이미지는 1개만 업로드할 수 있습니다. 기존 이미지를 제거한 후 다시 시도하세요.");
      e.target.value = "";
      return;
    }

    const first = files[0];
    const url = await uploadOneInlineImage(first);
    if (url) setInlinePreviews([url]); // 항상 1개 유지
    e.target.value = "";
  };

  // 본문 이미지 제거
  const removeInline = (url: string) => {
    setInlinePreviews((prev) => prev.filter((u) => u !== url));
  };

  const canSubmit = useMemo(
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

      const cleanedTop = content.replace(/^(?:<img\b[^>]*>\s*|&lt;img[^>]*&gt;\s*)+/i, "");
      const finalContent = buildImgBlock(inlinePreviews) + cleanedTop;

      const body: NewsUpdateBody = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: finalContent,
        category: toServerCategory(category),
        badge: badge.trim(),
        image_key: imageKey ?? undefined,
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

  /* ===== 렌더링 가드 ===== */
  if (!auth.isAuthed || !isManager) return null;

  if (id == null) {
    return (
      <section className={styles.section} aria-label="게시글 수정">
        <div className={styles.wrap}>
          <h1 className={styles.title}>게시글 수정</h1>
          <div>
            <p>잘못된 접근입니다.</p>
            <Link className={styles.smallBtn} to="/media">목록으로</Link>
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
            <Link className={styles.smallBtn} to="/media">목록으로</Link>
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
                <button type="button" className={styles.smallBtn} onClick={() => inlineInputRef.current?.click()}>
                  이미지 첨부
                </button>
                {/* 기본 파일 입력을 숨겨 중복 버튼 제거, 단일만 허용 */}
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
                placeholder="본문을 입력하세요. 업로드한 이미지는 저장 시 본문 맨 위에 자동 배치됩니다."
              />

              {/* ▶ 본문 이미지 미리보기(썸네일 제외, 1개만) */}
              {inlinePreviews.length > 0 && (
                <div className={styles.inlinePreviewList}>
                  {inlinePreviews.map((u, i) => (
                    <div key={u} className={styles.inlineThumb}>
                      <img src={u} alt={`본문 이미지 ${i + 1}`} />
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
            <label className={styles.label} htmlFor="category">카테고리</label>
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
                {uploading ? "업로드 중..." : file ? file.name : "교체하지 않으면 기존 이미지 유지"}
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
              {saving ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
