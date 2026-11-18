# Draws the placeholder home-screen icons into assets/icons (180, 192 and 512 pixels).
# Run again after changing the drawing. Replace with your own icon art later.
Add-Type -AssemblyName System.Drawing
$out = Join-Path $PSScriptRoot '..\assets\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function Draw-Icon([int]$size, [string]$file) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 100.0
  function P([double]$x, [double]$y) { New-Object System.Drawing.PointF ([float]($x * $s)), ([float]($y * $s)) }

  # Sky and hill (full square: phones round the corners themselves)
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush (P 0 0), (P 0 100), ([System.Drawing.Color]::FromArgb(126, 200, 240)), ([System.Drawing.Color]::FromArgb(200, 235, 250))
  $g.FillRectangle($sky, 0, 0, $size, $size)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(92, 160, 64))), [float](-30 * $s), [float](62 * $s), [float](160 * $s), [float](80 * $s))

  # Tree
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(122, 74, 36))), [float](22 * $s), [float](55 * $s), [float](6 * $s), [float](14 * $s))
  $g.FillPolygon((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(63, 143, 58))), [System.Drawing.PointF[]]@((P 25 22), (P 13 58), (P 37 58)))

  # House
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(222, 184, 135))), [float](45 * $s), [float](48 * $s), [float](36 * $s), [float](26 * $s))
  $g.FillPolygon((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(178, 54, 42))), [System.Drawing.PointF[]]@((P 63 26), (P 40 50), (P 86 50)))
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(110, 66, 30))), [float](59 * $s), [float](60 * $s), [float](9 * $s), [float](14 * $s))

  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw-Icon 180 'icon-180.png'
Draw-Icon 192 'icon-192.png'
Draw-Icon 512 'icon-512.png'
Write-Host "Icons written to $out"
