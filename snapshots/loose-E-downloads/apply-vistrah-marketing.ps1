$ErrorActionPreference = 'Stop'
$root = 'E:\Vistrah 2.0'
Set-Location -LiteralPath $root
if ((git branch --show-current).Trim() -ne 'reference-theme-mobile') { throw 'Expected reference-theme-mobile branch.' }
if ((git ls-files -u | Measure-Object -Line).Lines -gt 0) { throw 'Resolve or abort the active merge first.' }
$webHome = 'frontend/app/(public)/page.tsx'
$webServices = 'frontend/app/(public)/services/page.tsx'
$mobileHome = 'mobile/src/app/(tabs)/index.tsx'
$paths = @($webHome, $webServices, $mobileHome)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$source = @{}
foreach ($path in $paths) { $source[$path] = [System.IO.File]::ReadAllText((Join-Path $root $path)) }
function Replace-Once([string]$value,[string]$old,[string]$new,[string]$description) {
  if (-not $value.Contains($old)) { throw "Expected source not found: $description. No files have been changed." }
  return $value.Replace($old,$new)
}
$w = $source[$webHome]
$w = Replace-Once $w "import {SectionHeading,ButtonLink,EmptyState} from '@/components/ui';" "import {SectionHeading,ButtonLink,EmptyState,ServiceCard} from '@/components/ui';" 'web import'
$w = Replace-Once $w "  const shortcuts=[...topServices].sort((a,b)=>Number(b.service.slug==='digital-marketing')-Number(a.service.slug==='digital-marketing')).slice(0,10);" "  const shortcuts=topServices.filter(item=>item.category.slug!=='marketing').slice(0,10);" 'web shortcuts'
$webData = @'
  const marketing=categories.find(category=>category.slug==='marketing');
  const marketingServices=marketing?allServices([marketing]).filter(item=>item.service.active&&(!item.subcategory||item.subcategory.active)):[];
  const displayCategories=categories.filter(category=>category.slug!=='marketing').sort((a,b)=>categoryPriority(a.slug)-categoryPriority(b.slug));
  const marketingSection=marketing?<section className="container reference-section" aria-label="VISTRAH Ads & Marketing"><SectionHeading title="VISTRAH Ads & Marketing" href={urls.category(marketing)} label="View all"/><p>Explore advertising, creative and marketing services for your business.</p>{marketingServices.length?<div className="service-grid">{marketingServices.map(context=><ServiceCard key={context.service.id} context={context}/>)}</div>:<p>Marketing services are being prepared.</p>}</section>:null;
'@
$w = Replace-Once $w "  const displayCategories=[...categories].sort((a,b)=>categoryPriority(a.slug)-categoryPriority(b.slug));" $webData 'web marketing data'
$w = Replace-Once $w '<PublishedHomepage homepage={homepage} categories={categories}/><div className="container reference-section">' '<PublishedHomepage homepage={homepage} categories={categories}/>{marketingSection}<div className="container reference-section">' 'published web homepage'
$w = Replace-Once $w '{categories.length?<div className="reference-categories">' '{displayCategories.length?<div className="reference-categories">' 'web category empty state'
$w = Replace-Once $w '    <div className="container reference-section"><DiscoveryGuide/></div>' '    {marketingSection}<div className="container reference-section"><DiscoveryGuide/></div>' 'web section placement'
$source[$webHome] = $w
$s = $source[$webServices]
$s = Replace-Once $s 'const rows=categories.filter(category=>' 'const rows=categories.filter(category=>category.slug!=="marketing"&&(' 'web services category filter'
$s = Replace-Once $s '.toLocaleLowerCase().includes(needle));return <div' '.toLocaleLowerCase().includes(needle)));return <div' 'web services filter parentheses'
$source[$webServices] = $s
$m = $source[$mobileHome]
$mobileData = @'
  const marketing=catalogue.data?.find(category=>category.slug==='marketing');
  const marketingServices=marketing?allServices([marketing]).filter(item=>item.service.active&&(!item.subcategory||item.subcategory.active)):[];
  const categories=catalogue.data?catalogue.data.filter(category=>category.slug!=='marketing').sort((a,b)=>priority(a.slug)-priority(b.slug)):[];
  const marketingSection=marketing?<View style={{gap:12}}><Heading title="VISTRAH Ads & Marketing" action="View all" onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:'marketing'}})}/><Text style={styles.muted}>Explore advertising, creative and marketing services for your business.</Text>{marketingServices.length?marketingServices.map(item=><Pressable key={item.service.id} accessibilityRole="button" onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} style={({pressed})=>[styles.card,{opacity:pressed?.75:1}]}><Text style={styles.label}>{item.subcategory?.title??'VISTRAH Ads & Marketing'}</Text><Text style={styles.heading}>{item.service.title}</Text><Text style={styles.muted}>{item.service.description}</Text><Text style={{color:colors.accent}}>Explore service →</Text></Pressable>):<Text style={styles.muted}>Marketing services are being prepared.</Text>}</View>:null;
'@
$m = Replace-Once $m "  const categories=catalogue.data?[...catalogue.data].sort((a,b)=>priority(a.slug)-priority(b.slug)):[];" $mobileData 'mobile marketing data'
$m = Replace-Once $m "const shortcuts=allServices(catalogue.data??[]).filter(item=>item.service.active)" "const shortcuts=allServices(catalogue.data??[]).filter(item=>item.service.active&&item.category.slug!=='marketing')" 'mobile shortcuts'
$m = Replace-Once $m '<PublishedHomepage homepage={homepage.data} categories={catalogue.data}/><DiscoveryGuide/>' '<PublishedHomepage homepage={homepage.data} categories={catalogue.data}/>{marketingSection}<DiscoveryGuide/>' 'published mobile homepage'
$m = Replace-Once $m '    <DiscoveryGuide/>' '    {marketingSection}<DiscoveryGuide/>' 'mobile section placement'
$source[$mobileHome] = $m
# All assertions completed. Back up only the three files that will be edited.
$backup = Join-Path $env:TEMP ('vistrah-marketing-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup | Out-Null
foreach ($path in $paths) {
  $dest = Join-Path $backup $path
  New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $root $path) -Destination $dest
}
foreach ($path in $paths) { [System.IO.File]::WriteAllText((Join-Path $root $path),$source[$path],$utf8) }
Write-Host "Updated 3 files. Backups: $backup"
git diff --check
git diff --stat -- $paths
Write-Host 'No commit, merge, deployment or container restart performed.'
