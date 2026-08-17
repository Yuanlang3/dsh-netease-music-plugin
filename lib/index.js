import https from "node:https";
import crypto from "node:crypto";

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

// The Netease API returns http:// media URLs. The dsh GUI runs on
// http://127.0.0.1, which browsers treat as a secure (potentially
// trustworthy) context, so http:// audio/images are blocked as mixed
// content and playback fails. Force https (the CDN serves both).
function toHttps(value) {
  return String(value || "").replace(/^http:\/\//, "https://");
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

// ---------------------------------------------------------------------------
// Netease weapi encryption (AES-128-CBC + RSA no-padding), used by the QR-code
// login flow.
// ---------------------------------------------------------------------------
const WAPI_AES_KEY = "0CoJUm6Qyw8W8jud";
const WAPI_IV = "0102030405060708";
const WAPI_MODULUS = "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7";
const WAPI_EXPONENT = "010001";
const WAPI_MOD_BUF = Buffer.from(WAPI_MODULUS, "hex");

function wapiAes(text, key, iv) {
  const c = crypto.createCipheriv("aes-128-cbc", Buffer.from(key), Buffer.from(iv));
  return c.update(text, "utf8", "base64") + c.final("base64");
}

function wapiRsa(text) {
  const reversed = Buffer.from(text).reverse();
  const padded = Buffer.concat([Buffer.alloc(128 - reversed.length, 0), reversed]);
  const n = WAPI_MOD_BUF[0] === 0 ? WAPI_MOD_BUF.subarray(1).toString("base64url") : WAPI_MOD_BUF.toString("base64url");
  const e = Buffer.from(WAPI_EXPONENT, "hex").toString("base64url");
  const pub = crypto.createPublicKey({ key: { kty: "RSA", n, e }, format: "jwk" });
  return crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_NO_PADDING }, padded).toString("hex");
}

function weapiBody(data) {
  const text = JSON.stringify(data);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let secKey = "";
  for (let i = 0; i < 16; i++) secKey += chars[Math.floor(Math.random() * chars.length)];
  const params = wapiAes(wapiAes(text, WAPI_AES_KEY, WAPI_IV), secKey, WAPI_IV);
  return new URLSearchParams({ params, encSecKey: wapiRsa(secKey) }).toString();
}

function formPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Referer": REF,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let d = "";
        const setCookie = res.headers["set-cookie"] || [];
        res.on("data", (c) => { d += c; });
        res.on("end", () => resolve({ status: res.statusCode, bodyText: d, setCookie }));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function weapiPost(url, data) {
  return formPost(url, weapiBody(data));
}

// ---------------------------------------------------------------------------
// Netease eapi encryption (AES-128-ECB) + client fingerprint, used by the
// QR-code login flow. The current server rejects "web simulated" logins with
// code 8821 after the phone authorizes; requests must look like an official
// client (eapi-encrypted body + os/appver/deviceId cookie header + client UA).
// Mirrors NeteaseCloudMusicApiEnhanced/api-enhanced and Music163Api-Go.
// ---------------------------------------------------------------------------
const EAPI_KEY = "e82ckenh8dichen8";
const EAPI_UA = "NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)";
const QR_PATH_UNIKEY = "/api/login/qrcode/unikey";
const QR_PATH_CHECK = "/api/login/qrcode/client/login";

// One device session shared by a qr-key request and its follow-up checks.
let qrDevice = null;

