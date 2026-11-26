$ErrorActionPreference='Stop'
$root='E:\Vistrah 2.0'
Set-Location -LiteralPath $root
if ((git branch --show-current).Trim() -ne 'reference-theme-mobile') { throw 'Expected reference-theme-mobile branch' }
if ((git ls-files -u | Measure-Object -Line).Lines -gt 0) { throw 'Unresolved merge exists' }
$web='frontend/app/(public)/page.tsx'
$mobile='mobile/src/app/(tabs)/index.tsx'
$utf8=New-Object System.Text.UTF8Encoding($false)
$w=[IO.File]::ReadAllText((Join-Path $root $web))
$m=[IO.File]::ReadAllText((Join-Path $root $mobile))
function ReplaceExact([string]$s,[string]$a,[string]$b,[string]$label){
 if(-not $s.Contains($a)){throw "Expected source not found: $label. Nothing changed."}
 return $s.Replace($a,$b)
}
$w=ReplaceExact $w "  const topServices=[...services].filter(item=>item.service.active)" "  const topServices=[...services].filter(item=>item.service.active&&item.category.slug!=='marketing')" 'web hero deduplication'
$oldWeb=@'
  const marketingSection=marketing?<section className="container reference-section" aria-label="VISTRAH Ads & Marketing"><SectionHeading title="VISTRAH Ads & Marketing" href={urls.category(marketing)} label="View all"/><p>Explore advertising, creative and marketing services for your business.</p>{marketingServices.length?<div className="service-grid">{marketingServices.map(context=><ServiceCard key={context.service.id} context={context}/>)}</div>:<p>Marketing services are being prepared.</p>}</section>:null;
'@
$newWeb=@'
  const marketingSection=marketing?<section className="container reference-section vistrah-marketing" aria-label="VISTRAH Ads & Marketing"><Link href={urls.category(marketing)} className="vistrah-marketing-banner"><span className="vistrah-marketing-icon"><Megaphone size={24} aria-hidden="true"/></span><span className="vistrah-marketing-banner-copy"><strong>VISTRAH Ads &amp; Marketing</strong><small>Make your business stand out with creative and advertising services</small></span><span className="vistrah-marketing-banner-cta">View all →</span></Link>{marketingServices.length?<HorizontalCarousel label="VISTRAH Ads & Marketing services">{marketingServices.map(context=><ServiceCard key={context.service.id} context={context}/>)}</HorizontalCarousel>:<p>Marketing services are being prepared.</p>}</section>:null;
'@
$w=ReplaceExact $w $oldWeb $newWeb 'web marketing section'
$oldMobile=@'
  const marketingSection=marketing?<View style={{gap:12}}><Heading title="VISTRAH Ads & Marketing" action="View all" onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:'marketing'}})}/><Text style={styles.muted}>Explore advertising, creative and marketing services for your business.</Text>{marketingServices.length?marketingServices.map(item=><Pressable key={item.service.id} accessibilityRole="button" onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} style={({pressed})=>[styles.card,{opacity:pressed?.75:1}]}><Text style={styles.label}>{item.subcategory?.title??'VISTRAH Ads & Marketing'}</Text><Text style={styles.heading}>{item.service.title}</Text><Text style={styles.muted}>{item.service.description}</Text><Text style={{color:colors.accent}}>Explore service →</Text></Pressable>):<Text style={styles.muted}>Marketing services are being prepared.</Text>}</View>:null;
