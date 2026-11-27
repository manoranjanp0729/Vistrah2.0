import {Pressable, View} from 'react-native';
import {router} from 'expo-router';
import {Text} from '../components/typography';
import {Page, Loading} from '../components/ui';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
import {AdminEmployeesTab} from '../components/admin-employees-tab';

export default function EmployeesScreen() {
  const {user, ready} = useSession();
  const {mode} = useTheme();
  const isDark = mode === 'dark';

  if (!ready) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <Page>
        <View
          style={{
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#e2e8f0',
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            gap: 8,
          }}
        >
          <Text style={{color: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: '500'}}>
            VISTRAH EDITORIAL ADMIN
          </Text>
          <Text style={{color: isDark ? '#f8fafc' : '#0f172a', fontSize: 20, fontWeight: '600'}}>
            Administrator access required
          </Text>
          <Text style={{color: isDark ? '#94a3b8' : '#475569', fontSize: 13}}>
            Sign in with an authorized Vistrah India Pvt Limited administrator account to manage
            internal employees and HR letters.
          </Text>
          {!user && (
            <Pressable
              onPress={() => router.push('/auth?next=%2Femployees')}
              style={{
                marginTop: 8,
                paddingVertical: 11,
                borderRadius: 8,
                backgroundColor: '#173f35',
                alignItems: 'center',
              }}
            >
              <Text style={{color: '#fff', fontSize: 13, fontWeight: '500'}}>Sign in →</Text>
            </Pressable>
          )}
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <View style={{gap: 4, marginBottom: 4}}>
        <Text style={{color: isDark ? '#94a3b8' : '#475569', fontSize: 11, fontWeight: '500', letterSpacing: 1.1}}>
          Vistrah India Pvt Limited · INTERNAL HR
        </Text>
        <Text style={{color: isDark ? '#f8fafc' : '#0f172a', fontSize: 22, fontWeight: '600'}}>
          Employees &amp; HR Letter Generator
        </Text>
      </View>
      <AdminEmployeesTab />
    </Page>
  );
}
