// src/contexts/AuthProvider.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ctx, type Auth } from "../contexts/AuthContext";
import {
  login as apiLogin,
  logout as apiLogout,
  refreshAccess,
  type Role,
} from "../api/accountsApi";
import { setAccessToken } from "../lib/axios";

/** 로컬스토리지 키 (부팅 복구용) */
const LS_ROLE = "auth.role";
const LS_USERSEQ = "auth.userSeq";
const LS_USERID = "auth.userId";
const LS_USERNAME = "auth.userName";

const DEFAULT_AUTH: Auth = {
  isAuthed: false,
  role: null,
  userSeq: null,
  userId: null,
  userName: null,
};

function loadAuthFromLS(): Auth {
  const roleRaw = localStorage.getItem(LS_ROLE);
  const role: Role | null = (roleRaw as Role | null) ?? null;

  const userSeqRaw = localStorage.getItem(LS_USERSEQ);
  const userSeq = userSeqRaw ? Number(userSeqRaw) : null;

  const userId = localStorage.getItem(LS_USERID);
  const userName = localStorage.getItem(LS_USERNAME);

  if (role && userSeq !== null && userId) {
    return {
      isAuthed: true,
      role,
      userSeq,
      userId,
      userName: userName ?? null,
    };
  }
  return DEFAULT_AUTH;
}

function clearAuthLS(): void {
  localStorage.removeItem(LS_ROLE);
  localStorage.removeItem(LS_USERSEQ);
  localStorage.removeItem(LS_USERID);
  localStorage.removeItem(LS_USERNAME);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // 초기 렌더 전에 localStorage로 즉시 복원 (깜빡임/잘못된 리다이렉트 방지)
  const [auth, setAuth] = useState<Auth>(() => loadAuthFromLS());

  // 앱 부팅: refresh 쿠키로 access 재발급 확인
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const access = await refreshAccess(); // /api/auth/refresh (withCredentials)
        if (!alive) return;

        if (access) {
          setAccessToken(access);
          // 최신 프로필을 LS에서 다시 읽어 반영(로그인 시 저장해둔 값)
          const restored = loadAuthFromLS();
          setAuth({ ...restored, isAuthed: true });
        } else {
          // refresh 없음/만료
          setAccessToken(null);
          clearAuthLS();
          setAuth(DEFAULT_AUTH);
        }
      } catch {
        if (!alive) return;
        setAccessToken(null);
        clearAuthLS();
        setAuth(DEFAULT_AUTH);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    // 서버 응답 명세: { access, user_seq, user_id, user_name, role }
    const {
      access,
      user_seq,
      user_id: userId,
      user_name: userName,
      role,
    } = await apiLogin(loginId, password);

    setAccessToken(access);

    // 부팅 복구용 최소 프로필 저장
    localStorage.setItem(LS_ROLE, role);
    localStorage.setItem(LS_USERSEQ, String(user_seq));
    localStorage.setItem(LS_USERID, userId);
    if (userName) localStorage.setItem(LS_USERNAME, userName);
    else localStorage.removeItem(LS_USERNAME);

    setAuth({
      isAuthed: true,
      role,
      userSeq: user_seq,
      userId,
      userName: userName ?? null,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout(); // 서버에서 refresh 쿠키 삭제
    } finally {
      setAccessToken(null);
      clearAuthLS();
      setAuth(DEFAULT_AUTH);
    }
  }, []);

  const value = useMemo(() => ({ auth, login, logout }), [auth, login, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
