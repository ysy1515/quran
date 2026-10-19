import sys, glob, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    im = Image.open(f).convert("RGBA")
    # Trim to visible pixels (ignore near-transparent shadow fringe), then centre with 8% padding.
    alpha = im.getchannel("A").point(lambda a: 255 if a > 8 else 0)
    box = alpha.getbbox()
    im = im.crop(box)
    side = int(max(im.size) / 0.84)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    out = canvas.resize((512, 512), Image.LANCZOS)
    name = os.path.splitext(os.path.basename(f))[0]
    path = os.path.join(dst, name + ".webp")
    out.save(path, "WEBP", quality=85, method=6)
    print(name, os.path.getsize(path) // 1024, "KB")
