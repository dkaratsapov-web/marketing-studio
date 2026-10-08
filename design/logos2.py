"""Вторая серия знаков «Корпорации»: буквы строятся из настоящих контуров Geologica,
поэтому срезы, полосы и сетки ложатся точно по форме глифа."""
import itertools
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.basePen import BasePen
from PIL import Image, ImageDraw
from pathlib import Path

HERE = Path(__file__).parent
GEO = HERE / "fonts/geologica-cyr.woff2"
MONO = HERE / "fonts/plexmono-med-cyr.woff2"
_cache = {}


def font(kind, wght):
    key = (kind, wght)
    if key not in _cache:
        if kind == "geo":
            f = instantiateVariableFont(TTFont(GEO), {"wght": wght, "SHRP": 100})
        else:
            f = TTFont(MONO)
        _cache[key] = f
    return _cache[key]


def shape(s, wght=800, cap=70, track=0.0, kind="geo"):
    """Контур строки: базовая линия y=0, заглавные вверх (отрицательный y)."""
    f = font(kind, wght)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    k = cap / f["OS/2"].sCapHeight
    sp = SVGPathPen(gs)
    bp = BoundsPen(gs)
    x = 0.0
    for ch in s:
        g = cmap[ord(ch)]
        for pen in (sp, bp):
            gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x, 0)))
        x += f["hmtx"][g][0] * k + track * cap
    return {"d": sp.getCommands(), "box": bp.bounds, "adv": x - track * cap}


class Flat(BasePen):
    """Ломаная из контура глифа: нужна для растровой выборки ячеек."""

    def __init__(self, gs):
        super().__init__(gs)
        self.polys, self.cur = [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, a, b, c):
        p0 = self.cur[-1]
        for i in range(1, 13):
            t = i / 12
            mt = 1 - t
            self.cur.append(
                tuple(mt**3 * p0[j] + 3 * mt * mt * t * a[j] + 3 * mt * t * t * b[j] + t**3 * c[j] for j in (0, 1))
            )

    def _qCurveToOne(self, a, b):
        p0 = self.cur[-1]
        for i in range(1, 9):
            t = i / 8
            mt = 1 - t
            self.cur.append(tuple(mt * mt * p0[j] + 2 * mt * t * a[j] + t * t * b[j] for j in (0, 1)))

    def _closePath(self):
        self.polys.append(self.cur)
        self.cur = []

    _endPath = _closePath


def fit(sh, x, y, w, h, align="c"):
    """transform, вписывающий чернильную рамку контура в прямоугольник."""
    x0, y0, x1, y1 = sh["box"]
    bw, bh = x1 - x0, y1 - y0
    s = min(w / bw, h / bh)
    dx = x + (w - bw * s) / 2 if align == "c" else x
    dy = y + (h - bh * s) / 2
    return s, dx - x0 * s, dy - y0 * s


def tf(s, tx, ty):
    return f"translate({tx:.2f} {ty:.2f}) scale({s:.4f})"


def placed_box(sh, s, tx, ty):
    x0, y0, x1, y1 = sh["box"]
    return x0 * s + tx, y0 * s + ty, x1 * s + tx, y1 * s + ty


_ids = itertools.count()


def uid(p):
    return f"{p}{next(_ids)}"


K = lambda w=900: shape("К", wght=w, cap=100)  # noqa: E731
WORD = "КОРПОРАЦИЯ"


# ---------- знаки (viewBox 0 0 100 100) и логотипы (свой viewBox) ----------

def a_icon(c):
    sh = K()
    s, tx, ty = fit(sh, 16, 14, 64, 72)
    x0, y0, x1, y1 = placed_box(sh, s, tx, ty)
    cut = (y0 + y1) / 2 - 2
    g, sh_x = 2.4, 7
    t, b = uid("t"), uid("b")
    return f"""<defs><clipPath id="{t}"><rect x="-10" y="-10" width="120" height="{cut - g + 10:.2f}"/></clipPath>
<clipPath id="{b}"><rect x="-10" y="{cut + g:.2f}" width="120" height="100"/></clipPath></defs>
<g clip-path="url(#{t})"><path d="{sh['d']}" transform="{tf(s, tx + sh_x, ty)}" fill="{c['ink']}"/></g>
<g clip-path="url(#{b})"><path d="{sh['d']}" transform="{tf(s, tx, ty)}" fill="{c['ink']}"/></g>
<rect x="{x0 - 3:.2f}" y="{cut - 1.1:.2f}" width="{x1 - x0 + sh_x + 6:.2f}" height="2.2" fill="{c['acc']}"/>"""


