/// <reference types="vite/client" />

// Build-time settings read from .env.local (locally) or the hosting platform (in production).
// Everything prefixed VITE_ is bundled into the public JavaScript, so only public values belong here.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (sb_publishable_...). Safe to expose in the browser. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Legacy alternative to the publishable key (the JWT-style "anon" key). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