'@
$newMobile=@'
  const marketingSection=marketing?<View style={{gap:12}}><Pressable accessibilityRole="button" accessibilityLabel="View all VISTRAH Ads and Marketing services" onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:'marketing'}})} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:14,backgroundColor:'#FFF0E5',borderLeftWidth:5,borderLeftColor:'#F97316',opacity:pressed?.8:1})}><Feather name="volume-2" size={24} color="#B94B09"/><View style={{flex:1}}><Text style={{fontSize:17,fontWeight:'700',color:'#72350F'}}>VISTRAH Ads & Marketing</Text><Text style={{fontSize:12,color:'#72350F'}}>Creative and advertising services for your business</Text></View><Feather name="arrow-right" size={20} color="#B94B09"/></Pressable>{marketingServices.length?<ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="VISTRAH Ads and Marketing services; scroll horizontally" contentContainerStyle={{gap:12,paddingVertical:4}}>{marketingServices.map(item=><Pressable key={item.service.id} accessibilityRole="button" accessibilityLabel={item.service.title} onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} style={({pressed})=>[styles.card,{width:220,padding:12,opacity:pressed?.75:1}]}><Image source={require('../../../assets/marketing.webp')} resizeMode="cover" accessibilityLabel="Marketing service" style={{width:'100%',height:105,borderRadius:12}}/><Text numberOfLines={2} style={styles.heading}>{item.service.title}</Text><Text numberOfLines={2} style={styles.muted}>{item.service.description}</Text><Text style={{color:colors.accent}}>Explore service →</Text></Pressable>)}</ScrollView>:<Text style={styles.muted}>Marketing services are being prepared.</Text>}</View>:null;
'@
$m=ReplaceExact $m $oldMobile $newMobile 'mobile marketing section'
$cssPath='frontend/app/globals.css'
if(-not (Test-Path -LiteralPath $cssPath)){throw 'Cannot find frontend/app/globals.css; no files changed.'}
$css=[IO.File]::ReadAllText((Join-Path $root $cssPath))
if($css.Contains('/* VISTRAH Ads & Marketing compact carousel */')){throw 'Marketing CSS already exists; no files changed.'}
$extra=@'

/* VISTRAH Ads & Marketing compact carousel */
.vistrah-marketing{display:grid;gap:14px}
.vistrah-marketing-banner{display:flex;align-items:center;gap:14px;min-height:78px;padding:14px 20px;border-radius:16px;background:linear-gradient(105deg,#fff0e5,#fff8f1 75%,#fff);border:1px solid #ffd5b7;border-left:6px solid #f97316;text-decoration:none;color:#72350f}
.vistrah-marketing-icon{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:12px;background:#ffe0c5;color:#b94b09}
.vistrah-marketing-banner-copy{display:grid;gap:4px;flex:1;min-width:0}
.vistrah-marketing-banner-copy strong{font-size:clamp(1rem,2vw,1.35rem);line-height:1.25}
.vistrah-marketing-banner-copy small{font-size:.85rem;line-height:1.4}
.vistrah-marketing-banner-cta{white-space:nowrap;font-weight:700}
.vistrah-marketing .carousel-track{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 12px}
.vistrah-marketing .carousel-track>.help-card-shell{flex:0 0 clamp(210px,24vw,265px);min-width:0;scroll-snap-align:start}
.vistrah-marketing .service-card{height:100%}
@media(max-width:600px){.vistrah-marketing-banner{padding:12px;gap:10px}.vistrah-marketing-banner-cta{font-size:.75rem}.vistrah-marketing-banner-copy small{font-size:.75rem}.vistrah-marketing .carousel-track>.help-card-shell{flex-basis:220px}}
'@
$backup=Join-Path $env:TEMP ('vistrah-marketing-carousel-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
foreach($p in @($web,$mobile,$cssPath)){$target=Join-Path $backup $p;New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null;Copy-Item -LiteralPath (Join-Path $root $p) -Destination $target}
[IO.File]::WriteAllText((Join-Path $root $web),$w,$utf8)
[IO.File]::WriteAllText((Join-Path $root $mobile),$m,$utf8)
[IO.File]::WriteAllText((Join-Path $root $cssPath),$css+$extra,$utf8)
Write-Host "Updated homepage carousel design. Backups: $backup"
git diff --check
git diff --stat -- $web $mobile $cssPath
Write-Host 'No commit, merge, deploy or restart performed.'
