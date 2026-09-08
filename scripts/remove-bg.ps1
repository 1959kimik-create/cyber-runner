# 스프라이트 PNG 배경(흰색/격자) 제거
Add-Type -AssemblyName System.Drawing

function Test-Background($c) {
  if ($c.A -lt 8) { return $true }
  if ($c.R -ge 252 -and $c.G -ge 252 -and $c.B -ge 252) { return $true }
  $avg = ($c.R + $c.G + $c.B) / 3
  $spread = [Math]::Max($c.R, [Math]::Max($c.G, $c.B)) - [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
  if ($spread -lt 6 -and $avg -ge 180 -and $avg -le 250) { return $true }
  return $false
}

function Remove-SpriteBackground {
  param([string]$Path)
  $bmp = [System.Drawing.Bitmap]::FromFile($Path)
  $w = $bmp.Width; $h = $bmp.Height
  $out = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $queue = New-Object System.Collections.Queue
  $seen = @{}

  for ($x = 0; $x -lt $w; $x++) {
    foreach ($y in @(0, $h - 1)) {
      $key = "$x,$y"
      if (-not $seen.ContainsKey($key)) {
        $c = $bmp.GetPixel($x, $y)
        if (Test-Background $c) { $queue.Enqueue($key); $seen[$key] = $true }
      }
    }
  }
  for ($y = 0; $y -lt $h; $y++) {
    foreach ($x in @(0, $w - 1)) {
      $key = "$x,$y"
      if (-not $seen.ContainsKey($key)) {
        $c = $bmp.GetPixel($x, $y)
        if (Test-Background $c) { $queue.Enqueue($key); $seen[$key] = $true }
      }
    }
  }

  while ($queue.Count -gt 0) {
    $parts = ($queue.Dequeue() -split ',')
    $x = [int]$parts[0]; $y = [int]$parts[1]
    $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    foreach ($n in @(@($x+1,$y), @($x-1,$y), @($x,$y+1), @($x,$y-1))) {
      $nx = $n[0]; $ny = $n[1]
      if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h) { continue }
      $key = "$nx,$ny"
      if ($seen.ContainsKey($key)) { continue }
      $c = $bmp.GetPixel($nx, $ny)
      if (-not (Test-Background $c)) { continue }
      $seen[$key] = $true
      $queue.Enqueue($key)
    }
  }

  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $key = "$x,$y"
      if (-not $seen.ContainsKey($key)) {
        $c = $bmp.GetPixel($x, $y)
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, $c.R, $c.G, $c.B))
      }
    }
  }

  $bmp.Dispose()
  $out.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
}

$root = Join-Path (Split-Path $PSScriptRoot -Parent) "assets\sprites"
Get-ChildItem -LiteralPath $root -Recurse -Filter "*.png" | ForEach-Object {
  Remove-SpriteBackground $_.FullName
  Write-Output "processed $($_.FullName)"
}
