import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {View} from 'react-native';
import {router} from 'expo-router';
import {legalDocuments,legalDraftNotice,type LegalDocumentKey} from '../../../shared/legal';
import {Page,Action} from './ui';
import {useTheme} from '../lib/theme';

export function LegalPage({document}:{document:LegalDocumentKey}){
  const {styles}=useTheme();const content=legalDocuments[document];
  return <Page title={content.title}>
    <Text style={styles.muted}><UiText value={"Vistrah India Pvt Limited · vistrah.in"}/></Text>
    <Text style={styles.text}>{legalDraftNotice}</Text>
    {content.sections.map(section=><View key={section.title} style={{gap:8}}><Text accessibilityRole="header" style={styles.heading}><UiText value={section.title}/></Text><Text selectable style={styles.text}>{section.text}</Text></View>)}
    {document!=='terms'&&<UiElement as={Action} secondary label="Terms & Conditions" onPress={()=>router.replace('/terms')}/>}
    {document!=='privacy'&&<UiElement as={Action} secondary label="Privacy Policy" onPress={()=>router.replace('/privacy')}/>}
    {document!=='grievance'&&<UiElement as={Action} secondary label="Grievance Officer (24h ack / 15-day SLA)" onPress={()=>router.replace('/grievance-officer')}/>}
  </Page>;
}
