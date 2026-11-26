$ErrorActionPreference = 'Stop'
$root = 'E:\Vistrah 2.0'
if (!(Test-Path -LiteralPath $root)) { throw "VISTRAH 2.0 folder not found." }
Set-Location -LiteralPath $root
$branch = (git branch --show-current).Trim()
if ($branch -ne 'reference-theme-mobile') { throw "Expected reference-theme-mobile; found $branch. No changes made." }
$web = 'frontend/components/discovery-guide.tsx'
$mobile = 'mobile/src/components/discovery-guide.tsx'
$backup = Join-Path $env:TEMP ('vistrah-guide-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Replace-Once([string]$text, [string]$old, [string]$new, [string]$label) {
  $at = $text.IndexOf($old, [StringComparison]::Ordinal)
  if ($at -lt 0) { throw "Expected code not found: $label. No source files have been written." }
  if ($text.IndexOf($old, $at + $old.Length, [StringComparison]::Ordinal) -ge 0) { throw "Ambiguous code: $label" }
  return $text.Substring(0,$at) + $new + $text.Substring($at+$old.Length)
}
$w = [IO.File]::ReadAllText((Join-Path $root $web))
$m = [IO.File]::ReadAllText((Join-Path $root $mobile))
# Web: native accessible details controls; collapsed initially.
$w = Replace-Once $w '  return <section className={styles.guide} aria-labelledby="discovery-guide-title">' '  return <section className={styles.guide} aria-label="Explore VISTRAH guidance">' 'web section'
$w = Replace-Once $w '    <header><h2 id="discovery-guide-title">{content.title}</h2><p>{content.intro}</p></header>' '    <details><summary style={{cursor:"pointer",fontSize:"1.35rem",fontWeight:700,padding:"12px 0"}}>{content.title}</summary><div><p>{content.intro}</p>' 'web journey heading'
$w = Replace-Once $w '    <h3>{content.shortcutsTitle}</h3><div className={styles.shortcuts}>' '    </div></details><details><summary style={{cursor:"pointer",fontSize:"1.35rem",fontWeight:700,padding:"12px 0"}}>{content.shortcutsTitle}</summary><div className={styles.shortcuts}>' 'web shortcuts heading'
$w = Replace-Once $w '    <div className={styles.faq}><h3>{content.faqTitle}</h3>' '    </details><details><summary style={{cursor:"pointer",fontSize:"1.35rem",fontWeight:700,padding:"12px 0"}}>{content.faqTitle}</summary><div className={styles.faq}>' 'web FAQ heading'




$w = Replace-Once $w '  </section>;' '    </details></section>;' 'web closing details'
# Mobile: 3 independently collapsible groups, default closed.


$m = Replace-Once $m '  const [openQuestion,setOpenQuestion]=useState<string|null>(null);' @'
  const [openQuestion,setOpenQuestion]=useState<string|null>(null);
  const [expanded,setExpanded]=useState({journey:false,shortcuts:false,faq:false});
  function toggle(key:'journey'|'shortcuts'|'faq'){setExpanded(current=>({...current,[key]:!current[key]}));}
'@.TrimEnd() 'mobile collapse state'
$m = Replace-Once $m '    <View style={{gap:6}}><Text accessibilityRole="header" style={styles.heading}>{content.title}</Text><Text style={styles.muted}>{content.intro}</Text></View>' @'
    <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded.journey}} onPress={()=>toggle('journey')} style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={[styles.heading,{flex:1}]}>{content.title}</Text><Feather name={expanded.journey?'chevron-up':'chevron-down'} size={22} color={colors.text}/></Pressable>
    {expanded.journey&&<><Text style={styles.muted}>{content.intro}</Text>
'@.TrimEnd() 'mobile journey heading'
$m = Replace-Once $m '    <Text accessibilityRole="header" style={styles.heading}>{content.shortcutsTitle}</Text>' @'
    </>}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded.shortcuts}} onPress={()=>toggle('shortcuts')} style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={[styles.heading,{flex:1}]}>{content.shortcutsTitle}</Text><Feather name={expanded.shortcuts?'chevron-up':'chevron-down'} size={22} color={colors.text}/></Pressable>
    {expanded.shortcuts&&<>
'@.TrimEnd() 'mobile shortcuts heading'
$m = Replace-Once $m '    <Text accessibilityRole="header" style={styles.heading}>{content.faqTitle}</Text>' @'
    </>}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded.faq}} onPress={()=>toggle('faq')} style={{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={[styles.heading,{flex:1}]}>{content.faqTitle}</Text><Feather name={expanded.faq?'chevron-up':'chevron-down'} size={22} color={colors.text}/></Pressable>
    {expanded.faq&&<>
'@.TrimEnd() 'mobile FAQ heading'

$closing = $m.LastIndexOf("  </View>;", [StringComparison]::Ordinal)
if ($closing -lt 0) { throw "Mobile component closing tag not found. No files written." }
$m = $m.Insert($closing, "    </>}`n")
# Validate both edits before writing either file.
if ($w -notmatch '<details>' -or $m -notmatch 'expanded\.faq') { throw 'Validation failed; no changes made.' }
Copy-Item -LiteralPath (Join-Path $root $web) -Destination (Join-Path $backup 'web-discovery-guide.tsx')
Copy-Item -LiteralPath (Join-Path $root $mobile) -Destination (Join-Path $backup 'mobile-discovery-guide.tsx')
[IO.File]::WriteAllText((Join-Path $root $web),$w,$utf8)
[IO.File]::WriteAllText((Join-Path $root $mobile),$m,$utf8)
Write-Host "Updated 2 discovery guide files. Backups: $backup"
git diff --check
git diff --stat -- $web $mobile
Write-Host 'No commit, push, deployment, or restart performed.'
