import {Text} from '../components/typography';
import {UiText} from "../components/localized-ui";
import {useLanguage} from '../lib/language';

import {Page} from '../components/ui';
import {ExternalJobsList} from '../components/external-jobs-list';
import {useTheme} from '../lib/theme';
export default function Jobs(){const {copy}=useLanguage();const {styles}=useTheme();return <Page title={copy.jobs.title}><Text style={styles.muted}><UiText value={copy.jobs.intro}/></Text><ExternalJobsList/></Page>;}
