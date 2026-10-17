# Feature art renderer

Renders the 3D feature icons in `src/assets/feature-art/` from procedural
three.js models (no image generation, no text or lettering of any kind). Every
icon shares one scene: the same camera, key/rim/fill lights, studio reflection
environment, contact shadow and three materials (brushed gold, deep-green
enamel, ivory), and each model is scaled to the same bounding box.

    cd artifacts/quran/tools/feature-art
    npm i --no-save three@0.170.0 playwright@1.56.1
    node render.mjs            # all icons -> out/<name>.png (1024 px masters)
    node render.mjs evening    # one icon
    python3 export.py out ../../src/assets/feature-art   # trim, 8% padding, 512 px WebP q85

Models live in `MODELS` in `index.html`. These are code-built renders made to the
asset spec in `src/assets/feature-art/README.md`; a designer's set can replace any
file by dropping a WebP with the same name.