function eapiBody(path, data) {
  const text = JSON.stringify(data);
  const digest = crypto.createHash("md5").update(`nobody${path}use${text}md5forencrypt`).digest("hex");
  const payload = `${path}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(EAPI_KEY, "utf8"), null);
  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return new URLSearchParams({ params: enc.toString("hex").toUpperCase() }).toString();
}

function qrCookieHeader() {
  if (!qrDevice) {
    const chars = "0123456789ABCDEF";
    let deviceId = "";
    for (let i = 0; i < 52; i++) deviceId += chars[Math.floor(Math.random() * 16)];
    qrDevice = { deviceId };
  }
  const requestId = `${Date.now()}_${String(Math.floor(Math.random() * 1000)).padStart(4, "0")}`;
  const header = {
    osver: "Microsoft-Windows-10-Professional-build-19045-64bit",
    deviceId: qrDevice.deviceId,
    os: "pc",
    appver: "3.1.17.204416",
    versioncode: "140",
    mobilename: "",
    buildver: String(Date.now()).substr(0, 10),
    resolution: "1920x1080",
    __csrf: "",
    channel: "netease",
    requestId,
  };
  return Object.entries(header)
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
    .join("; ");
}

function eapiPost(url, path, data) {
  return new Promise((resolve, reject) => {
    const body = eapiBody(path, data);
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "User-Agent": EAPI_UA,
          "Cookie": qrCookieHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        let d = "";
        const setCookie = res.headers["set-cookie"] || [];
        res.on("data", (c) => { d += c; });
        res.on("end", () => resolve({ status: res.statusCode, bodyText: d, setCookie }));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
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
    picUrl: toHttps(album.picUrl || album.blurPicUrl || ""),
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
  return writeJson(res, 200, { ok: true, url: toHttps(d.url), br: d.br });
}

// QR-code login (eapi protocol): issue a unikey, then poll the client/login
// endpoint. On success (code 803) the response's Set-Cookie carries MUSIC_U,
// which becomes the in-memory cookie used by every other route.
async function handleQrKey(req, res) {
  const r = await eapiPost("https://music.163.com/eapi/login/qrcode/unikey", QR_PATH_UNIKEY, { type: "3" });
  let data = {};
  try { data = JSON.parse(r.bodyText); } catch {}
  if (r.status === 200 && data.unikey) {
    return writeJson(res, 200, { ok: true, unikey: data.unikey, url: "https://music.163.com/login?codekey=" + data.unikey });
  }
  return writeJson(res, 200, { ok: false, error: data.message || "获取二维码失败", code: data.code });
}

async function handleQrCheck(req, res) {
  const q = queryOf(req);
  const key = String(q.get("key") || "");
  if (!key) return writeJson(res, 200, { ok: false, error: "缺少 key" });
  const r = await eapiPost("https://music.163.com/eapi/login/qrcode/client/login", QR_PATH_CHECK, { key, type: "3" });
  let data = {};
  try { data = JSON.parse(r.bodyText); } catch {}
  const headerCookie = (r.setCookie || []).join("; ");
  const bodyCookie = typeof data.cookie === "string" ? data.cookie : "";
  const allCookies = headerCookie || bodyCookie;
  const m = /MUSIC_U=([^;]+)/.exec(allCookies);
  // 登录成功：响应码 803，或任一 cookie 通道拿到了 MUSIC_U。
  if (data.code === 803 || m !== null) {
    if (m) {
      cookie = "MUSIC_U=" + m[1];
      profile = { userId: null, nickname: "", avatarUrl: "" };
    }
    return writeJson(res, 200, { ok: true, code: 803, message: "登录成功", loggedIn: true });
  }
  const map = { 800: "等待扫码", 801: "已扫码，请在手机上确认", 802: "授权中" };
  return writeJson(res, 200, { ok: true, code: data.code, message: map[data.code] || data.message || "未知状态" });
}

export function apply(ctx) {
  const routes = [
    { kind: "exact", path: "/api/netease/set-cookie", handler: handleSetCookie },
    { kind: "exact", path: "/api/netease/logout", handler: handleLogout },
    { kind: "exact", path: "/api/netease/search", handler: handleSearch },
    { kind: "exact", path: "/api/netease/favorites", handler: handleFavorites },
    { kind: "exact", path: "/api/netease/song-url", handler: handleSongUrl },
    { kind: "exact", path: "/api/netease/qr-key", handler: handleQrKey },
    { kind: "exact", path: "/api/netease/qr-check", handler: handleQrCheck },
  ];
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "netease-music: api routes");
}