def a_logo(c):
    sh = shape(WORD, 850, 40, 0.06)
    x0, y0, x1, y1 = sh["box"]
    cut = y0 + (y1 - y0) * 0.42
    g, shx = 2.6, 16
    t, b = uid("t"), uid("b")
    w = x1 - x0 + shx + 8
    body = f"""<defs><clipPath id="{t}"><rect x="-20" y="-80" width="999" height="{cut - g + 80:.2f}"/></clipPath>
<clipPath id="{b}"><rect x="-20" y="{cut + g:.2f}" width="999" height="80"/></clipPath></defs>
<g transform="translate({4 - x0:.2f} 0)">
<g clip-path="url(#{t})"><path d="{sh['d']}" transform="translate({shx} 0)" fill="{c['ink']}"/></g>
<g clip-path="url(#{b})"><path d="{sh['d']}" fill="{c['ink']}"/></g>
<rect x="{x0:.2f}" y="{cut - 1.2:.2f}" width="{x1 - x0 + shx:.2f}" height="2.4" fill="{c['acc']}"/></g>"""
    return body, (0, y0 - 2, w, y1 - y0 + 4)


def b_icon(c):
    sh = K()
    s, tx, ty = fit(sh, 0, 0, 100, 44)
    x0, y0, x1, y1 = placed_box(sh, s, tx, ty)
    kw, kh = x1 - x0, y1 - y0
    cw = kh * 0.34
    total = kw + 5 + cw
    ox, oy = 50 - total / 2 - x0, 50 - kh / 2 - y0
    return f"""<rect x="10" y="10" width="80" height="80" fill="{c['ink']}"/>
<path d="{sh['d']}" transform="{tf(s, tx + ox, ty + oy)}" fill="{c['bg']}"/>
<rect x="{x1 + ox + 5:.2f}" y="{y0 + oy:.2f}" width="{cw:.2f}" height="{kh:.2f}" fill="{c['acc']}"/>"""


def b_logo(c):
    sh = shape(WORD, 800, 40, 0.06)
    x0, y0, x1, y1 = sh["box"]
    cw = 40 * 0.42
    body = f"""<g transform="translate({-x0:.2f} 0)"><path d="{sh['d']}" fill="{c['ink']}"/>
<rect x="{x1 + 6:.2f}" y="{y0:.2f}" width="{cw:.2f}" height="{y1 - y0:.2f}" fill="{c['acc']}"/></g>"""
    return body, (0, y0 - 2, x1 - x0 + 6 + cw + 2, y1 - y0 + 4)


def stripes(x0, y0, x1, y1, n, ratio):
    bh = y1 - y0
    t = bh / (n - (1 - ratio) * (n - 1) / 1) if False else bh / ((n - 1) / ratio + 1)  # noqa
    pitch = (bh - t) / (n - 1)
    return [(y0 + i * pitch, t) for i in range(n)]


def c_icon(c):
    sh = K()
    s, tx, ty = fit(sh, 16, 14, 68, 72)
    x0, y0, x1, y1 = placed_box(sh, s, tx, ty)
    st = stripes(x0, y0, x1, y1, 9, 0.6)
    cl, cl2 = uid("s"), uid("l")
    rects = "".join(f'<rect x="0" y="{y:.2f}" width="100" height="{h:.2f}"/>' for y, h in st)
    ly, lh = st[4]
    return f"""<defs><clipPath id="{cl}">{rects}</clipPath><clipPath id="{cl2}"><rect x="0" y="{ly:.2f}" width="100" height="{lh:.2f}"/></clipPath></defs>
<g clip-path="url(#{cl})"><path d="{sh['d']}" transform="{tf(s, tx, ty)}" fill="{c['ink']}"/></g>
<g clip-path="url(#{cl2})"><path d="{sh['d']}" transform="{tf(s, tx, ty)}" fill="{c['acc']}"/></g>"""


