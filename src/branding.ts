import { APP_FAVICON, APP_DOCUMENT_TITLE } from "./constants/branding";

const favicon =
  document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
  document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon" }));

favicon.type = "image/svg+xml";
favicon.href = APP_FAVICON;
document.title = APP_DOCUMENT_TITLE;
