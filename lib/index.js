import https from "node:https";

// ---------------------------------------------------------------------------
// Netease Cloud Music host half: proxies Netease API calls through the dsh
// web server. Uses node:https (OpenSSL) so it is independent of the Windows
// schannel credential store that breaks curl inside sandboxed processes.
// ---------------------------------------------------------------------------

export const name = "netease-music";

/** Services required before the routes can mount. */
export const inject = ["webServer"];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const REF = "https://music.163.com/";

// In-memory login state for the lifetime of the host process.
let cookie = "";
let profile = { userId: null, nickname: "", avatarUrl: "" };

function sanitizeCookie(value) {
  let s = String(value || "");
  const bad = ["\"", "'", "`", "$", "\\", "\n", "\r", "\t"];
  for (const ch of bad) s = s.split(ch).join("");
  return s;
}

function digitsOnly(value) {
  const s = String(value || "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = { "User-Agent": UA, "Referer": REF };
    if (cookie) headers["Cookie"] = cookie;
    const req = https.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers,
        rejectUnauthorized: false,
      },
      (res) => {
        let d = "";
        res.on("data", (c) => { d += c; });
        res.on("end", () => resolve(d));
      },
    );
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
  });
}

async function netGet(url) {
  try {
    const text = await fetchText(url);
    try {
      return JSON.parse(text);
    } catch {
      return { error: "parse: " + text.slice(0, 160) };
    }
  } catch (err) {
    return { error: "net: " + (err && err.message ? err.message : String(err)) };
  }
}

function mapSong(s) {
  if (!s) return null;
  const artists = (s.artists || s.ar || []).map((a) => a.name).join(" / ");
  const album = s.album || s.al || {};
  return {
    id: s.id,
    name: s.name || "",
    artists: artists || "",
    album: album.name || "",
    picUrl: album.picUrl || album.blurPicUrl || "",
    duration: s.duration || s.dt || 0,
    fee: s.fee || 0,
  };
}

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function queryOf(req) {
  return new URL(req.url, "http://localhost").searchParams;
}

async function handleSetCookie(req, res) {
  if (req.method !== "POST") return writeJson(res, 405, { ok: false, error: "method not allowed" });
  const body = await readJsonBody(req);
  const c = sanitizeCookie(body.cookie);
  if (!c) return writeJson(res, 400, { ok: false, error: "Cookie 不能为空" });
  cookie = c;
  // The account endpoint is a weapi endpoint; a plain GET yields nothing, so
  // fall back to the caller-supplied uid when present.
  const acc = await netGet("https://music.163.com/api/nuser/account/get");
  if (acc && !acc.error && acc.profile && acc.profile.userId) {
    profile = {
      userId: acc.profile.userId,
      nickname: acc.profile.nickname || "",
      avatarUrl: acc.profile.avatarUrl || "",
    };
    return writeJson(res, 200, { ok: true, userId: profile.userId, nickname: profile.nickname, avatarUrl: profile.avatarUrl });
  }
  const uid = digitsOnly(body.uid);
  if (uid) {
    profile.userId = uid;
    return writeJson(res, 200, { ok: true, userId: uid, nickname: "", needProfile: true });
  }
  return writeJson(res, 200, { ok: false, error: "无法通过 Cookie 获取账号 UID，请检查 Cookie 是否有效，或手动填写 UID" });
}

function handleLogout(req, res) {
  cookie = "";
  profile = { userId: null, nickname: "", avatarUrl: "" };
  return writeJson(res, 200, { ok: true });
}

async function handleSearch(req, res) {
  const q = queryOf(req);
  const kw = String(q.get("kw") || "").slice(0, 60);
  if (!kw.trim()) return writeJson(res, 200, { ok: true, songs: [] });
  const j = await netGet("https://music.163.com/api/search/get?s=" + encodeURIComponent(kw) + "&type=1&limit=" + (parseInt(q.get("limit"), 10) || 30));
  if (j.error) return writeJson(res, 200, { ok: false, error: j.error });
  const songs = ((j.result && j.result.songs) || []).map(mapSong).filter(Boolean);
  return writeJson(res, 200, { ok: true, songs });
}

async function handleFavorites(req, res) {
  if (!cookie) return writeJson(res, 200, { ok: false, error: "尚未登录，请先粘贴 Cookie 登录" });
  let uid = profile.userId;
  if (!uid) {
    const acc = await netGet("https://music.163.com/api/nuser/account/get");
    if (acc && !acc.error && acc.profile && acc.profile.userId) {
      uid = acc.profile.userId;
      profile.userId = uid;
      profile.nickname = acc.profile.nickname || "";
    } else {
      return writeJson(res, 200, { ok: false, error: "无法获取 UID，请在登录时手动填写 UID" });
    }
  }
  const pl = await netGet("https://music.163.com/api/user/playlist?uid=" + encodeURIComponent(uid) + "&limit=1000&offset=0");
  if (pl.error) return writeJson(res, 200, { ok: false, error: pl.error });
  const list = pl.playlist || [];
  let liked = null;
  for (const p of list) { if (p.specialType === 5) { liked = p; break; } }
  if (!liked) { for (const p of list) { if (p.name === "我喜欢的音乐") { liked = p; break; } } }
  if (!liked) {
    const names = list.slice(0, 8).map((p) => p.name).join("、");
    return writeJson(res, 200, { ok: false, error: "未找到「我喜欢的音乐」歌单（UID " + uid + " 下共 " + list.length + " 个歌单：" + names + "）" });
  }
  const detail = await netGet("https://music.163.com/api/playlist/detail?id=" + liked.id);
  if (detail.error) return writeJson(res, 200, { ok: false, error: detail.error });
  const tracks = ((detail.result && detail.result.tracks) || []).map(mapSong).filter(Boolean);
  const total = detail.result && detail.result.trackCount;
  return writeJson(res, 200, {
    ok: true,
    songs: tracks,
    total: total || tracks.length,
    playlistName: liked.name,
    loadedAll: total ? tracks.length >= total : true,
  });
}

async function handleSongUrl(req, res) {
  const q = queryOf(req);
  const id = parseInt(q.get("id"), 10);
  if (!id) return writeJson(res, 200, { ok: false, error: "无效歌曲 ID" });
  const j = await netGet("https://music.163.com/api/song/enhance/player/url?ids=" + encodeURIComponent("[" + id + "]") + "&br=320000");
  if (j.error) return writeJson(res, 200, { ok: false, error: j.error });
  const d = j.data && j.data[0];
  if (!d || !d.url) {
    let reason = "无法获取播放地址";
    if (d && d.code === -110) reason = "该歌曲需 VIP 或版权受限，无法在线试听";
    return writeJson(res, 200, { ok: false, error: reason, code: d && d.code });
  }
  return writeJson(res, 200, { ok: true, url: d.url, br: d.br });
}

export function apply(ctx) {
  const routes = [
    { kind: "exact", path: "/api/netease/set-cookie", handler: handleSetCookie },
    { kind: "exact", path: "/api/netease/logout", handler: handleLogout },
    { kind: "exact", path: "/api/netease/search", handler: handleSearch },
    { kind: "exact", path: "/api/netease/favorites", handler: handleFavorites },
    { kind: "exact", path: "/api/netease/song-url", handler: handleSongUrl },
  ];
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "netease-music: api routes");
}
