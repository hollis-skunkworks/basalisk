import { mountPage } from "@hollis-labs/surface-page"
import { galleryViews } from "@hollis-labs/surface-page/gallery"
import { app, modules } from "@surface/app"
import "./index.css"

// galleryViews: the Components window (surface.gallery), which draws every registry component.
mountPage({ modules, core: galleryViews, app })
