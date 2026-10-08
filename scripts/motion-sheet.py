"""Собирает раскадровку из кадров motion.mjs с подписями t / p / видимость текста."""
import json
import sys

from PIL import Image, ImageDraw

out, cols, thumb_w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
data = json.load(open(f"{out}/frames.json"))
frames = data["frames"]
first = Image.open(frames[0]["file"])
thumb_h = round(first.height * thumb_w / first.width)
rows = (len(frames) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + 22)), "#222")
draw = ImageDraw.Draw(sheet)
for i, f in enumerate(frames):
    x, y = (i % cols) * thumb_w, (i // cols) * (thumb_h + 22)
    sheet.paste(Image.open(f["file"]).resize((thumb_w, thumb_h)), (x, y + 22))
    text = f"{f['t']}s p{f['p'] * 100:.0f}% T{f['title']:.1f} I{f['inside']:.1f} F{f['flash']:.1f}"
    draw.text((x + 4, y + 5), text, fill="#c4f542")
sheet.save(f"{out}/sheet.png")
print(f"{out}/sheet.png", sheet.size)
