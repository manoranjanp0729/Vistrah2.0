import {UiText} from "../components/localized-ui";
﻿import React from 'react';
import {ScrollView, View, Text, Pressable, StyleSheet} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {useTheme} from '../lib/theme';
import {useResource} from '../lib/resource';
import type {AdvertiserProfile as Profile} from '../../../shared/v-ads';
import {listingPrice} from '../../../shared/commerce';
import {Loading,ErrorPanel} from '../components/ui';

export default function AdvertiserProfile() {
  const {colors, mode} = useTheme();
  const {id}=useLocalSearchParams<{id?:string}>();
  const profile=useResource<Profile>(typeof id==='string'?'/v-ads/advertisers/'+encodeURIComponent(id):null);

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.background}}
      contentContainerStyle={s.container}
    >
      <Pressable style={s.back} onPress={() => router.back()}>
        <Feather name="arrow-left" size={22} color={colors.text}/>
        <Text style={{color: colors.text}}><UiText value={"Back to V Ads"}/></Text>
      </Pressable>

      {profile.loading?<Loading/>:profile.error?<ErrorPanel error={profile.error} retry={profile.retry}/>:!profile.data?<Text style={{color:colors.muted}}><UiText value={"Advertiser not found."}/></Text>:<><View style={s.header}>
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
        <UiText value={"Products Available"}/></Text>

      {profile.data.products && profile.data.products.length > 0 ? (
        profile.data.products.map(product => (
          <Pressable
            key={product.id}
            style={[s.productCard, {backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.88)', borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.60)'}]}
            onPress={() => router.push({pathname: '/commerce/[id]', params: {id: product.id}})}
          >
            <View style={{flex: 1, gap: 6}}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                <Text numberOfLines={1} style={{fontSize: 15, fontWeight: '700', color: colors.text, flex: 1}}>
                  {product.title}
                </Text>
                <Text style={{fontSize: 15, fontWeight: '800', color: '#e11d48'}}>
                  {listingPrice(product.unit_price_paise)}
                </Text>
              </View>
              {Boolean(product.description) && (
                <Text numberOfLines={2} style={{fontSize: 12.5, color: colors.muted, lineHeight: 17}}>
                  {product.description}
                </Text>
              )}
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2}}>
                <Feather name="truck" size={12} color="#16a34a" />
                <Text style={{fontSize: 11.5, color: '#16a34a', fontWeight: '600'}}>
                  {product.delivery_fee_paise != null
                    ? (product.delivery_fee_paise === 0 ? 'Free Delivery' : `Delivery: ${listingPrice(product.delivery_fee_paise)}`)
                    : 'Standard fulfillment options'}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))
      ) : (
        <View style={[s.emptyCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Feather name="shopping-bag" size={24} color={colors.muted} />
          <Text style={{fontSize: 13, color: colors.text, fontWeight: '600', textAlign: 'center'}}>
            <UiText value="Brand Catalog & Direct Offerings" />
          </Text>
          <Text style={{fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18}}>
            <UiText value="Browse this brand's video demonstrations below or enquire directly to explore all available products and services." />
          </Text>
        </View>
      )}

      <Text style={[s.section, {color: colors.text}]}>
        <UiText value={"Videos "}/></Text>

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

      {!profile.data.videos.length&&<Text style={[s.note,{color:colors.muted}]}><UiText value={"No approved videos yet."}/></Text>}</>}
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
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderWidth: 1, borderRadius: 16,
  },
  emptyCard: {
    padding: 24, borderWidth: 1, borderRadius: 16,
    alignItems: 'center', gap: 8,
  },
  note: {fontSize: 12, lineHeight: 19},
});
