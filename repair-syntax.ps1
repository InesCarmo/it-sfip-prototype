$path = Join-Path $PSScriptRoot 'app\page.tsx'
$text = [System.IO.File]::ReadAllText($path)

$text = $text.Replace('const urgent = open.filter(item => item.days !== null && item.days >= 0 && item.days <= 30).sort((a, b) => (a.days ? 9999) - (b.days ? 9999));', 'const urgent = open.filter(item => item.days !== null && item.days >= 0 && item.days <= 30).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));')
$text = $text.Replace('const currentWorkspace = analysis?.workspace ? workspace;', 'const currentWorkspace = analysis?.workspace ?? workspace;')
$text = $text.Replace('const selected = items.find(item => item.id === recommendation) ? items[0];', 'const selected = items.find(item => item.id === recommendation) ?? null;')

$text = [regex]::Replace($text, 'const recommendations = analysis\?\.recommendations \? fallbackRecommendations\.map\(\(\{ item, score \}\) => \(\{', 'const recommendations = analysis?.recommendations ? fallbackRecommendations.map(({ item, score }) => ({')
$text = [regex]::Replace($text, '\n\s*\}\)\);\s*\n\s*const handleAnalyze', "`n      })) : [];`n`n  const handleAnalyze")

[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
