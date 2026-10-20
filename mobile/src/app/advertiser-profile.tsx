import React from 'react';
import {ScrollView, View, Text, Pressable, StyleSheet} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {useTheme} from '../lib/theme';
import {useResource} from '../lib/resource';
import type {AdvertiserProfile as Profile} from '../../../shared/v-ads';
import {Loading,ErrorPanel} from '../components/ui';

export default function AdvertiserProfile() {
  const {colors} = useTheme();
  const {id}=useLocalSearchParams<{id?:string}>();
  const profile=useResource<Profile>(typeof id==='string'?'/v-ads/advertisers/'+encodeURIComponent(id):null);

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={s.container}
    >
      <Pressable style={s.back} onPress={() => router.back()}>
        <Feather name="arrow-left" size={22} color={colors.text}/>
        <Text style={{color: colors.text}}>Back to V Ads</Text>
      </Pressable>

      {profile.loading?<Loading/>:profile.error?<ErrorPanel error={profile.error} retry={profile.retry}/>:!profile.data?<Text style={{color:colors.muted}}>Advertiser not found.</Text>:<><View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>V</Text>
        </View>
        <Text style={[s.name, {color: colors.text}]}>
          {profile.data.name}
        </Text>
        <Text style={[s.subtitle, {color: colors.muted}]}>
          @{profile.data.handle}
        </Text>
        <Text style={[s.description, {color: colors.text}]}>
          {profile.data.description}
        </Text>
      </View>

      <Text style={[s.section, {color: colors.text}]}>
        Videos
      </Text>

      {profile.data.videos.map(video => (
        <Pressable
          key={video.id}
          style={[s.videoCard, {backgroundColor: colors.surface, borderColor: colors.border}]}
          onPress={() => router.navigate({pathname:'/v-ads',params:{video:video.id}})}
        >
          <Feather name="play-circle" size={27} color={colors.accent}/>
          <Text style={{color: colors.text, flex: 1}}>{video.title}</Text>
          <Feather name="chevron-right" size={20} color={colors.muted}/>
        </Pressable>
      ))}

      {!profile.data.videos.length&&<Text style={[s.note,{color:colors.muted}]}>No approved videos yet.</Text>}</>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {padding: 20, paddingBottom: 40, gap: 20},
  back: {flexDirection: 'row', alignItems: 'center', gap: 10},
  header: {alignItems: 'center', gap: 12, marginVertical: 16},
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#F9AA45',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {fontSize: 44, fontWeight: '800', color: '#11243F'},
  name: {fontSize: 22, fontWeight: '700'},
  subtitle: {fontSize: 13},
  description: {fontSize: 14, lineHeight: 22, textAlign: 'center'},
  section: {fontSize: 18, fontWeight: '700'},
  videoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 18, borderWidth: 1, borderRadius: 16,
  },
  note: {fontSize: 12, lineHeight: 19},
});
