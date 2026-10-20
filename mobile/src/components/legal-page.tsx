import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {legalDocuments,legalDraftNotice,type LegalDocumentKey} from '../../../shared/legal';
import {Page,Heading,Action} from './ui';
import {useTheme} from '../lib/theme';

export function LegalPage({document}:{document:LegalDocumentKey}){
  const {styles}=useTheme();const content=legalDocuments[document];
  return <Page><Heading title={content.title}/><Text style={styles.text}>{legalDraftNotice}</Text><Text style={styles.muted}>English draft for customer and seller review.</Text>
    {content.sections.map(section=><View key={section.title} style={{gap:8}}><Text accessibilityRole="header" style={styles.heading}>{section.title}</Text><Text selectable style={styles.text}>{section.text}</Text></View>)}
    <Action secondary label={document==='terms'?'Read Privacy Policy':'Read Terms & Conditions'} onPress={()=>router.replace(document==='terms'?'/privacy':'/terms')}/>
  </Page>;
}