def c_logo(c):
    sh = shape(WORD, 900, 40, 0.05)
    x0, y0, x1, y1 = sh["box"]
    st = stripes(x0, y0, x1, y1, 8, 0.58)
    cl, cl2 = uid("s"), uid("l")
    rects = "".join(f'<rect x="-50" y="{y:.2f}" width="999" height="{h:.2f}"/>' for y, h in st)
    ly, lh = st[5]
    body = f"""<defs><clipPath id="{cl}">{rects}</clipPath><clipPath id="{cl2}"><rect x="-50" y="{ly:.2f}" width="999" height="{lh:.2f}"/></clipPath></defs>
<g transform="translate({-x0:.2f} 0)"><g clip-path="url(#{cl})"><path d="{sh['d']}" fill="{c['ink']}"/></g>
<g clip-path="url(#{cl2})"><path d="{sh['d']}" fill="{c['acc']}"/></g></g>"""
    return body, (0, y0 - 2, x1 - x0, y1 - y0 + 4)


def d_icon(c):
    sh = K()
    s, tx, ty = fit(sh, 33, 30, 34, 40)
    return f"""<circle cx="50" cy="50" r="38" fill="none" stroke="{c['acc']}" stroke-width="7"/>
<path d="{sh['d']}" transform="{tf(s, tx + 1.5, ty)}" fill="{c['ink']}"/>"""


def e_icon(c):
    out = []
    shs = [K(w) for w in (150, 450, 900)]
    ref = shs[-1]
    s, tx, ty = fit(ref, 30, 16, 60, 68)
    for i, (sh, op) in enumerate(zip(shs, (0.22, 0.45, 1))):
        dx = (i - 2) * 8
        fill = c["acc"] if i == 2 else c["ink"]
        out.append(f'<path d="{sh["d"]}" transform="{tf(s, tx + dx, ty)}" fill="{fill}" fill-opacity="{op}"/>')
    return "".join(out)


def e_logo(c):
    x = 0
    parts = []
    lo = hi = None
    n = len(WORD)
    for i, ch in enumerate(WORD):
        w = round(140 + (900 - 140) * i / (n - 1))
        sh = shape(ch, w, 40)
        fill = c["acc"] if i == n - 1 else c["ink"]
        parts.append(f'<path d="{sh["d"]}" transform="translate({x:.2f} 0)" fill="{fill}"/>')
        bx = sh["box"]
        lo = bx[1] if lo is None else min(lo, bx[1])
        hi = bx[3] if hi is None else max(hi, bx[3])
        x += sh["adv"] + 40 * 0.05
    return "".join(parts), (0, lo - 2, x, hi - lo + 4)


def f_icon(c):
    sh = shape("КРП", cap=100, kind="mono", track=0.02)
    s, tx, ty = fit(sh, 20, 50, 60, 22)
    return f"""<rect x="10" y="10" width="80" height="80" fill="{c['ink']}"/>
<path d="M20 41 L31 24 L42 41 Z" fill="{c['acc']}"/>
<path d="{sh['d']}" transform="{tf(s, tx, ty)}" fill="{c['bg']}"/>"""


