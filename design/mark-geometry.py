"""Геометрия знака «Этажи»: К из Geologica (wght 900, SHRP 100), разрезанная на горизонтальные этажи.
Пересечение считается заранее, поэтому в браузере знак рисуется простыми контурами без clipPath."""
from fontTools.pens.transformPen import TransformPen
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from logos2 import font, Flat, stripes
import json, pathlib

f = font("geo", 900)
gs = f.getGlyphSet()
fl = Flat(gs)
k = 100 / f["OS/2"].sCapHeight
gs[f.getBestCmap()[ord("К")]].draw(TransformPen(fl, (k, 0, 0, -k, 0, 100)))
glyph = unary_union([Polygon(p).buffer(0) for p in fl.polys])
x0, y0, x1, y1 = glyph.bounds
from shapely.affinity import translate
glyph = translate(glyph, -x0, -y0)
W, H = x1 - x0, y1 - y0


def d_of(geom):
    polys = getattr(geom, "geoms", [geom])
    out = []
    for p in polys:
        if p.is_empty:
            continue
        pts = list(p.exterior.coords)[:-1]
        out.append("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z")
    return " ".join(out)


res = {"w": round(W, 2), "h": round(H, 2)}
for name, n, lime_i in (("large", 9, 4), ("small", 6, 3)):
    st = stripes(0, 0, W, H, n, 0.6)
    ink = unary_union([glyph.intersection(box(-1, y, W + 1, y + t)) for i, (y, t) in enumerate(st) if i != lime_i])
    lime = glyph.intersection(box(-1, st[lime_i][0], W + 1, st[lime_i][0] + st[lime_i][1]))
    res[name] = {"ink": d_of(ink), "lime": d_of(lime)}
pathlib.Path("../src/components/logoGeometry.ts").write_text(
    "// Сгенерировано design/mark-geometry.py: знак «Этажи», К из Geologica 900 на горизонтальных этажах\n"
    f"export const MARK = {json.dumps(res, ensure_ascii=False, indent=2)} as const;\n"
)
print(res["w"], res["h"], len(res["large"]["ink"]), len(res["small"]["ink"]))
