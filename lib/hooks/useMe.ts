'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserRole } from '@/lib/types';

export interface MeUser {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  gender?: string;
  birthday?: string;
  role: UserRole;
  createdAt?: string;
}

type MeCacheValue = MeUser | null | undefined;

let meCache: MeCacheValue = undefined;
let inflight: Promise<MeUser | null> | null = null;

async function fetchMe(): Promise<MeUser | null> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const result = await response.json();

      if (result?.success) {
        meCache = result.data as MeUser;
        return meCache;
      }

      meCache = null;
      return null;
    } catch {
      // 网络错误时：如果已有缓存，就继续用缓存；否则视为未登录
      if (meCache !== undefined) {
        return (meCache ?? null) as MeUser | null;
      }
      meCache = null;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function getMeCache(): MeCacheValue {
  return meCache;
}

export function clearMeCache() {
  meCache = null;
  inflight = null;
}

export function useMe(options?: { revalidate?: boolean }) {
  const revalidate = options?.revalidate ?? true;

  const [user, setUser] = useState<MeUser | null>(() => {
    const cached = getMeCache();
    return cached === undefined ? null : cached;
  });
  const [loading, setLoading] = useState(() => getMeCache() === undefined);

  const refresh = useCallback(async () => {
    meCache = undefined;
    setLoading(true);
    const next = await fetchMe();
    setUser(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const cached = getMeCache();

      // 有缓存：立即同步到 state（无感切页），再后台校验
      if (cached !== undefined) {
        setUser(cached ?? null);
        setLoading(false);
        if (!revalidate) return;
      } else {
        setLoading(true);
      }

      const next = await fetchMe();
      if (cancelled) return;

      setUser(next);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [revalidate]);

  return { user, loading, refresh };
}