def f_logo(c):
    w = shape(WORD, 800, 40, 0.06)
    x0, y0, x1, y1 = w["box"]
    t = shape("КРП", cap=22, kind="mono", track=0.04)
    tx0, ty0, tx1, ty1 = t["box"]
    px = x1 - x0 + 18
    ph = 40
    tri = 16
    pw = 14 + tri + 8 + (tx1 - tx0) + 14
    mid = y0 + (y1 - y0) / 2
    body = f"""<g transform="translate({-x0:.2f} 0)"><path d="{w['d']}" fill="{c['ink']}"/></g>
<rect x="{px:.2f}" y="{mid - ph / 2:.2f}" width="{pw:.2f}" height="{ph}" rx="{ph / 2}" fill="none" stroke="{c['ink']}" stroke-width="2.4"/>
<path d="M{px + 14:.2f} {mid + 7:.2f} l{tri / 2:.2f} -14 l{tri / 2:.2f} 14 Z" fill="{c['acc']}"/>
<path d="{t['d']}" transform="translate({px + 14 + tri + 8 - tx0:.2f} {mid + (ty1 - ty0) / 2 - ty1 + 0:.2f})" fill="{c['ink']}"/>"""
    return body, (0, mid - ph / 2 - 2, px + pw + 2, ph + 4)


def g_icon(c):
    sh = K()
    s, tx, ty = fit(sh, 19, 17, 62, 66)
    if not c["dark"]:
        return f"""<path d="{sh['d']}" transform="{tf(s, tx + 3.5, ty + 3.5)}" fill="#ff4d9d"/>
<path d="{sh['d']}" transform="{tf(s, tx - 3.5, ty - 3.5)}" fill="{c['ink']}"/>"""
    blend = "screen"
    return f"""<g style="isolation:isolate">
<path d="{sh['d']}" transform="{tf(s, tx - 3.5, ty - 3.5)}" fill="#c4f542" style="mix-blend-mode:{blend}"/>
<path d="{sh['d']}" transform="{tf(s, tx + 3.5, ty + 3.5)}" fill="#ff4d9d" style="mix-blend-mode:{blend}"/></g>"""


def g_logo(c):
    sh = shape(WORD, 900, 40, 0.06)
    x0, y0, x1, y1 = sh["box"]
    if not c["dark"]:
        body = f"""<g transform="translate({3 - x0:.2f} 0)"><path d="{sh['d']}" transform="translate(1.6 1.6)" fill="#ff4d9d"/>
<path d="{sh['d']}" transform="translate(-1.6 -1.6)" fill="{c['ink']}"/></g>"""
        return body, (0, y0 - 4, x1 - x0 + 7, y1 - y0 + 8)
    blend = "screen"
    body = f"""<g style="isolation:isolate" transform="translate({3 - x0:.2f} 0)">
<path d="{sh['d']}" transform="translate(-1.6 -1.6)" fill="#c4f542" style="mix-blend-mode:{blend}"/>
<path d="{sh['d']}" transform="translate(1.6 1.6)" fill="#ff4d9d" style="mix-blend-mode:{blend}"/></g>"""
    return body, (0, y0 - 4, x1 - x0 + 7, y1 - y0 + 8)


def h_icon(c):
    w, h = 27, 54
    fx, fy = 50, 38
    cx, sy = 0.866, 0.5
    F_t, F_b = (fx, fy), (fx, fy + h)
    R_t, R_b = (fx + w * cx, fy - w * sy), (fx + w * cx, fy + h - w * sy)
    L_t, L_b = (fx - w * cx, fy - w * sy), (fx - w * cx, fy + h - w * sy)
    B_t = (fx, fy - 2 * w * sy)
    P = lambda *pts: " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)  # noqa: E731
    if c["dark"]:
        top, left, right = "#ffffff", "#d6d6da", "#7c7c84"
    else:
        top, left, right = "#45454c", "#1f1f23", "#050505"
    # Шов: светящаяся щель посередине правой грани
    mx = fx + w * cx / 2
    s0 = fy - w * sy / 2 + 5
    s1 = fy + h - w * sy / 2 - 5
    gid = uid("glow")
    return f"""<defs><filter id="{gid}" x="-2" y="-0.5" width="5" height="2"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
<polygon points="{P(L_t, B_t, R_t, F_t)}" fill="{top}"/>
<polygon points="{P(L_t, F_t, F_b, L_b)}" fill="{left}"/>
<polygon points="{P(F_t, R_t, R_b, F_b)}" fill="{right}"/>
<line x1="{mx:.2f}" y1="{s0:.2f}" x2="{mx:.2f}" y2="{s1:.2f}" stroke="{c['acc']}" stroke-width="3" filter="url(#{gid})" opacity="0.9"/>
<line x1="{mx:.2f}" y1="{s0:.2f}" x2="{mx:.2f}" y2="{s1:.2f}" stroke="{c['acc']}" stroke-width="1.6"/>"""


