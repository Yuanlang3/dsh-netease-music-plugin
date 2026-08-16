window.__ModuleLoader__.load({
  id: "dsh-netease-music",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var reactMod = require("react");
    var React = (reactMod && reactMod.createElement) ? reactMod : reactMod.default;
    var e = React.createElement;

    var CSS = '.nm-panel{background:rgba(24,26,32,.98);border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;color:#e8e8ea;font-size:13px}.nm-panel-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}.nm-title{font-weight:600;font-size:14px}.nm-close{background:none;border:none;color:#999;font-size:20px;cursor:pointer;line-height:1}.nm-close:hover{color:#fff}.nm-body{padding:10px 14px;overflow-y:auto;flex:1;min-height:0}.nm-login{padding:10px;background:rgba(255,255,255,.04);border-radius:10px;margin-bottom:10px}.nm-login textarea{width:100%;height:52px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e8e8ea;padding:6px 8px;font-size:12px;resize:vertical;box-sizing:border-box}.nm-login input[type=text]{width:100%;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e8e8ea;padding:6px 8px;font-size:12px;margin-top:6px;box-sizing:border-box}.nm-row{display:flex;gap:8px;align-items:center;margin-top:8px}.nm-btn{background:#d43c33;color:#fff;border:none;border-radius:8px;padding:7px 12px;cursor:pointer;font-size:12px}.nm-btn:hover{background:#e0483e}.nm-btn.ghost{background:rgba(255,255,255,.1);color:#ddd}.nm-hint{color:#8a8a92;font-size:11px;line-height:1.5;margin-bottom:6px}.nm-status{font-size:12px;margin-top:6px}.nm-status.ok{color:#4caf7d}.nm-status.err{color:#e0483e}.nm-tabs{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.04);border-radius:10px;margin-bottom:10px}.nm-tab{flex:1;text-align:center;padding:7px 0;border-radius:8px;cursor:pointer;color:#b8b8c0;background:none;border:none;font-size:12px}.nm-tab.active{background:#d43c33;color:#fff}.nm-search{display:flex;gap:6px;margin-bottom:10px}.nm-search input{flex:1;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e8e8ea;padding:7px 9px;font-size:12px}.nm-list{display:flex;flex-direction:column;gap:2px}.nm-song{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer}.nm-song:hover{background:rgba(255,255,255,.06)}.nm-song.playing{background:rgba(212,60,51,.18)}.nm-song-idx{width:20px;color:#777;text-align:right;font-size:11px;flex-shrink:0}.nm-thumb{width:34px;height:34px;border-radius:6px;object-fit:cover;flex-shrink:0;background:#333;display:inline-block}.nm-song-meta{flex:1;min-width:0}.nm-song-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}.nm-song-artist{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#8a8a92;font-size:11px;margin-top:1px}.nm-song-dur{color:#777;font-size:11px;flex-shrink:0}.nm-empty{color:#8a8a92;text-align:center;padding:20px 0;font-size:12px}.nm-player{border-top:1px solid rgba(255,255,255,.08);padding:10px 14px;background:rgba(0,0,0,.25)}.nm-player-top{display:flex;align-items:center;gap:8px}.nm-player-thumb{width:36px;height:36px;border-radius:6px;object-fit:cover}.nm-player-meta{flex:1;min-width:0}.nm-player-btns{display:flex;gap:8px;align-items:center}.nm-pbtn{background:none;border:none;color:#e8e8ea;font-size:16px;cursor:pointer;line-height:1;padding:2px 4px}.nm-pbtn:hover{color:#fff}.nm-progress{width:100%;margin-top:8px;accent-color:#d43c33;display:block}.nm-time{display:flex;justify-content:space-between;color:#777;font-size:10px}.nm-spin{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:nmspin .8s linear infinite;flex-shrink:0}@keyframes nmspin{to{transform:rotate(360deg)}}.hHd-Xa_footerActions{flex-wrap:wrap!important}';

    function api(method, path, body) {
      var opts = { method: method };
      if (body !== undefined) {
        opts.headers = { "content-type": "application/json" };
        opts.body = JSON.stringify(body);
      }
      return fetch(path, opts).then(function (r) { return r.json(); });
    }

    var open = false;
    var subs = [];
    function setOpen(v) { open = v; for (var i = 0; i < subs.length; i++) subs[i](); }
    function useOpen() {
      var st = React.useState(open);
      var v = st[0];
      var setV = st[1];
      React.useEffect(function () {
        var f = function () { setV(open); };
        subs.push(f);
        return function () { var idx = subs.indexOf(f); if (idx >= 0) subs.splice(idx, 1); };
      }, []);
      return v;
    }

    function fmt(ms) {
      var s = Math.floor((ms || 0) / 1000);
      var m = Math.floor(s / 60);
      var r = s % 60;
      return m + ":" + (r < 10 ? "0" : "") + r;
    }

    var audioBox = { current: null };

    function NmFooterButton(props) {
      var isOpen = useOpen();
      return e("button", {
        type: "button",
        style: { width: 36, height: 36, borderRadius: "50%", background: isOpen ? "rgba(212,60,51,.25)" : "transparent", color: "#e0483e", border: "none", cursor: "pointer", fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", lineHeight: 1, padding: 0 },
        title: "网易云音乐",
        onClick: function () { setOpen(!isOpen); }
      }, "♪");
    }

    function PlayerRoot() {
      var isOpen = useOpen();

      var curSt = React.useState(null); var cur = curSt[0]; var setCur = curSt[1];
      var playSt = React.useState(false); var isPlaying = playSt[0]; var setPlaying = playSt[1];
      var progSt = React.useState(0); var prog = progSt[0]; var setProg = progSt[1];
      var durSt = React.useState(0); var dur = durSt[0]; var setDur = durSt[1];
      var urlErrSt = React.useState(""); var urlErrVal = urlErrSt[0]; var setUrlErr = urlErrSt[1];
      var loadSt = React.useState(null); var loadId = loadSt[0]; var setLoadId = loadSt[1];

      var tabSt = React.useState("search"); var tabVal = tabSt[0]; var setTab = tabSt[1];
      var songsSt = React.useState([]); var list = songsSt[0]; var setSongs = songsSt[1];
      var msgSt = React.useState(""); var msg = msgSt[0]; var setMsg = msgSt[1];
      var listLoadSt = React.useState(false); var listLoad = listLoadSt[0]; var setListLoad = listLoadSt[1];
      var kwSt = React.useState(""); var kwVal = kwSt[0]; var setKw = kwSt[1];

      var cookieSt = React.useState(""); var cookieVal = cookieSt[0]; var setCookieText = cookieSt[1];
      var uidSt = React.useState(""); var uidVal = uidSt[0]; var setUidText = uidSt[1];
      var loginSt = React.useState({ status: "idle", text: "" }); var loginState = loginSt[0]; var setLoginState = loginSt[1];
      var nickSt = React.useState(""); var nick = nickSt[0]; var setNick = nickSt[1];
      var showLoginSt = React.useState(true); var showLoginVal = showLoginSt[0]; var setShowLogin = showLoginSt[1];
      var loggedInSt = React.useState(false); var loggedIn = loggedInSt[0]; var setLoggedIn = loggedInSt[1];

      React.useEffect(function () {
        var a = audioBox.current;
        if (!a || !cur || !cur.url) return;
        a.src = cur.url;
        var p = a.play();
        if (p && p.catch) p.catch(function () { setPlaying(false); });
        setPlaying(true);
      }, [cur]);

      function playSong(song) {
        setUrlErr("");
        setLoadId(song.id);
        api("GET", "/api/netease/song-url?id=" + song.id).then(function (res) {
          setLoadId(null);
          if (res && res.ok) { setCur({ song: song, url: res.url }); }
          else { setUrlErr(res && res.error ? res.error : "获取播放地址失败"); }
        }).catch(function () { setLoadId(null); setUrlErr("获取播放地址失败"); });
      }

      function next(delta) {
        if (!cur) return;
        var idx = -1;
        for (var i = 0; i < list.length; i++) { if (list[i].id === cur.song.id) { idx = i; break; } }
        if (idx < 0) return;
        var ni = (idx + delta + list.length) % list.length;
        playSong(list[ni]);
      }

      function togglePlay() {
        var a = audioBox.current;
        if (!a || !cur) return;
        if (a.paused) { a.play().catch(function () {}); setPlaying(true); }
        else { a.pause(); setPlaying(false); }
      }

      function doLogin() {
        setLoginState({ status: "loading", text: "登录中..." });
        api("POST", "/api/netease/set-cookie", { cookie: cookieVal, uid: uidVal }).then(function (res) {
          if (res && res.ok) {
            setLoginState({ status: "ok", text: "已登录" + (res.nickname ? "：" + res.nickname : "") });
            setNick(res.nickname || "");
            setLoggedIn(true);
            setShowLogin(false);
          } else {
            setLoginState({ status: "error", text: (res && res.error) || "登录失败" });
          }
        }).catch(function () { setLoginState({ status: "error", text: "登录请求失败" }); });
      }

      function doLogout() {
        api("POST", "/api/netease/logout").then(function () {
          setNick(""); setLoggedIn(false); setLoginState({ status: "idle", text: "" }); setShowLogin(true);
          setSongs([]); setMsg(""); setCur(null); setPlaying(false);
        });
      }

      function loadSearch() {
        if (!kwVal.trim()) { setMsg("请输入搜索关键词"); return; }
        setListLoad(true); setMsg("");
        api("GET", "/api/netease/search?kw=" + encodeURIComponent(kwVal) + "&limit=30").then(function (res) {
          setListLoad(false);
          if (res && res.ok) { setSongs(res.songs || []); setMsg((res.songs && res.songs.length) ? "" : "未找到歌曲"); }
          else { setMsg((res && res.error) || "搜索失败"); }
        }).catch(function () { setListLoad(false); setMsg("搜索失败"); });
      }

      function loadFav() {
        setListLoad(true); setMsg("");
        api("GET", "/api/netease/favorites").then(function (res) {
          setListLoad(false);
          if (res && res.ok) {
            setSongs(res.songs || []);
            var tail = res.loadedAll ? "" : "（仅加载前 " + (res.songs ? res.songs.length : 0) + " 首）";
            setMsg((res.songs && res.songs.length) ? ("共 " + res.total + " 首" + tail) : "歌单为空");
          } else { setMsg((res && res.error) || "获取失败"); }
        }).catch(function () { setListLoad(false); setMsg("获取失败"); });
      }

      function songRow(song, i) {
        var isCur = cur && cur.song && cur.song.id === song.id;
        var loading = loadId === song.id;
        return e("div", { className: "nm-song" + (isCur ? " playing" : ""), key: song.id, onClick: function () { playSong(song); } },
          e("span", { className: "nm-song-idx" }, String(i + 1)),
          song.picUrl ? e("img", { className: "nm-thumb", src: song.picUrl, alt: "" }) : e("span", { className: "nm-thumb" }),
          e("div", { className: "nm-song-meta" },
            e("div", { className: "nm-song-name" }, song.name),
            e("div", { className: "nm-song-artist" }, song.artists + (song.album ? " · " + song.album : ""))
          ),
          loading ? e("span", { className: "nm-spin" }) : e("span", { className: "nm-song-dur" }, fmt(song.duration))
        );
      }

      var audioEl = e("audio", {
        ref: function (el) { audioBox.current = el; },
        onTimeUpdate: function (ev) { if (ev.target) setProg(ev.target.currentTime || 0); },
        onLoadedMetadata: function (ev) { if (ev.target) setDur(ev.target.duration || 0); },
        onDurationChange: function (ev) { if (ev.target) setDur(ev.target.duration || 0); },
        onPlay: function () { setPlaying(true); },
        onPause: function () { setPlaying(false); },
        onEnded: function () { next(1); },
        onError: function () { setUrlErr("播放失败"); }
      });

      var panel = isOpen ? e("div", { className: "nm-panel", style: { position: "fixed", left: 64, top: 60, width: 380, maxHeight: "min(82vh, 720px)", zIndex: 9999, pointerEvents: "auto" } },
        e("div", { className: "nm-panel-head" },
          e("div", { className: "nm-title" }, "网易云音乐" + (nick ? " · " + nick : "")),
          e("button", { className: "nm-close", onClick: function () { setOpen(false); } }, "×")
        ),
        e("div", { className: "nm-body" },
          showLoginVal ? e("div", { className: "nm-login" },
            e("div", { className: "nm-hint" }, "粘贴网易云 Cookie：登录 music.163.com 后，F12 → Network → 任一请求的 Request Headers → Cookie（含 MUSIC_U）"),
            e("textarea", { placeholder: "Cookie（含 MUSIC_U=...）", value: cookieVal, onChange: function (ev) { setCookieText(ev.target.value); } }),
            e("input", { type: "text", placeholder: "UID（个人主页网址 id= 后面的数字）", value: uidVal, onChange: function (ev) { setUidText(ev.target.value); } }),
            e("div", { className: "nm-row" },
              e("button", { className: "nm-btn", onClick: doLogin }, "登录"),
              e("button", { className: "nm-btn ghost", onClick: function () { setShowLogin(false); } }, "稍后")
            ),
            loginState.text ? e("div", { className: "nm-status " + (loginState.status === "error" ? "err" : (loginState.status === "ok" ? "ok" : "")) }, loginState.text) : null
          ) : null,
          e("div", { className: "nm-tabs" },
            e("button", { className: "nm-tab" + (tabVal === "search" ? " active" : ""), onClick: function () { setTab("search"); setSongs([]); setMsg(""); } }, "搜索"),
            e("button", { className: "nm-tab" + (tabVal === "fav" ? " active" : ""), onClick: function () { setTab("fav"); if (loggedIn) loadFav(); else setShowLogin(true); } }, "我喜欢的音乐")
          ),
          tabVal === "search" ? e("div", { className: "nm-search" },
            e("input", { placeholder: "搜索歌曲 / 歌手", value: kwVal, onChange: function (ev) { setKw(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === "Enter") loadSearch(); } }),
            e("button", { className: "nm-btn", onClick: loadSearch }, "搜索")
          ) : null,
          listLoad ? e("div", { className: "nm-empty" }, "加载中...") : (msg && list.length === 0 ? e("div", { className: "nm-empty" }, msg) : e("div", { className: "nm-list" }, list.map(songRow))),
          tabVal === "fav" && msg && list.length > 0 ? e("div", { className: "nm-hint" }, msg) : null,
          loggedIn ? e("div", { className: "nm-row" }, e("button", { className: "nm-btn ghost", onClick: doLogout }, "退出登录")) : null
        ),
        e("div", { className: "nm-player" },
          cur ? e("div", null,
            e("div", { className: "nm-player-top" },
              cur.song.picUrl ? e("img", { className: "nm-player-thumb", src: cur.song.picUrl, alt: "" }) : null,
              e("div", { className: "nm-player-meta" },
                e("div", { className: "nm-song-name" }, cur.song.name),
                e("div", { className: "nm-song-artist" }, cur.song.artists)
              ),
              e("div", { className: "nm-player-btns" },
                e("button", { className: "nm-pbtn", onClick: function () { next(-1); }, title: "上一首" }, "|<"),
                e("button", { className: "nm-pbtn", onClick: togglePlay, title: isPlaying ? "暂停" : "播放" }, isPlaying ? "||" : ">"),
                e("button", { className: "nm-pbtn", onClick: function () { next(1); }, title: "下一首" }, ">|")
              )
            ),
            e("input", { className: "nm-progress", type: "range", min: 0, max: dur || 0, step: 0.5, value: prog, onChange: function (ev) { var t = Number(ev.target.value); if (audioBox.current) audioBox.current.currentTime = t; setProg(t); } }),
            e("div", { className: "nm-time" },
              e("span", null, fmt(prog * 1000)),
              e("span", null, fmt(dur * 1000))
            ),
            urlErrVal ? e("div", { className: "nm-status err" }, urlErrVal) : null
          ) : e("div", { className: "nm-empty" }, "点击歌曲开始播放")
        )
      ) : null;

      return e("div", { style: { pointerEvents: "none" } }, audioEl, panel);
    }

    var inject = ["slots"];

    function apply(ctx) {
      ctx.effect(function () {
        var tag = document.createElement("style");
        tag.setAttribute("data-plugin", "dsh-netease-music");
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return function () { tag.remove(); };
      });

      ctx.slots.inject("sidebar.footer.action", function () {
        return ctx.slots.register(
          { name: "sidebar.footer.action", id: "netease-music", order: 1, label: "网易云音乐" },
          function (props) { return e(NmFooterButton, props); }
        );
      });

      ctx.slots.inject("shell.overlay", function () {
        return ctx.slots.register(
          { name: "shell.overlay", id: "netease-music-panel", order: 2000, label: "网易云音乐" },
          function () { return e(PlayerRoot, {}); }
        );
      });
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
