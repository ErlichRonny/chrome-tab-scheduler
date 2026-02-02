#!/bin/bash
# Create simple placeholder icons using ImageMagick or Python PIL

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    # Use ImageMagick
    convert -size 16x16 xc:none -fill "#1a73e8" -draw "circle 8,8 8,2" icon16.png
    convert -size 48x48 xc:none -fill "#1a73e8" -draw "circle 24,24 24,6" icon48.png
    convert -size 128x128 xc:none -fill "#1a73e8" -draw "circle 64,64 64,16" icon128.png
    echo "Icons created with ImageMagick"
else
    # Use Python PIL as fallback
    python3 << 'PYTHON'
from PIL import Image, ImageDraw

def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a clock-like circle
    margin = size // 8
    draw.ellipse([margin, margin, size-margin, size-margin], 
                 fill='#1a73e8', outline='#1557b0', width=max(1, size//32))
    
    # Draw clock hands
    center = size // 2
    hand_length = size // 3
    draw.line([center, center, center, center - hand_length], 
              fill='white', width=max(1, size//16))
    draw.line([center, center, center + hand_length//2, center], 
              fill='white', width=max(1, size//16))
    
    img.save(filename)
    print(f"Created {filename}")

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
PYTHON
fi