def i_icon(c):
    sh = K()
    f = font("geo", 900)
    gs = f.getGlyphSet()
    fl = Flat(gs)
    k = 1000 / f["OS/2"].sCapHeight
    gs[f.getBestCmap()[ord("К")]].draw(TransformPen(fl, (k, 0, 0, -k, 0, 1000)))
    xs = [p[0] for poly in fl.polys for p in poly]
    W = int(max(xs)) + 2
    img = Image.new("L", (W, 1002), 0)
    dr = ImageDraw.Draw(img)
    for poly in fl.polys:
        dr.polygon(poly, fill=255)
    x0, x1 = min(xs), max(xs)
    rows = 11
    p = 1000 / rows
    cols = round((x1 - x0) / p)
    pw = (x1 - x0) / cols
    cells = []
    for r in range(rows):
        for q in range(cols):
            bx = (int(x0 + q * pw), int(r * p), int(x0 + (q + 1) * pw), int((r + 1) * p))
            cov = sum(img.crop(bx).get_flattened_data()) / 255 / max(1, (bx[2] - bx[0]) * (bx[3] - bx[1]))
            if cov > 0.5:
                cells.append((q, r))
    # Вписываем сетку в знак
    S = 72 / 1000
    gw = cols * pw * S
    ox, oy = 50 - gw / 2, 14
    sz = 0.74
    lime = min((cl for cl in cells if cl[1] == rows // 2), key=lambda t: t[0])
    lime = (lime[0] + 2, lime[1]) if (lime[0] + 2, lime[1]) in cells else lime
    out = []
    for q, r in cells:
        x = ox + q * pw * S + pw * S * (1 - sz) / 2
        y = oy + r * p * S + p * S * (1 - sz) / 2
        fill = c["acc"] if (q, r) == lime else c["ink"]
        out.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{pw * S * sz:.2f}" height="{p * S * sz:.2f}" fill="{fill}"/>')
    return "".join(out)


def j_icon(c):
    sh = K()
    s, tx, ty = fit(sh, 0, 0, 100, 54)
    x0, y0, x1, y1 = placed_box(sh, s, tx, ty)
    kw, kh = x1 - x0, y1 - y0
    d, gp = 8.5, 4.5
    dots = 3 * d + 2 * gp
    total = dots + 6 + kw
    ox = 50 - total / 2
    oy = 50 - kh / 2 - y0
    out = [
        f'<rect x="{ox + i * (d + gp):.2f}" y="{y1 + oy - d:.2f}" width="{d}" height="{d}" fill="{c["acc"]}"/>'
        for i in range(3)
    ]
    out.append(f'<path d="{sh["d"]}" transform="{tf(s, tx + ox + dots + 6 - x0, ty + oy)}" fill="{c["ink"]}"/>')
    return "".join(out)


def j_logo(c):
    sh = shape(WORD, 800, 40, 0.06)
    x0, y0, x1, y1 = sh["box"]
    d, gp = 9.5, 5
    dots = 3 * d + 2 * gp
    out = [f'<rect x="{i * (d + gp)}" y="{y1 - d:.2f}" width="{d}" height="{d}" fill="{c["acc"]}"/>' for i in range(3)]
    out.append(f'<path d="{sh["d"]}" transform="translate({dots + 8 - x0:.2f} 0)" fill="{c["ink"]}"/>')
    return "".join(out), (0, y0 - 2, dots + 8 + x1 - x0, y1 - y0 + 4)


def default_logo(icon):
    def logo(c):
        sh = shape(WORD, 800, 40, 0.07)
        x0, y0, x1, y1 = sh["box"]
        H = (y1 - y0) * 1.5
        top = y0 - (H - (y1 - y0)) / 2
        body = f"""<svg x="0" y="{top:.2f}" width="{H:.2f}" height="{H:.2f}" viewBox="0 0 100 100" overflow="visible">{icon(c)}</svg>
<g transform="translate({H + 12 - x0:.2f} 0)"><path d="{sh['d']}" fill="{c['ink']}"/></g>"""
        return body, (0, top, H + 12 + x1 - x0, H)
    return logo


V = [
    ("Срез", a_icon, a_logo, "Слово разрезано по линии заглавных, верх съехал вправо, в щели горит свет. Монолит со швом, но сделанный из самих букв."),
    ("Курсор", b_icon, b_logo, "Мигающий курсор после названия: агентство, которое прямо сейчас что-то пишет и собирает. На сайте курсор будет мигать."),
    ("Этажи", c_icon, c_logo, "Буквы собраны из горизонтальных этажей, один горит. Тихая цитата полосатого логотипа самой известной корпорации мира."),
    ("Марка", d_icon, default_logo(d_icon), "К в кольце, как знак зарегистрированной марки ®. Корпоративная ирония: мы и есть торговая марка."),
    ("Рост", e_icon, e_logo, "Каждая следующая буква тяжелее: от тонкой К до жирной Я. Название само показывает рост, ради которого приходят клиенты."),
    ("Тикер", f_icon, f_logo, "Мегакорпорация с собственным биржевым тикером КРП и зелёной стрелкой вверх. Смешно, дерзко, запоминается."),
    ("Оттиск", g_icon, g_logo, "Салатовая и розовая формы печати чуть разошлись, как на ризографе. Живой полиграфический знак из двух фирменных цветов."),
    ("Монолит 3D", h_icon, default_logo(h_icon), "Тот же монолит из hero, но в объёме: изометрическая плита со светящейся щелью на грани."),
    ("Множество", i_icon, default_logo(i_icon), "«Столько проектов»: К собрана из десятков одинаковых ячеек, одна горит. Целое из множества дел."),
    ("Многоточие", j_icon, j_logo, "«…целая Корпорация»: три точки перед названием договаривают строку Элджея. Точки салатовые, как продолжение фразы."),
]

DARK = {"ink": "#ffffff", "bg": "#050505", "acc": "#c4f542", "dark": True}
LIGHT = {"ink": "#050505", "bg": "#f4f4f2", "acc": "#d1006a", "dark": False}


def svg_icon(fn, c, cls="", size=None):
    s = f' width="{size}" height="{size}"' if size else ""
    return f'<svg class="{cls}" viewBox="0 0 100 100"{s} aria-hidden="true">{fn(c)}</svg>'


def svg_logo(fn, c):
    body, (x, y, w, h) = fn(c)
    return f'<svg class="logo" viewBox="{x:.2f} {y:.2f} {w:.2f} {h:.2f}" aria-hidden="true">{body}</svg>'


def favicon(fn, bg, c):
    return f"""<svg class="fav" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="{bg}"/>
<svg x="2" y="2" width="96" height="96" viewBox="0 0 100 100">{fn(c)}</svg></svg>"""


cards = []
for i, (name, icon, logo, idea) in enumerate(V, 1):
    cards.append(f"""<article class="card">
  <header><span class="num">{i:02d}</span><h2>{name}</h2></header>
  <p class="idea">{idea}</p>
  <div class="tiles"><div class="tile d">{svg_icon(icon, DARK, 'mark')}</div><div class="tile l">{svg_icon(icon, LIGHT, 'mark')}</div></div>
  <div class="row d">{svg_logo(logo, DARK)}</div>
  <div class="row l">{svg_logo(logo, LIGHT)}<span class="favs">{favicon(icon, '#050505', DARK)}{favicon(icon, '#c4f542', {**LIGHT, 'acc': '#050505', 'ink': '#050505', 'bg': '#c4f542'})}<span class="tab">{svg_icon(icon, {**DARK}, 'tabicon')}Корпорация</span></span></div>
</article>""")

html = (HERE / "board2.tpl.html").read_text().replace("{{CARDS}}", "\n".join(cards))
(HERE / "logo-board-2.html").write_text(html)
print("ok", len(cards))
