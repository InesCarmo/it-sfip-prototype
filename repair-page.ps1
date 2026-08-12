$path = 'C:\Users\Inês\Documents\Codex\2026-06-11\files-mentioned-by-the-user-it\it-sfip-prototype\app\page.tsx'
$text = [System.IO.File]::ReadAllText($path)

$replacements = @(
  @{ Old = 'estratÃ©gica'; New = 'estratégica' },
  @{ Old = 'InÃªs'; New = 'Inês' },
  @{ Old = 'âœ¦'; New = '✦' },
  @{ Old = 'â†’'; New = '→' },
  @{ Old = 'â‰¤'; New = '≤' },
  @{ Old = 'relevÃ¢ncia'; New = 'relevância' },
  @{ Old = 'CanÃ³nico'; New = 'Canónico' },
  @{ Old = 'evidÃªncia'; New = 'evidência' },
  @{ Old = 'PRÃ“XIMOS'; New = 'PRÓXIMOS' },
  @{ Old = 'MISSÃƒO'; New = 'MISSÃO' },
  @{ Old = 'recomendaÃ§Ã£o'; New = 'recomendação' },
  @{ Old = 'opÃ§Ã£o'; New = 'opção' },
  @{ Old = 'RECOMENDAÃ‡ÃƒO'; New = 'RECOMENDAÇÃO' },
  @{ Old = 'Ã '; New = 'à' },
  @{ Old = 'comparaÃ§Ã£o'; New = 'comparação' },
  @{ Old = 'ConsÃ³rcio'; New = 'Consórcio' },
  @{ Old = 'DecisÃ£o'; New = 'Decisão' },
  @{ Old = 'validaÃ§Ãµes'; New = 'validações' },
  @{ Old = 'Validado âœ“'; New = 'Validado ✓' },
  @{ Old = 'MISSÃƒO 03 · DIVULGAÃ‡ÃƒO ESTRATÃ‰GICA'; New = 'MISSÃO 03 · DIVULGAÇÃO ESTRATÉGICA' },
  @{ Old = 'ConteÃºdo'; New = 'Conteúdo' },
  @{ Old = 'PublicaÃ§Ã£o'; New = 'Publicação' },
  @{ Old = 'AUDIÃŠNCIA'; New = 'AUDIÊNCIA' },
  @{ Old = 'construÃ­da'; New = 'construída' },
  @{ Old = 'destinatÃ¡rios'; New = 'destinatários' },
  @{ Old = 'critÃ©rios'; New = 'critérios' },
  @{ Old = 'PRÃ‰-VISUALIZAÃ‡ÃƒO'; New = 'PRÉ-VISUALIZAÇÃO' },
  @{ Old = 'SeleÃ§Ã£o'; New = 'Seleção' },
  @{ Old = 'atÃ©'; New = 'até' },
  @{ Old = 'ManifestaÃ§Ã£o'; New = 'Manifestação' },
  @{ Old = 'identificaÃ§Ã£o'; New = 'identificação' },
  @{ Old = 'Regenerar conteÃºdo'; New = 'Regenerar conteúdo' },
  @{ Old = 'PublicaÃ§Ã£o registada'; New = 'Publicação registada' },
  @{ Old = 'ComunicaÃ§Ã£o'; New = 'Comunicação' },
  @{ Old = 'ConcluÃ­das'; New = 'Concluídas' },
  @{ Old = 'InteligÃªncia'; New = 'Inteligência' },
  @{ Old = 'relaÃ§Ãµes'; New = 'relações' },
  @{ Old = 'disponÃ­veis'; New = 'disponíveis' },
  @{ Old = 'Analisar no Workspace â†’'; New = 'Analisar no Workspace →' },
  @{ Old = 'Ã¡rea'; New = 'área' },
  @{ Old = 'conteÃºdo'; New = 'conteúdo' },
  @{ Old = 'VALIDAÃ‡ÃƒO'; New = 'VALIDAÇÃO' },
  @{ Old = 'ÃREA'; New = 'ÁREA' },
  @{ Old = 'MISSÃƒO 02'; New = 'MISSÃO 02' },
  @{ Old = 'MISSÃƒO 04'; New = 'MISSÃO 04' },
  @{ Old = 'MISSÃƒO 05'; New = 'MISSÃO 05' },
  @{ Old = 'RECOMENDAÃ‡ÃƒO IT-SFIP'; New = 'RECOMENDAÇÃO IT-SFIP' },
  @{ Old = 'ExploraÃ§Ã£o'; New = 'Exploração' }
)

foreach ($pair in $replacements) {
  $text = $text.Replace($pair.Old, $pair.New)
}

$text = $text.Replace('const urgent = open.filter(item => item.days !== null && item.days >= 0 && item.days <= 30).sort((a, b) => (a.days ? 9999) - (b.days ? 9999));', 'const urgent = open.filter(item => item.days !== null && item.days >= 0 && item.days <= 30).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));')
$text = $text.Replace('const currentWorkspace = analysis?.workspace ? workspace;', 'const currentWorkspace = analysis?.workspace ?? workspace;')
$text = $text.Replace('const selected = items.find(item => item.id === recommendation) ? items[0];', 'const selected = items.find(item => item.id === recommendation) ?? null;')
$text = $text.Replace('const recommendations = analysis?.recommendations ? fallbackRecommendations.map(({ item, score }) => ({', 'const recommendations = analysis?.recommendations ? fallbackRecommendations.map(({ item, score }) => ({')
$text = $text.Replace('  }));', '  })) : [];')
$text = $text.Replace('AÇÕES DA TBLCALLS', 'AÇÕES DA PLATAFORMA')
$text = $text.Replace('Campo Ação Recomendada da tblCalls.', 'Campo Ação Recomendada da plataforma.')

[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
