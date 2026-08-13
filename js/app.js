// 入口（SPE §7.1）：注册路由 + SW
import { registerSW } from "./sw-reg.js";
import { initRouter, register } from "./router.js";
import { mount as feed } from "./feed.js";
import { mount as detail } from "./detail.js";
import { mountArtist, mountTag } from "./collection.js";
import { mount as favs } from "./favorites.js";

register(/^\/$/, { mount: feed });
register(/^\/work\/(?<id>[^/]+)$/, { mount: detail });
register(/^\/artist\/(?<aid>[^/]+)$/, { mount: (el, p) => mountArtist(el, p.aid) });
register(/^\/tag\/(?<tag>.+)$/, { mount: (el, p) => mountTag(el, decodeURIComponent(p.tag)) });
register(/^\/favs$/, { mount: favs });

initRouter();
registerSW();
