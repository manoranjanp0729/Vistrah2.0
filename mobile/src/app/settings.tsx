import {Text} from '../components/typography';
import {UiText, UiElement} from '../components/localized-ui';
import {useState} from 'react';
import {languages} from '../../../shared/i18n';
import {useLanguage} from '../lib/language';
import {Platform,Pressable,ScrollView,View,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import {useTheme, accentPresets, radii} from '../lib/theme';
import {useFontPreference} from '../lib/font-preference';
import {fontChoices,fontFace,type FontChoice} from '../lib/font-policy';
import {webFontFamily} from '../lib/web-fonts';
import fontLicenses from '../../assets/fonts/font-licenses.json';

export default function Settings() {
  const language = useLanguage();
  const {t} = language;
  const insets = useSafeAreaInsets();
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const {mode, setMode, accent, setAccent, colors, ready, error} = useTheme();
  const isDark = mode === 'dark';
  const fonts=useFontPreference();
  const [showLicenses,setShowLicenses]=useState(false);
  const previewFont=(choice:FontChoice)=>Platform.OS==='web'&&choice==='montserrat'?webFontFamily:fontFace('en',500,choice);

  return (
    <View
      style={[
        s.overlay,
        {
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          backgroundColor: isDark ? 'rgba(8, 8, 13, 0.72)' : 'rgba(7, 20, 38, 0.45)',
        },
      ]}
    >
      {/* Tap outside backdrop to close */}
      <Pressable accessible={false} onPress={close} style={StyleSheet.absoluteFill} />

      {/* Supportive Neutral Modal Card */}
      <View
        accessibilityViewIsModal
        style={[
          s.modalCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        {/* Clean, Non-Dominating Header */}
        <View
          style={[
            s.header,
            {
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={{gap: 2, flex: 1}}>
            <Text style={[s.headerEyebrow, {color: colors.brandPrimary}]}>PREFERENCES</Text>
            <Text accessibilityRole="header" style={[s.headerTitle, {color: colors.text}]}>
              {t('settings.title')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.close')}
            onPress={close}
            style={({pressed}) => [
              s.closeButton,
              {
                backgroundColor: colors.elevated,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Feather name="x" size={18} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={{flexShrink: 1}}
          contentContainerStyle={s.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* App Language Section */}
          <View
            style={[
              s.sectionCard,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Text accessibilityRole="header" style={[s.sectionHeading, {color: colors.text}]}>
              {t('settings.language')}
            </Text>
            <Text style={[s.sectionHelp, {color: colors.muted}]}>
              {t('settings.languageHelp')}
            </Text>
            <UiElement
              as={SettingsDropdown}
              label={t('settings.language')}
              value={language.locale}
              disabled={!language.ready}
              options={languages.map((item) => ({value: item.code, label: item.label}))}
              onSelect={(value) => {
                const selected = languages.find((item) => item.code === value);
                if (selected) language.setLocale(selected.code);
              }}
            />
            {Boolean(language.error) && (
              <Text accessibilityRole="alert" style={{color: colors.error, fontSize: 12}}>
                {t(language.error)}
              </Text>
            )}
          </View>

          <View style={[s.sectionCard,{backgroundColor:colors.elevated,borderColor:colors.borderSubtle}]}>
            <Text accessibilityRole="header" style={[s.sectionHeading,{color:colors.text}]}>{t('settings.font')}</Text>
            <Text style={[s.sectionHelp,{color:colors.muted}]}>{t('settings.fontHelp')}</Text>
            <SettingsDropdown label={t('settings.font')} value={fonts.font} disabled={!fonts.ready} options={fontChoices.map(font=>({value:font.id,label:font.label,fontFamily:previewFont(font.id)}))} onSelect={fonts.setFont}/>
            <Text style={[s.sectionHelp,{color:colors.text,fontSize:18,lineHeight:27}]}>{t('settings.fontPreview')}</Text>
            {language.locale!=='en'&&<Text style={[s.sectionHelp,{color:colors.muted}]}>{t('settings.fontLanguageHelp')}</Text>}
            {!!fonts.error&&<Text accessibilityRole="alert" style={{color:colors.error,fontSize:12}}>{t(fonts.error)}</Text>}
            {fonts.loadError&&<Pressable accessibilityRole="button" onPress={fonts.retry} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.accent}}>{t('common.retry')}</Text></Pressable>}
            <Pressable accessibilityRole="button" accessibilityLabel={t('settings.fontLicenses')} accessibilityState={{expanded:showLicenses}} onPress={()=>setShowLicenses(value=>!value)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.muted,fontSize:12}}>{t('settings.fontLicenses')}</Text></Pressable>
            {showLicenses&&fontLicenses.map(notice=><View key={notice.name} style={{gap:8}}><Text style={{color:colors.text,fontWeight:'700'}}>{notice.name}</Text><Text selectable style={{color:colors.muted,fontSize:11,lineHeight:16}}>{notice.license}</Text></View>)}
          </View>

          {/* App Theme & Light/Dark Mode Section */}
          <View
            style={[
              s.sectionCard,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={s.sectionHeaderRow}>
              <Text accessibilityRole="header" style={[s.sectionHeading, {color: colors.text, flex: 1}]}>
                {t('settings.themeColor')}
              </Text>
              {/* Segmented Light/Dark Switch */}
              <View
                style={[
                  s.segmentContainer,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                {(['light', 'dark'] as const).map((choice) => {
                  const selected = mode === choice;
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityLabel={t('settings.' + choice)}
                      accessibilityState={{selected, disabled: !ready}}
                      disabled={!ready}
                      hitSlop={{top: 6, bottom: 6, left: 0, right: 0}}
                      onPress={() => setMode(choice)}
                      style={({pressed}) => [
                        s.segmentButton,
                        selected && {
                          backgroundColor: colors.accent,
                          shadowColor: '#000',
                          shadowOffset: {width: 0, height: 1},
                          shadowOpacity: 0.14,
                          shadowRadius: 2,
                          elevation: 1,
                        },
                        {opacity: !ready ? 0.5 : pressed ? 0.8 : 1},
                      ]}
                    >
                      <Text
                        style={[
                          s.segmentText,
                          {
                            color: selected ? colors.ink : colors.muted,
                            fontWeight: selected ? '700' : '500',
                          },
                        ]}
                      >
                        {t('settings.' + choice)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Text style={[s.sectionHelp, {color: colors.muted}]}>
              {t('settings.themeColorHelp')}
            </Text>
            <UiElement
              as={SettingsDropdown}
              label={t('settings.themeColor')}
              value={accent}
              disabled={!ready}
              options={accentPresets.map((item) => ({
                value: item.id,
                label: t('settings.theme.' + item.id, {}, item.label),
                color: mode === 'light' ? item.light : item.dark,
              }))}
              onSelect={setAccent}
            />
          </View>

          {Boolean(error) && (
            <Text accessibilityRole="alert" style={{color: colors.error, fontSize: 12}}>
              {t(
                error === 'Could not restore your theme preference.'
                  ? 'settings.themeRestoreError'
                  : error === 'Theme changed, but could not be saved on this device.'
                  ? 'settings.themeSaveError'
                  : error
              )}
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function SettingsDropdown({
  label,
  value,
  options,
  onSelect,
  disabled,
}: {
  label: string;
  value: string;
  options: {value: string; label: string; color?: string; fontFamily?:string}[];
  onSelect: (value: string) => void;
  disabled: boolean;
}) {
  const {colors} = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={{gap: 6}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ': ' + (selected?.label ?? '')}
        accessibilityState={{expanded: open, disabled}}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
        style={({pressed}) => [
          s.dropdownTrigger,
          {
            backgroundColor: colors.surface,
            borderColor: open ? colors.accent : colors.border,
            opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
          },
        ]}
      >
        {selected?.color && (
          <View style={[s.colorDot, {backgroundColor: selected.color}]} />
        )}
        <Text style={[s.dropdownText, {color: colors.text,...(selected?.fontFamily?{fontFamily:selected.fontFamily,fontWeight:'normal' as const}:{})}]}>{selected?.label}</Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {open && !disabled && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={label}
          style={[
            s.dropdownMenu,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{checked: isSelected}}
                onPress={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                style={({pressed}) => [
                  s.dropdownItem,
                  {
                    backgroundColor: isSelected
                      ? colors.highlight
                      : pressed
                      ? colors.hover
                      : 'transparent',
                  },
                ]}
              >
                {option.color && (
                  <View style={[s.colorDot, {backgroundColor: option.color}]} />
                )}
                <Text
                  style={[
                    s.dropdownItemText,
                    {
                      color: isSelected ? colors.accent : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                      ...(option.fontFamily?{fontFamily:option.fontFamily,fontWeight:'normal' as const}:{}),
                    },
                  ]}
                >
                  <UiText value={option.label} />
                </Text>
                {isSelected && <Feather name="check" size={16} color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '100%',
    borderRadius: radii.surface,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  sectionCard: {
    padding: 14,
    borderRadius: radii.surface,
    borderWidth: 1,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHelp: {
    fontSize: 12,
    lineHeight: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: radii.input,
    borderWidth: 1,
  },
  segmentButton: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 11.5,
  },
  dropdownTrigger: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: radii.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: radii.pill,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: radii.input,
    overflow: 'hidden',
  },
  dropdownItem: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 13,
  },
});
