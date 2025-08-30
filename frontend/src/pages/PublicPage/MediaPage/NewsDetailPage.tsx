import { useEffect } from "react";
import { useParams } from "react-router-dom";
import NewsDetail from "../../../components/MediaOnly/NewsDetail";

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug?: string }>();

  // 상세 진입 시 항상 화면 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  // 간단한 문서 타이틀 세팅 (필요 시 더 풍부하게)
  useEffect(() => {
    document.title = slug ? `뉴스룸 | ${slug}` : "뉴스룸";
  }, [slug]);

  return <NewsDetail />;
}
