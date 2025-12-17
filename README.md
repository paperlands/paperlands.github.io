# paperlands.github.io
Code but multiplayer

# image guidelines
1. 16:9 Aspect Ratio (Widescreen):
Common pixel sizes:
- 1920x1080 pixels (Full HD)
- 1280x720 pixels (HD)
- 1600x900 pixels
- 960x540 pixels
Usage: Hero images, banners, videos.

2. 4:3 Aspect Ratio (Standard):
Common pixel sizes:
- 1024x768 pixels
- 800x600 pixels
- 1600x1200 pixels
Usage: Blog post thumbnails, product images, presentations.

3. 1:1 Aspect Ratio (Square):
Common pixel sizes:
- 1000x1000 pixels
- 800x800 pixels
- 500x500 pixels
Usage: Profile images, product galleries, team photos.

4. 3:2 Aspect Ratio:
Common pixel sizes:
- 1500x1000 pixels
- 1200x800 pixels
- 900x600 pixels
Usage: Photography, product images.

# asset conversion ffmpeg cli

PNG to WEBP:
`ffmpeg -i epicycloid_egg.png -c:v libwebp -q:v 75 epicycloid_egg.webp`

MP4 to WEBM:
`ffmpeg -i hero_video.mp4 -c:v libvpx-vp9 -crf 28 -b:v 0 -pix_fmt yuv420p -row-mt 1 -c:a libopus -b:a 96k hero_video.webm`

To export with alpha on Davinci Resolve, choose Format="Quicktime" -> Codec="GoPro Cineform" -> Type="RGB 16-bit"
Then convert from MOV to WEBP:
```
ffmpeg -y -i sutd_calc.mov \
  -an \
  -vf "fps=30,scale=1280:-1:flags=lanczos,format=rgba" \
  -loop 0 \
  -c:v libwebp_anim \
  -q:v 80 \
  -compression_level 6 \
  -preset picture \
  sutd_calc.webp
```

For more aggressive compression:
```
ffmpeg -y -i sutd_calc.mov \
  -an \
  -vf "fps=15,scale=960:-1:flags=lanczos,format=rgba" \
  -loop 0 \
  -c:v libwebp_anim \
  -q:v 60 \
  -compression_level 6 \
  -preset drawing \
  sutd_calc.webp
```