import {useLanguage} from '../lib/language';
import {Text} from 'react-native';
import {Page,Heading} from '../components/ui';
import {ExternalJobsList} from '../components/external-jobs-list';
import {useTheme} from '../lib/theme';
export default function Jobs(){const {copy}=useLanguage();const {styles}=useTheme();return <Page><Heading title={copy.jobs.title}/><Text style={styles.muted}>{copy.jobs.intro}</Text><ExternalJobsList/></Page>;}
